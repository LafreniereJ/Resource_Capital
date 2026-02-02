"""
Initialize Project Records for Target Producers
Creates project records for all mines defined in target_producers.py
"""

import logging
import os
import sqlite3
import sys

# Add config dir to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'config'))
from target_producers import TARGET_PRODUCERS

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'database', 'mining.db')


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_company_by_ticker(cursor, ticker: str):
    """Get company from database by ticker."""
    cursor.execute("SELECT id, name, commodity FROM companies WHERE ticker = ?", (ticker,))
    return cursor.fetchone()


def create_project(cursor, company_id: int, mine_name: str, commodity: str) -> int:
    """Create a project record if it doesn't exist."""
    # Check if exists
    cursor.execute(
        "SELECT id FROM projects WHERE company_id = ? AND name = ?",
        (company_id, mine_name)
    )
    existing = cursor.fetchone()

    if existing:
        return existing['id']

    # Create project
    cursor.execute("""
        INSERT INTO projects (company_id, name, commodity, stage)
        VALUES (?, ?, ?, 'Production')
    """, (company_id, mine_name, commodity))

    return cursor.lastrowid


def init_producer_projects(dry_run: bool = False):
    """Initialize project records for all target producers."""
    conn = get_db_connection()
    cursor = conn.cursor()

    results = {
        "companies_found": 0,
        "companies_missing": [],
        "projects_created": 0,
        "projects_existing": 0,
        "by_commodity": {},
    }

    for ticker, info in TARGET_PRODUCERS.items():
        company = get_company_by_ticker(cursor, ticker)

        if not company:
            results["companies_missing"].append(ticker)
            continue

        results["companies_found"] += 1
        company_id = company['id']
        commodity = info.get("commodity", company['commodity'])

        # Skip streaming/royalty companies - they don't have their own mines
        if info.get("type") in ["streaming", "royalty"]:
            logging.info(f"Skipping {ticker} - {info.get('type')} company")
            continue

        mines = info.get("mines", [])

        for mine_name in mines:
            if dry_run:
                logging.info(f"[DRY RUN] Would create: {ticker} -> {mine_name}")
                continue

            # Check if exists
            cursor.execute(
                "SELECT id FROM projects WHERE company_id = ? AND name = ?",
                (company_id, mine_name)
            )
            existing = cursor.fetchone()

            if existing:
                results["projects_existing"] += 1
            else:
                project_id = create_project(cursor, company_id, mine_name, commodity)
                results["projects_created"] += 1
                logging.info(f"Created project: {ticker} -> {mine_name} (ID: {project_id})")

                # Track by commodity
                if commodity not in results["by_commodity"]:
                    results["by_commodity"][commodity] = 0
                results["by_commodity"][commodity] += 1

    if not dry_run:
        conn.commit()
    conn.close()

    return results


def show_project_stats():
    """Show statistics on projects in database."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Total projects
    cursor.execute("SELECT COUNT(*) as cnt FROM projects")
    total = cursor.fetchone()['cnt']

    # By company
    cursor.execute("""
        SELECT c.ticker, c.name, COUNT(p.id) as project_count
        FROM companies c
        JOIN projects p ON c.id = p.company_id
        GROUP BY c.id
        ORDER BY project_count DESC
        LIMIT 20
    """)
    by_company = [dict(row) for row in cursor.fetchall()]

    # By commodity
    cursor.execute("""
        SELECT commodity, COUNT(*) as cnt
        FROM projects
        WHERE commodity IS NOT NULL
        GROUP BY commodity
        ORDER BY cnt DESC
    """)
    by_commodity = {row['commodity']: row['cnt'] for row in cursor.fetchall()}

    conn.close()

    return {
        "total_projects": total,
        "by_company": by_company,
        "by_commodity": by_commodity,
    }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Initialize Producer Project Records")
    parser.add_argument("--init", action="store_true", help="Create project records for all target producers")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be created without making changes")
    parser.add_argument("--stats", action="store_true", help="Show project statistics")

    args = parser.parse_args()

    if args.stats:
        stats = show_project_stats()
        print("\nProject Statistics:")
        print(f"  Total projects: {stats['total_projects']}")
        print("\n  By Commodity:")
        for commodity, cnt in stats['by_commodity'].items():
            print(f"    {commodity}: {cnt}")
        print("\n  By Company (top 20):")
        for company in stats['by_company']:
            print(f"    {company['ticker']}: {company['project_count']} projects ({company['name']})")

    elif args.init or args.dry_run:
        print(f"\n{'[DRY RUN] ' if args.dry_run else ''}Initializing producer projects...")
        results = init_producer_projects(dry_run=args.dry_run)

        print(f"\nResults:")
        print(f"  Companies found in DB: {results['companies_found']}")
        print(f"  Companies missing: {len(results['companies_missing'])}")
        if results['companies_missing']:
            print(f"    Missing: {', '.join(results['companies_missing'])}")
        print(f"  Projects created: {results['projects_created']}")
        print(f"  Projects already existing: {results['projects_existing']}")

        if results['by_commodity']:
            print(f"\n  Created by commodity:")
            for commodity, cnt in results['by_commodity'].items():
                print(f"    {commodity}: {cnt}")

    else:
        print("Initialize Producer Project Records")
        print("=" * 40)
        print("\nUsage:")
        print("  python init_producer_projects.py --dry-run   # Preview changes")
        print("  python init_producer_projects.py --init      # Create projects")
        print("  python init_producer_projects.py --stats     # Show statistics")
