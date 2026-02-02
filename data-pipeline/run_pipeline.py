#!/usr/bin/env python3
"""
Resource Capital Data Pipeline - Main Orchestrator

This script provides a unified interface to run all pipeline components:
1. Initialize database and load companies
2. Fetch market data via yfinance
3. Monitor SEDAR+ for new filings
4. Extract metrics from documents

Usage:
    python run_pipeline.py --init          # Initialize DB + load companies
    python run_pipeline.py --market-data   # Update market data
    python run_pipeline.py --check-filings # Check for new SEDAR+ filings
    python run_pipeline.py --extract FILE  # Extract metrics from a file
    python run_pipeline.py --status        # Show pipeline status
    python run_pipeline.py --weekly        # Run weekly update (market data)
"""

import os
import sys
import argparse
import json
from datetime import datetime

# Add processing dir to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'processing'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ingestion'))

from db_manager import init_db, get_stats, get_all_companies
from companies import load_companies_to_db, print_summary
from market_data import update_all_companies, print_market_summary, update_single_company
from generic_extractor import GenericExtractor


def cmd_init():
    """Initialize the database and load TSX mining companies."""
    print("="*60)
    print("INITIALIZING RESOURCE CAPITAL PIPELINE")
    print("="*60)

    print("\n[1/2] Creating database schema...")
    init_db()

    print("\n[2/2] Loading TSX mining companies...")
    count = load_companies_to_db()

    print("\n" + "="*60)
    print(f"Initialization complete. Loaded {count} companies.")
    print("="*60)

    print_summary()


def cmd_market_data(ticker: str = None, delay: float = 0.5):
    """Fetch/update market data."""
    print("="*60)
    print("UPDATING MARKET DATA")
    print("="*60)

    if ticker:
        print(f"\nUpdating {ticker}...")
        success = update_single_company(ticker)
        print(f"{'Success' if success else 'Failed'}")
    else:
        print("\nUpdating all companies (this may take a few minutes)...")
        results = update_all_companies(delay=delay)
        print(f"\nResults: {results['success']} success, {results['failed']} failed")

    print_market_summary()


def cmd_extract(file_path: str):
    """Extract metrics from a file."""
    print("="*60)
    print("EXTRACTING METRICS")
    print("="*60)

    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    print(f"\nProcessing: {file_path}")

    extractor = GenericExtractor()
    results = extractor.extract_all(open(file_path).read())

    print("\n--- Metrics Found ---")
    if results["metrics"]:
        for m in results["metrics"]:
            print(f"  {m['metric']}: {m['value']} (confidence: {m['confidence']})")
    else:
        print("  No metrics found")

    print("\n--- Drill Intercepts Found ---")
    if results["drill_intercepts"]:
        for d in results["drill_intercepts"]:
            print(f"  {d['hole_id']}: {d['interval']}m interval")
    else:
        print("  No drill intercepts found")

    # Output full JSON
    print("\n--- Full JSON Output ---")
    print(json.dumps(results, indent=2))


def cmd_status():
    """Show pipeline status."""
    print("="*60)
    print("PIPELINE STATUS")
    print("="*60)

    stats = get_stats()
    print(f"\nDatabase Statistics:")
    print(f"  Companies:  {stats['companies']}")
    print(f"  Projects:   {stats['projects']}")
    print(f"  Filings:    {stats['filings']}")
    print(f"  Metrics:    {stats['metrics']}")

    # Show companies with/without market data
    companies = get_all_companies()
    with_price = sum(1 for c in companies if c.get('current_price'))
    print(f"\nMarket Data:")
    print(f"  With price data:    {with_price}")
    print(f"  Without price data: {len(companies) - with_price}")

    # Check last update
    last_updated = None
    for c in companies:
        if c.get('last_updated'):
            if last_updated is None or c['last_updated'] > last_updated:
                last_updated = c['last_updated']

    if last_updated:
        print(f"  Last updated: {last_updated}")


def cmd_weekly():
    """Run weekly update tasks."""
    print("="*60)
    print("WEEKLY UPDATE - " + datetime.now().strftime("%Y-%m-%d %H:%M"))
    print("="*60)

    print("\n[1/2] Updating market data...")
    results = update_all_companies(delay=0.3)
    print(f"Market data: {results['success']} updated, {results['failed']} failed")

    # Note: SEDAR+ checking requires profile IDs to be configured
    print("\n[2/2] SEDAR+ filing check...")
    print("  Note: Configure profile IDs in sedar_monitor.py to enable")

    print("\n" + "="*60)
    print("Weekly update complete!")
    print("="*60)


def main():
    parser = argparse.ArgumentParser(
        description="Resource Capital Data Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python run_pipeline.py --init              # First-time setup
    python run_pipeline.py --market-data       # Update all market data
    python run_pipeline.py --market-data ABX   # Update single ticker
    python run_pipeline.py --extract file.txt  # Extract metrics from file
    python run_pipeline.py --status            # Check pipeline status
    python run_pipeline.py --weekly            # Run weekly batch update
        """
    )

    parser.add_argument('--init', action='store_true',
                        help='Initialize database and load companies')
    parser.add_argument('--market-data', nargs='?', const='ALL', metavar='TICKER',
                        help='Update market data (optionally for specific ticker)')
    parser.add_argument('--extract', type=str, metavar='FILE',
                        help='Extract metrics from a text file')
    parser.add_argument('--status', action='store_true',
                        help='Show pipeline status')
    parser.add_argument('--weekly', action='store_true',
                        help='Run weekly update tasks')
    parser.add_argument('--delay', type=float, default=0.5,
                        help='Delay between API requests (seconds)')

    args = parser.parse_args()

    # Dispatch to appropriate command
    if args.init:
        cmd_init()
    elif args.market_data:
        if args.market_data == 'ALL':
            cmd_market_data(delay=args.delay)
        else:
            cmd_market_data(ticker=args.market_data)
    elif args.extract:
        cmd_extract(args.extract)
    elif args.status:
        cmd_status()
    elif args.weekly:
        cmd_weekly()
    else:
        parser.print_help()
        print("\n" + "="*60)
        print("Quick Start:")
        print("  1. python run_pipeline.py --init         # Setup")
        print("  2. python run_pipeline.py --market-data  # Fetch prices")
        print("  3. python run_pipeline.py --status       # Check status")
        print("="*60)


if __name__ == "__main__":
    main()
