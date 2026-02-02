"""
TSX/TSXV Mining Companies Import Script
Imports official mining company list from TMX Group Excel export.
"""

import logging
import os
import sqlite3
import sys
from datetime import datetime

import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'database', 'mining.db')


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def load_tsx_companies(excel_path: str) -> pd.DataFrame:
    """Load TSX mining companies from TMX Excel export."""
    xl = pd.ExcelFile(excel_path)

    # Read TSX sheet (header at row 9)
    tsx_df = pd.read_excel(xl, sheet_name='TSX MM Issuers November 2025', header=9)
    tsx_df.columns = [str(c).replace('\n', ' ').strip() for c in tsx_df.columns]
    tsx_df['exchange'] = 'TSX'

    logging.info(f"Loaded {len(tsx_df)} TSX companies")
    return tsx_df


def load_tsxv_companies(excel_path: str) -> pd.DataFrame:
    """Load TSXV mining companies from TMX Excel export."""
    xl = pd.ExcelFile(excel_path)

    # Read TSXV sheet (header at row 9)
    tsxv_df = pd.read_excel(xl, sheet_name='TSXV MM Issuers November 2025', header=9)
    tsxv_df.columns = [str(c).replace('\n', ' ').strip() for c in tsxv_df.columns]
    tsxv_df['exchange'] = 'TSXV'

    logging.info(f"Loaded {len(tsxv_df)} TSXV companies")
    return tsxv_df


def normalize_company_data(df: pd.DataFrame) -> list:
    """
    Normalize DataFrame to list of company dicts matching our schema.
    """
    companies = []

    for _, row in df.iterrows():
        ticker = str(row.get('Root Ticker', '')).strip()
        name = str(row.get('Name', '')).strip()

        if not ticker or not name or ticker == 'nan' or name == 'nan':
            continue

        # Parse market cap (already in CAD from TMX)
        market_cap = row.get('Market Cap (C$) 30-November-2025')
        if pd.notna(market_cap):
            try:
                market_cap = float(market_cap)
            except (ValueError, TypeError):
                market_cap = None
        else:
            market_cap = None

        # Parse HQ location
        hq_location = row.get('HQ Location', '')
        hq_region = row.get('HQ Region', '')

        # Determine primary commodity from commodity columns
        commodity = None
        commodity_columns = ['Gold', 'Silver', 'Copper', 'Nickel', 'Diamond', 'Molybdenum',
                           'Platinum/PGM', 'Iron', 'Lead', 'Zinc', 'Rare Earths',
                           'Potash', 'Lithium', 'Uranium', 'Coal', 'Tungsten',
                           'Base & Precious Metals', 'Oil and Gas']

        for comm_col in commodity_columns:
            if comm_col in row.index and pd.notna(row.get(comm_col)) and row.get(comm_col) == 'Y':
                commodity = comm_col
                break

        companies.append({
            'name': name,
            'ticker': ticker,
            'exchange': row['exchange'],
            'market_cap': market_cap,
            'currency': 'CAD',
            'commodity': commodity,
            'hq_location': str(hq_location) if pd.notna(hq_location) else None,
            'hq_region': str(hq_region) if pd.notna(hq_region) else None,
        })

    return companies


