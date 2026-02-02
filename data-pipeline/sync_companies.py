"""
Sync Companies from CSV to Database

Loads companies from seed_data/official_tracked_companies.csv into the database.
This is the source of truth for the official company list.

Usage:
    python sync_companies.py
"""

import sqlite3
import csv
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "database", "mining.db")
CSV_PATH = os.path.join(os.path.dirname(__file__), "seed_data", "official_tracked_companies.csv")


def sync_companies():
    """Load all companies from CSV into database."""

    if not os.path.exists(CSV_PATH):
        print(f"ERROR: CSV file not found: {CSV_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    added = 0
    updated = 0

    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row in reader:
            ticker = row['Ticker']
            name = row['Name']
            exchange = row['Exchange']
            commodity = row['Commodity']
            market_cap = float(row['Market Cap (CAD)']) if row['Market Cap (CAD)'] else None

            # Check if company exists
            cursor.execute("SELECT id FROM companies WHERE ticker = ?", (ticker,))
            existing = cursor.fetchone()

            if existing:
                # Update existing company
                cursor.execute('''
                    UPDATE companies
                    SET name=?, exchange=?, commodity=?, market_cap=?
                    WHERE ticker=?
                ''', (name, exchange, commodity, market_cap, ticker))
                updated += 1
            else:
                # Insert new company
                cursor.execute('''
                    INSERT INTO companies (name, ticker, exchange, commodity, market_cap)
                    VALUES (?, ?, ?, ?, ?)
                ''', (name, ticker, exchange, commodity, market_cap))
                added += 1

    conn.commit()

    # Show stats
    cursor.execute("SELECT COUNT(*) FROM companies")
    total = cursor.fetchone()[0]

    cursor.execute("SELECT commodity, COUNT(*) FROM companies GROUP BY commodity ORDER BY COUNT(*) DESC")
    by_commodity = cursor.fetchall()

    conn.close()

    print(f"\nSync Complete!")
    print(f"  Added:   {added}")
    print(f"  Updated: {updated}")
    print(f"  Total:   {total}")
    print(f"\nBy Commodity:")
    for commodity, count in by_commodity:
        print(f"  {commodity or 'Unknown':20} {count}")


if __name__ == "__main__":
    sync_companies()
