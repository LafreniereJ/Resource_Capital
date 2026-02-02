#!/usr/bin/env python3
"""
Data Coverage Report for Resource Capital Pipeline
Shows which companies have complete vs missing data.

Usage:
    python data_coverage_report.py           # Full report
    python data_coverage_report.py --missing # Only show companies with missing data
    python data_coverage_report.py --csv     # Export to CSV
"""

import sqlite3
import os
import sys
import argparse
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent / "../database/mining.db"


def get_connection():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def get_coverage_report():
    """Generate comprehensive data coverage report."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Check which tables exist
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    existing_tables = {row[0] for row in cursor.fetchall()}
    
    has_mine_production = 'mine_production' in existing_tables
    has_reserves = 'reserves_resources' in existing_tables
    has_economics = 'project_economics' in existing_tables
    has_financials = 'financials' in existing_tables
    has_price_history = 'price_history' in existing_tables
    has_filings = 'filings' in existing_tables
    
    # Main query: Get all companies with data completeness metrics
    query = """
        SELECT 
            c.id,
            c.ticker,
            c.name,
            c.exchange,
            c.commodity,
            c.current_price,
            c.market_cap,
            c.last_updated,
            
            -- Projects
            (SELECT COUNT(*) FROM projects WHERE company_id = c.id) as project_count
    """
    
    if has_mine_production:
        query += """,
            (SELECT COUNT(DISTINCT mp.id) 
             FROM mine_production mp 
             JOIN projects p ON mp.project_id = p.id 
             WHERE p.company_id = c.id) as production_records,
            
            (SELECT MAX(mp.period_end) 
             FROM mine_production mp 
             JOIN projects p ON mp.project_id = p.id 
             WHERE p.company_id = c.id) as latest_production
        """
    else:
        query += ", 0 as production_records, NULL as latest_production"
    
    if has_reserves:
        query += """,
            (SELECT COUNT(*) 
             FROM reserves_resources rr 
             JOIN projects p ON rr.project_id = p.id 
             WHERE p.company_id = c.id) as reserve_records
        """
    else:
        query += ", 0 as reserve_records"
    
    if has_economics:
        query += """,
            (SELECT COUNT(*) 
             FROM project_economics pe 
             WHERE pe.company_id = c.id) as economics_records
        """
    else:
        query += ", 0 as economics_records"
    
    if has_financials:
        query += ", (SELECT COUNT(*) FROM financials WHERE company_id = c.id) as financial_records"
    else:
        query += ", 0 as financial_records"
    
    if has_price_history:
        query += ", (SELECT COUNT(*) FROM price_history WHERE company_id = c.id) as price_history_days"
    else:
        query += ", 0 as price_history_days"
    
    if has_filings:
        query += ", (SELECT COUNT(*) FROM filings WHERE company_id = c.id) as filing_count"
    else:
        query += ", 0 as filing_count"
    
    query += """
        FROM companies c
        ORDER BY c.market_cap DESC NULLS LAST
    """
    
    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()
    
    # Process into report format
    report = []
    for row in rows:
        # Calculate completeness score (0-100)
        score = 0
        max_score = 7
        
        if row['current_price']: score += 1
        if row['project_count'] > 0: score += 1
        if row['production_records'] > 0: score += 1
        if row['reserve_records'] > 0: score += 1
        if row['economics_records'] > 0: score += 1
        if row['financial_records'] > 0: score += 1
        if row['price_history_days'] > 100: score += 1
        
        completeness = round((score / max_score) * 100)
        
        # Determine what's missing
        missing = []
        if not row['current_price']: missing.append("Price")
        if row['project_count'] == 0: missing.append("Projects")
        if row['production_records'] == 0: missing.append("Production")
        if row['reserve_records'] == 0: missing.append("Reserves")
        if row['economics_records'] == 0: missing.append("Economics")
        if row['financial_records'] == 0: missing.append("Financials")
        if row['price_history_days'] < 100: missing.append("PriceHistory")
        
        report.append({
            'ticker': row['ticker'],
            'name': row['name'][:30],  # Truncate for display
            'exchange': row['exchange'],
            'market_cap_m': round(row['market_cap'] / 1e6, 1) if row['market_cap'] else 0,
            'projects': row['project_count'],
            'production': row['production_records'],
            'reserves': row['reserve_records'],
            'economics': row['economics_records'],
            'financials': row['financial_records'],
            'completeness': completeness,
            'missing': missing,
            'latest_production': row['latest_production']
        })
    
    return report


def print_report(report, only_missing=False):
    """Print formatted report to console."""
    print("\n" + "="*100)
    print("DATA COVERAGE REPORT")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("="*100)
    
    # Filter if needed
    if only_missing:
        report = [r for r in report if r['completeness'] < 100]
    
    # Summary stats
    total = len(report)
    complete = sum(1 for r in report if r['completeness'] == 100)
    partial = sum(1 for r in report if 50 <= r['completeness'] < 100)
    minimal = sum(1 for r in report if r['completeness'] < 50)
    
    print(f"\nSUMMARY: {total} companies total")
    print(f"  ✅ Complete (100%):  {complete}")
    print(f"  🟡 Partial (50-99%): {partial}")
    print(f"  🔴 Minimal (<50%):   {minimal}")
    
    # Header
    print("\n" + "-"*100)
    print(f"{'Ticker':<8} {'Name':<30} {'MktCap(M)':<10} {'Proj':<5} {'Prod':<5} {'Res':<5} {'Econ':<5} {'Fin':<5} {'Score':<6} {'Missing'}")
    print("-"*100)
    
    # Data rows
    for r in report:
        score_emoji = "✅" if r['completeness'] == 100 else "🟡" if r['completeness'] >= 50 else "🔴"
        missing_str = ", ".join(r['missing'][:3]) if r['missing'] else "-"
        
        print(f"{r['ticker']:<8} {r['name']:<30} {r['market_cap_m']:<10.1f} {r['projects']:<5} {r['production']:<5} {r['reserves']:<5} {r['economics']:<5} {r['financials']:<5} {score_emoji}{r['completeness']:<4}% {missing_str}")
    
    print("-"*100)
    
    # Top priorities (large market cap with missing data)
    print("\n📌 TOP PRIORITIES (Large market cap, missing data):")
    priorities = sorted([r for r in report if r['completeness'] < 100], 
                       key=lambda x: x['market_cap_m'], reverse=True)[:10]
    for r in priorities:
        print(f"  {r['ticker']}: Missing {', '.join(r['missing'])}")


def export_csv(report, filename="data_coverage.csv"):
    """Export report to CSV."""
    import csv
    
    with open(filename, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Ticker', 'Name', 'Exchange', 'MarketCap_M', 'Projects', 
                        'Production', 'Reserves', 'Economics', 'Financials', 
                        'Completeness', 'Missing', 'LatestProduction'])
        
        for r in report:
            writer.writerow([
                r['ticker'], r['name'], '', r['market_cap_m'],
                r['projects'], r['production'], r['reserves'], r['economics'],
                r['financials'], r['completeness'], "|".join(r['missing']),
                r['latest_production']
            ])
    
    print(f"\n✅ Exported to {filename}")


def get_quick_summary():
    """Get quick stats for dashboard."""
    conn = get_connection()
    cursor = conn.cursor()
    
    stats = {}
    
    # Companies with production data
    cursor.execute("""
        SELECT COUNT(DISTINCT p.company_id) 
        FROM projects p 
        JOIN mine_production mp ON mp.project_id = p.id
    """)
    stats['companies_with_production'] = cursor.fetchone()[0]
    
    # Companies with reserves
    cursor.execute("""
        SELECT COUNT(DISTINCT p.company_id) 
        FROM projects p 
        JOIN reserves_resources rr ON rr.project_id = p.id
    """)
    stats['companies_with_reserves'] = cursor.fetchone()[0]
    
    # Total companies
    cursor.execute("SELECT COUNT(*) FROM companies")
    stats['total_companies'] = cursor.fetchone()[0]
    
    # Companies with price data
    cursor.execute("SELECT COUNT(*) FROM companies WHERE current_price IS NOT NULL")
    stats['companies_with_prices'] = cursor.fetchone()[0]
    
    conn.close()
    return stats


def main():
    parser = argparse.ArgumentParser(description="Data Coverage Report")
    parser.add_argument("--missing", action="store_true", help="Show only companies with missing data")
    parser.add_argument("--csv", action="store_true", help="Export to CSV")
    parser.add_argument("--summary", action="store_true", help="Quick summary only")
    
    args = parser.parse_args()
    
    if args.summary:
        stats = get_quick_summary()
        print("\n📊 QUICK SUMMARY")
        print(f"  Total Companies: {stats['total_companies']}")
        print(f"  With Prices: {stats['companies_with_prices']}")
        print(f"  With Production Data: {stats['companies_with_production']}")
        print(f"  With Reserves Data: {stats['companies_with_reserves']}")
        return
    
    report = get_coverage_report()
    
    if args.csv:
        export_csv(report)
    else:
        print_report(report, only_missing=args.missing)


if __name__ == "__main__":
    main()
