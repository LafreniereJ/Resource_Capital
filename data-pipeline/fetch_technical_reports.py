#!/usr/bin/env python3
"""
Fetch Technical Reports Script

This script runs the technical report fetcher to discover and download
NI 43-101 reports, feasibility studies, and resource estimates.

Can be run manually or scheduled via run_scheduler.py

Usage:
    python fetch_technical_reports.py             # Discover and download
    python fetch_technical_reports.py --discover  # Discover only (dry run)
"""

import argparse
import logging
import os
import sys

# Setup path
sys.path.insert(0, os.path.dirname(__file__))

from ingestion.report_fetcher import (
    fetch_all_technical_reports,
    discover_reports_only,
    ReportFetcher,
    COMPANY_IR_URLS,
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description='Fetch Technical Reports')
    parser.add_argument('--discover', action='store_true',
                        help='Discover reports without downloading')
    parser.add_argument('--ticker', type=str,
                        help='Fetch reports for specific ticker only')

    args = parser.parse_args()

    if args.ticker:
        # Single ticker mode
        fetcher = ReportFetcher()
        ticker = args.ticker.upper()

        ir_url = COMPANY_IR_URLS.get(ticker)
        if not ir_url:
            logger.warning(f"No IR URL known for {ticker}")
            print(f"No IR URL configured for {ticker}")
            return

        logger.info(f"Fetching reports for {ticker}")
        reports = fetcher.scrape_ir_page(ticker, ir_url)

        print(f"\nFound {len(reports)} reports for {ticker}:")
        for report in reports:
            print(f"  [{report['type']}] {report['title'][:60]}")

            if not args.discover:
                filepath = fetcher.download_pdf(
                    report['url'],
                    report['ticker'],
                    report['title'],
                    report['type']
                )
                if filepath:
                    print(f"    -> Downloaded: {filepath}")

        print(f"\nProcessed {len(reports)} reports")
        return

    # Full fetch mode
    if args.discover:
        logger.info("Starting report discovery (dry run)...")
        results = discover_reports_only()
    else:
        logger.info("Starting report fetch and download...")
        results = fetch_all_technical_reports(download=True)

    # Print summary
    print("\n" + "=" * 60)
    print("Technical Report Fetch Complete")
    print("=" * 60)
    print(f"RSS reports found:    {len(results['rss_reports'])}")
    print(f"IR page reports:      {len(results['ir_reports'])}")
    print(f"Files downloaded:     {len(results['downloaded'])}")

    if results['errors']:
        print(f"Errors:               {len(results['errors'])}")

    if results['downloaded']:
        print("\nDownloaded files:")
        for f in results['downloaded'][:10]:  # Show first 10
            print(f"  {f}")
        if len(results['downloaded']) > 10:
            print(f"  ... and {len(results['downloaded']) - 10} more")


if __name__ == "__main__":
    main()
