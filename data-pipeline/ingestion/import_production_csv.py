"""
Import Production Data from CSV
Loads quarterly/annual production data from CSV files into the database.
"""

import csv
import logging
import os
import sqlite3
import sys
from typing import Dict

# Add processing dir to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'processing'))
from db_manager import get_company

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'database', 'mining.db')


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_or_create_project(cursor, company_id: int, mine_name: str, commodity: str = None) -> int:
    """Get existing project or create new one."""
    # Check if project exists
    cursor.execute(
        "SELECT id FROM projects WHERE company_id = ? AND name = ?",
        (company_id, mine_name)
    )
    existing = cursor.fetchone()

    if existing:
        return existing['id']

    # Create new project
    cursor.execute("""
        INSERT INTO projects (company_id, name, commodity, stage)
        VALUES (?, ?, ?, 'Production')
    """, (company_id, mine_name, commodity))
    project_id = cursor.lastrowid

    logging.info(f"Created project: {mine_name} (ID: {project_id})")
    return project_id


def import_production_csv(csv_path: str) -> Dict:
    """
    Import production data from CSV file.

    Expected columns:
    - ticker: Company stock ticker
    - mine_name: Name of the mine/project
    - period: Period type (Q1 2025, Q2 2025, Annual 2024, etc.)
    - period_end: End date of period (YYYY-MM-DD)
    - ore_mined_tonnes, ore_processed_tonnes, head_grade, head_grade_unit
    - recovery_pct, gold_oz, silver_oz, copper_lbs, zinc_lbs
    - gold_eq_oz, aisc_usd, cash_cost_usd
    - source_url, notes
    """
    if not os.path.exists(csv_path):
        return {"error": f"File not found: {csv_path}"}

    conn = get_db_connection()
    cursor = conn.cursor()

    results = {
        "rows_processed": 0,
        "rows_imported": 0,
        "rows_skipped": 0,
        "errors": []
    }

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row in reader:
            results["rows_processed"] += 1

            try:
                ticker = row.get('ticker', '').strip().upper()
                mine_name = row.get('mine_name', '').strip()
                period_end = row.get('period_end', '').strip()

                # Skip empty rows
                if not ticker or not mine_name:
                    results["rows_skipped"] += 1
                    continue

                # Get company
                company = get_company(ticker)
                if not company:
                    results["errors"].append(f"Company not found: {ticker}")
                    results["rows_skipped"] += 1
                    continue

                # Get or create project
                project_id = get_or_create_project(
                    cursor,
                    company['id'],
                    mine_name,
                    company.get('commodity')
                )

                # Determine period type
                period = row.get('period', '').lower()
                if 'q1' in period or 'q2' in period or 'q3' in period or 'q4' in period:
                    period_type = 'quarterly'
                else:
                    period_type = 'annual'

                # Parse numeric fields
                def parse_float(val):
                    if not val or val.strip() == '':
                        return None
                    try:
                        # Remove commas and parse
                        return float(val.replace(',', ''))
                    except (ValueError, TypeError):
                        return None

                # Build data dict
                data = {
                    'project_id': project_id,
                    'period_type': period_type,
                    'period_end': period_end,
                    'ore_mined_tonnes': parse_float(row.get('ore_mined_tonnes')),
                    'ore_processed_tonnes': parse_float(row.get('ore_processed_tonnes')),
                    'head_grade': parse_float(row.get('head_grade')),
                    'head_grade_unit': row.get('head_grade_unit', '').strip() or None,
                    'recovery_rate': parse_float(row.get('recovery_pct')),
                    'gold_produced_oz': parse_float(row.get('gold_oz')),
                    'silver_produced_oz': parse_float(row.get('silver_oz')),
                    'copper_produced_lbs': parse_float(row.get('copper_lbs')),
                    'zinc_produced_lbs': parse_float(row.get('zinc_lbs')),
                    'gold_equivalent_oz': parse_float(row.get('gold_eq_oz')),
                    'aisc_per_oz': parse_float(row.get('aisc_usd')),
                    'cash_cost_per_oz': parse_float(row.get('cash_cost_usd')),
                    'source_url': row.get('source_url', '').strip() or None,
                }

                # Check if any production data exists
                has_data = any([
                    data['ore_mined_tonnes'],
                    data['ore_processed_tonnes'],
                    data['gold_produced_oz'],
                    data['silver_produced_oz'],
                    data['copper_produced_lbs'],
                ])

                if not has_data and not period_end:
                    # Skip rows with no data
                    results["rows_skipped"] += 1
                    continue

                # Upsert into mine_production
                cursor.execute("""
                    INSERT INTO mine_production (
                        project_id, period_type, period_end,
                        ore_mined_tonnes, ore_processed_tonnes,
                        head_grade, head_grade_unit, recovery_rate,
                        gold_produced_oz, silver_produced_oz,
                        copper_produced_lbs, zinc_produced_lbs,
                        gold_equivalent_oz, aisc_per_oz, cash_cost_per_oz,
                        source_url
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(project_id, period_type, period_end) DO UPDATE SET
                        ore_mined_tonnes = COALESCE(excluded.ore_mined_tonnes, mine_production.ore_mined_tonnes),
                        ore_processed_tonnes = COALESCE(excluded.ore_processed_tonnes, mine_production.ore_processed_tonnes),
                        head_grade = COALESCE(excluded.head_grade, mine_production.head_grade),
                        head_grade_unit = COALESCE(excluded.head_grade_unit, mine_production.head_grade_unit),
                        recovery_rate = COALESCE(excluded.recovery_rate, mine_production.recovery_rate),
                        gold_produced_oz = COALESCE(excluded.gold_produced_oz, mine_production.gold_produced_oz),
                        silver_produced_oz = COALESCE(excluded.silver_produced_oz, mine_production.silver_produced_oz),
                        copper_produced_lbs = COALESCE(excluded.copper_produced_lbs, mine_production.copper_produced_lbs),
                        zinc_produced_lbs = COALESCE(excluded.zinc_produced_lbs, mine_production.zinc_produced_lbs),
                        gold_equivalent_oz = COALESCE(excluded.gold_equivalent_oz, mine_production.gold_equivalent_oz),
                        aisc_per_oz = COALESCE(excluded.aisc_per_oz, mine_production.aisc_per_oz),
                        cash_cost_per_oz = COALESCE(excluded.cash_cost_per_oz, mine_production.cash_cost_per_oz),
                        source_url = COALESCE(excluded.source_url, mine_production.source_url)
                """, (
                    data['project_id'], data['period_type'], data['period_end'],
                    data['ore_mined_tonnes'], data['ore_processed_tonnes'],
                    data['head_grade'], data['head_grade_unit'], data['recovery_rate'],
                    data['gold_produced_oz'], data['silver_produced_oz'],
                    data['copper_produced_lbs'], data['zinc_produced_lbs'],
                    data['gold_equivalent_oz'], data['aisc_per_oz'], data['cash_cost_per_oz'],
                    data['source_url']
                ))

                results["rows_imported"] += 1

            except Exception as e:
                results["errors"].append(f"Row {results['rows_processed']}: {str(e)}")
                results["rows_skipped"] += 1

    conn.commit()
    conn.close()

    logging.info(f"Import complete: {results['rows_imported']} imported, {results['rows_skipped']} skipped")
    return results