def remove_non_tsx_companies():
    """Remove companies that are not TSX or TSXV."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Find non-TSX/TSXV companies
    cursor.execute("SELECT id, ticker, exchange FROM companies WHERE exchange NOT IN ('TSX', 'TSXV')")
    non_tsx = cursor.fetchall()

    if non_tsx:
        logging.info(f"Removing {len(non_tsx)} non-TSX/TSXV companies...")
        for company in non_tsx:
            logging.info(f"  Removing: {company['ticker']} ({company['exchange']})")

            # Delete related data first (foreign key constraints)
            cursor.execute("DELETE FROM price_history WHERE company_id = ?", (company['id'],))
            cursor.execute("DELETE FROM financials WHERE company_id = ?", (company['id'],))
            cursor.execute("DELETE FROM filings WHERE company_id = ?", (company['id'],))

            # Delete projects and their metrics
            cursor.execute("SELECT id FROM projects WHERE company_id = ?", (company['id'],))
            project_ids = [p['id'] for p in cursor.fetchall()]
            for pid in project_ids:
                cursor.execute("DELETE FROM extracted_metrics WHERE project_id = ?", (pid,))
            cursor.execute("DELETE FROM projects WHERE company_id = ?", (company['id'],))

            # Finally delete company
            cursor.execute("DELETE FROM companies WHERE id = ?", (company['id'],))

        conn.commit()
        logging.info(f"Removed {len(non_tsx)} non-TSX/TSXV companies")
    else:
        logging.info("No non-TSX/TSXV companies to remove")

    conn.close()


def import_companies(companies: list, update_existing: bool = True):
    """
    Import companies into database.
    - Updates existing companies if update_existing=True
    - Inserts new companies
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    inserted = 0
    updated = 0
    skipped = 0

    for company in companies:
        ticker = company['ticker']

        # Check if exists
        cursor.execute("SELECT id FROM companies WHERE ticker = ?", (ticker,))
        existing = cursor.fetchone()

        if existing:
            if update_existing:
                # Update existing company
                cursor.execute("""
                    UPDATE companies SET
                        name = ?,
                        exchange = ?,
                        market_cap = COALESCE(?, market_cap),
                        currency = ?,
                        commodity = COALESCE(?, commodity),
                        last_updated = ?
                    WHERE ticker = ?
                """, (
                    company['name'],
                    company['exchange'],
                    company['market_cap'],
                    company['currency'],
                    company['commodity'],
                    datetime.now().isoformat(),
                    ticker
                ))
                updated += 1
            else:
                skipped += 1
        else:
            # Insert new company
            cursor.execute("""
                INSERT INTO companies (name, ticker, exchange, market_cap, currency, commodity, last_updated)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                company['name'],
                ticker,
                company['exchange'],
                company['market_cap'],
                company['currency'],
                company['commodity'],
                datetime.now().isoformat()
            ))
            inserted += 1

    conn.commit()
    conn.close()

    logging.info(f"Import complete: {inserted} inserted, {updated} updated, {skipped} skipped")
    return {'inserted': inserted, 'updated': updated, 'skipped': skipped}


def remove_unlisted_companies(official_tickers: set):
    """Remove companies from DB that are not in the official TMX list."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get all tickers in database
    cursor.execute("SELECT id, ticker, name, exchange FROM companies")
    db_companies = cursor.fetchall()

    removed = 0
    for company in db_companies:
        if company['ticker'] not in official_tickers:
            logging.info(f"  Removing unlisted: {company['ticker']} ({company['exchange']}) - {company['name']}")

            # Delete related data first (foreign key constraints)
            cursor.execute("DELETE FROM price_history WHERE company_id = ?", (company['id'],))
            cursor.execute("DELETE FROM financials WHERE company_id = ?", (company['id'],))
            cursor.execute("DELETE FROM filings WHERE company_id = ?", (company['id'],))

            # Delete projects and their metrics
            cursor.execute("SELECT id FROM projects WHERE company_id = ?", (company['id'],))
            project_ids = [p['id'] for p in cursor.fetchall()]
            for pid in project_ids:
                cursor.execute("DELETE FROM extracted_metrics WHERE project_id = ?", (pid,))
            cursor.execute("DELETE FROM projects WHERE company_id = ?", (company['id'],))

            # Finally delete company
            cursor.execute("DELETE FROM companies WHERE id = ?", (company['id'],))
            removed += 1

    conn.commit()
    conn.close()

    if removed:
        logging.info(f"Removed {removed} unlisted companies")
    return removed


def get_database_stats():
    """Get current database statistics."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as cnt FROM companies")
    total = cursor.fetchone()['cnt']

    cursor.execute("SELECT exchange, COUNT(*) as cnt FROM companies GROUP BY exchange")
    by_exchange = {row['exchange']: row['cnt'] for row in cursor.fetchall()}

    cursor.execute("SELECT commodity, COUNT(*) as cnt FROM companies WHERE commodity IS NOT NULL GROUP BY commodity ORDER BY cnt DESC")
    by_commodity = {row['commodity']: row['cnt'] for row in cursor.fetchall()}

    conn.close()

    return {
        'total': total,
        'by_exchange': by_exchange,
        'by_commodity': by_commodity
    }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Import TSX/TSXV Mining Companies")
    parser.add_argument("--file", type=str, required=True, help="Path to TMX Excel export file")
    parser.add_argument("--tsx-only", action="store_true", help="Import only TSX (not TSXV)")
    parser.add_argument("--tsxv-only", action="store_true", help="Import only TSXV (not TSX)")
    parser.add_argument("--no-update", action="store_true", help="Don't update existing companies")
    parser.add_argument("--remove-non-tsx", action="store_true", help="Remove non-TSX/TSXV companies first")
    parser.add_argument("--sync", action="store_true", help="Sync DB with official list (remove unlisted companies)")
    parser.add_argument("--stats", action="store_true", help="Show database stats and exit")

    args = parser.parse_args()

    if args.stats:
        stats = get_database_stats()
        print("\nDatabase Statistics:")
        print(f"  Total companies: {stats['total']}")
        print(f"\n  By Exchange:")
        for ex, cnt in stats['by_exchange'].items():
            print(f"    {ex}: {cnt}")
        print(f"\n  By Commodity:")
        for comm, cnt in list(stats['by_commodity'].items())[:10]:
            print(f"    {comm}: {cnt}")
        sys.exit(0)

    if not os.path.exists(args.file):
        print(f"Error: File not found: {args.file}")
        sys.exit(1)

    # Remove non-TSX/TSXV if requested
    if args.remove_non_tsx:
        remove_non_tsx_companies()

    # Load companies from Excel
    all_companies = []

    if not args.tsxv_only:
        tsx_df = load_tsx_companies(args.file)
        tsx_companies = normalize_company_data(tsx_df)
        all_companies.extend(tsx_companies)
        logging.info(f"Normalized {len(tsx_companies)} TSX companies")

    if not args.tsx_only:
        tsxv_df = load_tsxv_companies(args.file)
        tsxv_companies = normalize_company_data(tsxv_df)
        all_companies.extend(tsxv_companies)
        logging.info(f"Normalized {len(tsxv_companies)} TSXV companies")

    logging.info(f"\nTotal companies to import: {len(all_companies)}")

    # Get set of official tickers for sync
    official_tickers = {c['ticker'] for c in all_companies}

    # Sync - remove companies not in official list
    if args.sync:
        logging.info("Syncing database with official TMX list...")
        remove_unlisted_companies(official_tickers)

    # Import to database
    results = import_companies(all_companies, update_existing=not args.no_update)

    # Show final stats
    stats = get_database_stats()
    print("\n" + "=" * 50)
    print("Final Database Statistics:")
    print(f"  Total companies: {stats['total']}")
    print(f"\n  By Exchange:")
    for ex, cnt in stats['by_exchange'].items():
        print(f"    {ex}: {cnt}")
