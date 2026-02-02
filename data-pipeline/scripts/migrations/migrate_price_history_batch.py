"""
Batch migrate price_history from SQLite to Supabase

The main migration script times out on large tables like price_history (84k+ rows).
This script migrates in smaller batches with progress tracking.

Usage:
    python migrate_price_history_batch.py               # Migrate all
    python migrate_price_history_batch.py --verify      # Only verify counts
    python migrate_price_history_batch.py --batch 500   # Custom batch size
"""

import os
import sys
import sqlite3
import argparse
import time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    print("psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

# Configuration
SQLITE_PATH = Path(__file__).parent.parent / "database" / "mining.db"
SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL")
DEFAULT_BATCH_SIZE = 1000


def get_sqlite_connection():
    """Connect to SQLite database."""
    if not SQLITE_PATH.exists():
        print(f"SQLite database not found at: {SQLITE_PATH}")
        sys.exit(1)
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_postgres_connection():
    """Connect to Supabase PostgreSQL."""
    if not SUPABASE_DB_URL:
        print("SUPABASE_DB_URL not set in environment")
        sys.exit(1)
    return psycopg2.connect(SUPABASE_DB_URL)


def get_counts(sqlite_conn, pg_conn):
    """Get row counts from both databases."""
    sqlite_cursor = sqlite_conn.cursor()
    sqlite_cursor.execute("SELECT COUNT(*) FROM price_history")
    sqlite_count = sqlite_cursor.fetchone()[0]

    pg_cursor = pg_conn.cursor()
    pg_cursor.execute("SELECT COUNT(*) FROM price_history")
    pg_count = pg_cursor.fetchone()[0]

    return sqlite_count, pg_count


def get_unmigrated_company_ids(sqlite_conn, pg_conn):
    """Find company IDs that have price_history in SQLite but not fully in Supabase."""
    sqlite_cursor = sqlite_conn.cursor()
    sqlite_cursor.execute("""
        SELECT company_id, COUNT(*) as cnt
        FROM price_history
        GROUP BY company_id
    """)
    sqlite_counts = {row['company_id']: row['cnt'] for row in sqlite_cursor.fetchall()}

    pg_cursor = pg_conn.cursor()
    pg_cursor.execute("""
        SELECT company_id, COUNT(*) as cnt
        FROM price_history
        GROUP BY company_id
    """)
    pg_counts = {row[0]: row[1] for row in pg_cursor.fetchall()}

    # Find company_ids with missing data
    unmigrated = []
    for company_id, sqlite_cnt in sqlite_counts.items():
        pg_cnt = pg_counts.get(company_id, 0)
        if pg_cnt < sqlite_cnt:
            unmigrated.append((company_id, sqlite_cnt - pg_cnt))

    return unmigrated


def migrate_company_price_history(sqlite_conn, pg_conn, company_id: int, batch_size: int):
    """Migrate price_history for a specific company."""
    sqlite_cursor = sqlite_conn.cursor()

    # Get all price history for this company
    sqlite_cursor.execute("""
        SELECT company_id, date, open, high, low, close, volume
        FROM price_history
        WHERE company_id = ?
        ORDER BY date
    """, (company_id,))

    rows = sqlite_cursor.fetchall()
    if not rows:
        return 0

    # Convert to list of tuples
    records = [(
        row['company_id'],
        row['date'],
        row['open'],
        row['high'],
        row['low'],
        row['close'],
        row['volume']
    ) for row in rows]

    # Batch insert
    pg_cursor = pg_conn.cursor()
    total_inserted = 0

    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        try:
            execute_values(
                pg_cursor,
                """
                INSERT INTO price_history (company_id, date, open, high, low, close, volume)
                VALUES %s
                ON CONFLICT (company_id, date) DO UPDATE SET
                    open = EXCLUDED.open,
                    high = EXCLUDED.high,
                    low = EXCLUDED.low,
                    close = EXCLUDED.close,
                    volume = EXCLUDED.volume
                """,
                batch
            )
            pg_conn.commit()
            total_inserted += len(batch)
        except Exception as e:
            pg_conn.rollback()
            print(f"  Error inserting batch: {e}")
            # Try individual inserts for this batch
            for record in batch:
                try:
                    pg_cursor.execute("""
                        INSERT INTO price_history (company_id, date, open, high, low, close, volume)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (company_id, date) DO UPDATE SET
                            open = EXCLUDED.open,
                            high = EXCLUDED.high,
                            low = EXCLUDED.low,
                            close = EXCLUDED.close,
                            volume = EXCLUDED.volume
                    """, record)
                    pg_conn.commit()
                    total_inserted += 1
                except Exception as inner_e:
                    pg_conn.rollback()
                    pass  # Skip problematic row

    return total_inserted


def migrate_all(batch_size: int):
    """Main migration function."""
    print("=" * 60)
    print("Price History Batch Migration: SQLite → Supabase")
    print("=" * 60)

    sqlite_conn = get_sqlite_connection()
    pg_conn = get_postgres_connection()

    # Initial counts
    sqlite_count, pg_count = get_counts(sqlite_conn, pg_conn)
    print(f"\nInitial counts:")
    print(f"  SQLite:    {sqlite_count:,} rows")
    print(f"  Supabase:  {pg_count:,} rows")
    print(f"  To migrate: ~{sqlite_count - pg_count:,} rows")

    if sqlite_count == pg_count:
        print("\n✓ Already fully migrated!")
        return True

    # Find companies with unmigrated data
    unmigrated = get_unmigrated_company_ids(sqlite_conn, pg_conn)
    print(f"\nFound {len(unmigrated)} companies with unmigrated price history")

    # Sort by missing count (largest first)
    unmigrated.sort(key=lambda x: x[1], reverse=True)

    total_migrated = 0
    start_time = time.time()

    for i, (company_id, missing_count) in enumerate(unmigrated):
        # Get company ticker for logging
        sqlite_cursor = sqlite_conn.cursor()
        sqlite_cursor.execute("SELECT ticker FROM companies WHERE id = ?", (company_id,))
        result = sqlite_cursor.fetchone()
        ticker = result['ticker'] if result else f"ID:{company_id}"

        print(f"\n[{i+1}/{len(unmigrated)}] {ticker}: migrating ~{missing_count} rows...")

        migrated = migrate_company_price_history(sqlite_conn, pg_conn, company_id, batch_size)
        total_migrated += migrated
        print(f"  → Migrated {migrated} rows")

        # Brief pause to avoid overwhelming Supabase
        time.sleep(0.1)

    elapsed = time.time() - start_time

    # Final verification
    print("\n" + "-" * 40)
    print("Verifying migration...")
    sqlite_count, pg_count = get_counts(sqlite_conn, pg_conn)
    print(f"  SQLite:   {sqlite_count:,} rows")
    print(f"  Supabase: {pg_count:,} rows")

    sqlite_conn.close()
    pg_conn.close()

    print("\n" + "=" * 60)
    print(f"Migration complete!")
    print(f"  Total migrated: {total_migrated:,} rows")
    print(f"  Elapsed time:   {elapsed:.1f}s")
    print(f"  Rate:           {total_migrated / elapsed:.0f} rows/sec")

    if sqlite_count == pg_count:
        print("  Status:         ✓ VERIFIED - counts match")
        return True
    else:
        print(f"  Status:         ⚠ WARNING - {sqlite_count - pg_count} rows still missing")
        return False


def verify_only():
    """Only verify counts, don't migrate."""
    print("=" * 60)
    print("Price History Migration Verification")
    print("=" * 60)

    sqlite_conn = get_sqlite_connection()
    pg_conn = get_postgres_connection()

    sqlite_count, pg_count = get_counts(sqlite_conn, pg_conn)

    print(f"\nRow counts:")
    print(f"  SQLite:   {sqlite_count:,} rows")
    print(f"  Supabase: {pg_count:,} rows")

    if sqlite_count == pg_count:
        print("\n✓ Migration complete - counts match!")
    else:
        print(f"\n⚠ {sqlite_count - pg_count:,} rows still need to be migrated")
        print("\nRun without --verify to migrate remaining rows")

    # Show per-company breakdown
    unmigrated = get_unmigrated_company_ids(sqlite_conn, pg_conn)
    if unmigrated:
        print(f"\n{len(unmigrated)} companies with missing data:")
        for company_id, missing in unmigrated[:10]:
            sqlite_cursor = sqlite_conn.cursor()
            sqlite_cursor.execute("SELECT ticker FROM companies WHERE id = ?", (company_id,))
            result = sqlite_cursor.fetchone()
            ticker = result['ticker'] if result else f"ID:{company_id}"
            print(f"  {ticker}: {missing:,} rows missing")
        if len(unmigrated) > 10:
            print(f"  ... and {len(unmigrated) - 10} more")

    sqlite_conn.close()
    pg_conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Batch migrate price_history to Supabase")
    parser.add_argument("--verify", action="store_true", help="Only verify counts")
    parser.add_argument("--batch", type=int, default=DEFAULT_BATCH_SIZE,
                        help=f"Batch size (default: {DEFAULT_BATCH_SIZE})")
    args = parser.parse_args()

    if args.verify:
        verify_only()
    else:
        success = migrate_all(args.batch)
        sys.exit(0 if success else 1)