def import_reserves_csv(csv_path: str) -> Dict:
    """
    Import reserves/resources data from CSV file.

    Expected columns:
    - ticker, mine_name, report_date, category, deposit_zone
    - tonnes_mt, grade, grade_unit, contained_oz, contained_unit
    - cutoff_grade, cutoff_unit, price_assumption
    - technical_report_title, qualified_person, source_url
    """
    if not os.path.exists(csv_path):
        return {"error": f"File not found: {csv_path}"}

    conn = get_db_connection()
    cursor = conn.cursor()

    results = {
        "rows_processed": 0,
        "rows_imported": 0,
        "rows_skipped": 0,
        "errors": []
    }

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row in reader:
            results["rows_processed"] += 1

            try:
                ticker = row.get('ticker', '').strip().upper()
                mine_name = row.get('mine_name', '').strip()
                report_date = row.get('report_date', '').strip()
                category = row.get('category', '').strip()

                if not ticker or not mine_name or not category:
                    results["rows_skipped"] += 1
                    continue

                company = get_company(ticker)
                if not company:
                    results["errors"].append(f"Company not found: {ticker}")
                    results["rows_skipped"] += 1
                    continue

                project_id = get_or_create_project(
                    cursor,
                    company['id'],
                    mine_name,
                    company.get('commodity')
                )

                def parse_float(val):
                    if not val or val.strip() == '':
                        return None
                    try:
                        return float(val.replace(',', ''))
                    except (ValueError, TypeError):
                        return None

                # Determine if reserve or resource
                category_lower = category.lower()
                is_reserve = category_lower in ['proven', 'probable', 'proven+probable', 'p&p']

                deposit_zone = row.get('deposit_zone', '').strip() or 'Main'

                cursor.execute("""
                    INSERT INTO reserves_resources (
                        project_id, report_date, category, is_reserve, deposit_name,
                        tonnes, grade, grade_unit,
                        contained_metal, contained_metal_unit,
                        cutoff_grade, cutoff_grade_unit,
                        metal_price_assumption, technical_report_title, qualified_person
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(project_id, report_date, category, deposit_name) DO UPDATE SET
                        tonnes = COALESCE(excluded.tonnes, reserves_resources.tonnes),
                        grade = COALESCE(excluded.grade, reserves_resources.grade),
                        contained_metal = COALESCE(excluded.contained_metal, reserves_resources.contained_metal),
                        technical_report_title = COALESCE(excluded.technical_report_title, reserves_resources.technical_report_title)
                """, (
                    project_id,
                    report_date,
                    category,
                    is_reserve,
                    deposit_zone,
                    parse_float(row.get('tonnes_mt')),
                    parse_float(row.get('grade')),
                    row.get('grade_unit', '').strip() or None,
                    parse_float(row.get('contained_oz')),
                    row.get('contained_unit', '').strip() or None,
                    parse_float(row.get('cutoff_grade')),
                    row.get('cutoff_unit', '').strip() or None,
                    parse_float(row.get('price_assumption')),
                    row.get('technical_report_title', '').strip() or None,
                    row.get('qualified_person', '').strip() or None,
                ))

                results["rows_imported"] += 1

            except Exception as e:
                results["errors"].append(f"Row {results['rows_processed']}: {str(e)}")
                results["rows_skipped"] += 1

    conn.commit()
    conn.close()

    logging.info(f"Import complete: {results['rows_imported']} imported, {results['rows_skipped']} skipped")
    return results


