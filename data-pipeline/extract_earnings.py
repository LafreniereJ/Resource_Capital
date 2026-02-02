"""
Simple Earnings Extraction CLI
Extract production data from PDFs or pasted text using Groq.

Usage:
  python extract_earnings.py                    # Interactive mode
  python extract_earnings.py report.pdf         # Extract from PDF
  python extract_earnings.py --save AEM         # Extract and save to database
"""

import os
import sys
import json
import sqlite3
from pathlib import Path

# Add paths
sys.path.insert(0, str(Path(__file__).parent / 'processing'))
sys.path.insert(0, str(Path(__file__).parent / 'ingestion'))

from groq_extractor import GroqExtractor, ProductionData
from dataclasses import asdict

DB_PATH = Path(__file__).parent.parent / 'database' / 'mining.db'


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_project_id(ticker: str, mine_name: str) -> int:
    """Get project ID for a mine, or None if not found."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT p.id FROM projects p
        JOIN companies c ON p.company_id = c.id
        WHERE c.ticker = ? AND p.name = ?
    """, (ticker, mine_name))

    result = cursor.fetchone()
    conn.close()

    return result['id'] if result else None


def save_production_data(ticker: str, data: ProductionData) -> bool:
    """Save extracted production data to database."""
    project_id = get_project_id(ticker, data.mine_name)

    if not project_id:
        print(f"  Warning: No project found for {ticker} - {data.mine_name}")
        return False

    conn = get_db_connection()
    cursor = conn.cursor()

    # Determine period type and end date
    period = data.period or ''
    if 'Q1' in period.upper():
        period_type = 'quarterly'
        period_end = period.replace('Q1', '').strip() + '-03-31'
    elif 'Q2' in period.upper():
        period_type = 'quarterly'
        period_end = period.replace('Q2', '').strip() + '-06-30'
    elif 'Q3' in period.upper():
        period_type = 'quarterly'
        period_end = period.replace('Q3', '').strip() + '-09-30'
    elif 'Q4' in period.upper():
        period_type = 'quarterly'
        period_end = period.replace('Q4', '').strip() + '-12-31'
    else:
        period_type = 'annual'
        period_end = data.period_end or (period + '-12-31' if period else None)

    try:
        cursor.execute("""
            INSERT INTO mine_production (
                project_id, period_type, period_end,
                ore_mined_tonnes, ore_processed_tonnes,
                head_grade, head_grade_unit, recovery_rate,
                gold_produced_oz, silver_produced_oz, copper_produced_lbs,
                aisc_per_oz, cash_cost_per_oz, source_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(project_id, period_type, period_end) DO UPDATE SET
                ore_mined_tonnes = COALESCE(excluded.ore_mined_tonnes, mine_production.ore_mined_tonnes),
                ore_processed_tonnes = COALESCE(excluded.ore_processed_tonnes, mine_production.ore_processed_tonnes),
                head_grade = COALESCE(excluded.head_grade, mine_production.head_grade),
                gold_produced_oz = COALESCE(excluded.gold_produced_oz, mine_production.gold_produced_oz),
                aisc_per_oz = COALESCE(excluded.aisc_per_oz, mine_production.aisc_per_oz)
        """, (
            project_id, period_type, period_end,
            data.ore_mined_tonnes, data.ore_processed_tonnes,
            data.head_grade, data.head_grade_unit, data.recovery_rate,
            data.gold_oz, data.silver_oz, data.copper_lbs,
            data.aisc_per_oz, data.cash_cost_per_oz, data.source_url
        ))
        conn.commit()
        print(f"  Saved: {data.mine_name} - {period}")
        return True

    except Exception as e:
        print(f"  Error saving: {e}")
        return False

    finally:
        conn.close()


def interactive_mode():
    """Interactive extraction mode."""
    print("\n" + "=" * 50)
    print("Mining Production Data Extractor (Groq)")
    print("=" * 50)

    extractor = GroqExtractor()

    while True:
        print("\nOptions:")
        print("  1. Paste text to extract")
        print("  2. Extract from PDF file")
        print("  3. Exit")

        choice = input("\nChoice: ").strip()

        if choice == '1':
            print("\nPaste the earnings report text (press Enter twice when done):")
            lines = []
            while True:
                line = input()
                if line == '':
                    if lines and lines[-1] == '':
                        break
                lines.append(line)

            text = '\n'.join(lines[:-1])  # Remove trailing empty line

            if len(text) < 50:
                print("Text too short, please paste more content.")
                continue

            print(f"\nExtracting from {len(text)} characters...")
            results = extractor.extract_from_text(text)

            if not results:
                print("No production data found in the text.")
                continue

            print(f"\nFound {len(results)} records:")
            for i, r in enumerate(results, 1):
                print(f"\n  [{i}] {r.mine_name}")
                print(f"      Period: {r.period}")
                if r.gold_oz:
                    print(f"      Gold: {r.gold_oz:,.0f} oz")
                if r.ore_processed_tonnes:
                    print(f"      Ore: {r.ore_processed_tonnes:,.0f} t")
                if r.aisc_per_oz:
                    print(f"      AISC: ${r.aisc_per_oz:,.0f}/oz")

            # Ask to save
            ticker = input("\nEnter ticker to save (or press Enter to skip): ").strip().upper()
            if ticker:
                saved = 0
                for r in results:
                    if save_production_data(ticker, r):
                        saved += 1
                print(f"\nSaved {saved}/{len(results)} records to database.")

        elif choice == '2':
            pdf_path = input("Enter PDF path: ").strip().strip('"')

            if not os.path.exists(pdf_path):
                print("File not found.")
                continue

            print(f"\nExtracting from PDF...")
            results = extractor.extract_from_pdf(pdf_path)

            if not results:
                print("No production data found in the PDF.")
                continue

            print(f"\nFound {len(results)} records:")
            for i, r in enumerate(results, 1):
                print(f"\n  [{i}] {r.mine_name}: {r.gold_oz or 'N/A'} oz gold")

            ticker = input("\nEnter ticker to save (or press Enter to skip): ").strip().upper()
            if ticker:
                saved = 0
                for r in results:
                    if save_production_data(ticker, r):
                        saved += 1
                print(f"\nSaved {saved}/{len(results)} records.")

        elif choice == '3':
            break


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Extract Mining Production Data")
    parser.add_argument("input", nargs="?", help="PDF file to extract from")
    parser.add_argument("--save", type=str, help="Ticker to save data under")
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    if args.input:
        extractor = GroqExtractor()

        if args.input.endswith('.pdf'):
            results = extractor.extract_from_pdf(args.input)
        else:
            with open(args.input, 'r', encoding='utf-8') as f:
                results = extractor.extract_from_text(f.read())

        if args.json:
            print(json.dumps([asdict(r) for r in results], indent=2))
        else:
            print(f"\nExtracted {len(results)} records:")
            for r in results:
                print(f"\n  {r.mine_name}: {r.gold_oz or 'N/A'} oz @ ${r.aisc_per_oz or 'N/A'}/oz AISC")

        if args.save:
            saved = 0
            for r in results:
                if save_production_data(args.save, r):
                    saved += 1
            print(f"\nSaved {saved}/{len(results)} records to database.")

    else:
        interactive_mode()