def get_production_stats() -> Dict:
    """Get statistics on production data in database."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as cnt FROM projects")
    projects = cursor.fetchone()['cnt']

    cursor.execute("SELECT COUNT(*) as cnt FROM mine_production")
    production = cursor.fetchone()['cnt']

    cursor.execute("SELECT COUNT(*) as cnt FROM reserves_resources")
    reserves = cursor.fetchone()['cnt']

    # Get companies with production data
    cursor.execute("""
        SELECT c.ticker, c.name, COUNT(mp.id) as production_records
        FROM companies c
        JOIN projects p ON c.id = p.company_id
        JOIN mine_production mp ON p.id = mp.project_id
        GROUP BY c.id
        ORDER BY production_records DESC
        LIMIT 10
    """)
    top_companies = [dict(row) for row in cursor.fetchall()]

    conn.close()

    return {
        "projects": projects,
        "production_records": production,
        "reserve_records": reserves,
        "top_companies": top_companies
    }


# =============================================================================
# CLI
# =============================================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Import Production/Reserve Data from CSV")
    parser.add_argument("--production", type=str, help="Path to production CSV file")
    parser.add_argument("--reserves", type=str, help="Path to reserves CSV file")
    parser.add_argument("--stats", action="store_true", help="Show production data statistics")

    args = parser.parse_args()

    if args.stats:
        stats = get_production_stats()
        print("\nProduction Data Statistics:")
        print(f"  Projects: {stats['projects']}")
        print(f"  Production records: {stats['production_records']}")
        print(f"  Reserve/Resource records: {stats['reserve_records']}")
        if stats['top_companies']:
            print("\n  Companies with production data:")
            for c in stats['top_companies']:
                print(f"    {c['ticker']}: {c['production_records']} records")

    elif args.production:
        print(f"\nImporting production data from: {args.production}")
        results = import_production_csv(args.production)
        print(f"Processed: {results['rows_processed']}")
        print(f"Imported: {results['rows_imported']}")
        print(f"Skipped: {results['rows_skipped']}")
        if results.get('errors'):
            print(f"Errors: {len(results['errors'])}")
            for err in results['errors'][:5]:
                print(f"  - {err}")

    elif args.reserves:
        print(f"\nImporting reserves data from: {args.reserves}")
        results = import_reserves_csv(args.reserves)
        print(f"Processed: {results['rows_processed']}")
        print(f"Imported: {results['rows_imported']}")
        print(f"Skipped: {results['rows_skipped']}")

    else:
        print("Import Production/Reserve Data from CSV")
        print("=" * 40)
        print("\nUsage:")
        print("  python import_production_csv.py --production data.csv")
        print("  python import_production_csv.py --reserves reserves.csv")
        print("  python import_production_csv.py --stats")
        print("\nTemplates available in: ../templates/")
