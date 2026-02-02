"""
Market Data Fetcher using yfinance.
Updates company market data (price, market cap, 52wk high/low, volume).
"""

import logging
import time
from typing import Dict, Optional

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

try:
    import yfinance as yf
except ImportError:
    print("yfinance not installed. Run: pip install yfinance")
    yf = None

from config import get_yf_ticker
from db_manager import (get_all_companies, get_company, get_company_tickers,
                        update_market_data)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)


def fetch_market_data(ticker: str, exchange: str = "TSX") -> Optional[Dict]:
    """
    Fetch market data for a single ticker using yfinance.
    Returns dict with price, market_cap, 52wk high/low, volume.
    """
    if yf is None:
        logging.error("yfinance not available")
        return None

    yf_ticker = get_yf_ticker(ticker, exchange)

    try:
        stock = yf.Ticker(yf_ticker)
        info = stock.info

        # Extract relevant fields
        data = {
            'current_price': info.get('currentPrice') or info.get('regularMarketPrice'),
            'market_cap': info.get('marketCap'),
            'high_52w': info.get('fiftyTwoWeekHigh'),
            'low_52w': info.get('fiftyTwoWeekLow'),
            'avg_volume': info.get('averageVolume'),
            'currency': info.get('currency', 'CAD'),
        }

        # Validate we got something
        if data['current_price'] is None:
            logging.warning(f"{ticker}: No price data available")
            return None

        return data

    except Exception as e:
        logging.error(f"{ticker}: Error fetching data - {e}")
        return None


def update_single_company(ticker: str) -> bool:
    """Fetch and update market data for a single company."""
    company = get_company(ticker)
    if not company:
        logging.warning(f"{ticker}: Company not found in database")
        return False

    exchange = company.get('exchange', 'TSX')
    data = fetch_market_data(ticker, exchange)

    if data:
        success = update_market_data(
            ticker=ticker,
            current_price=data['current_price'],
            market_cap=data['market_cap'],
            high_52w=data['high_52w'],
            low_52w=data['low_52w'],
            avg_volume=data['avg_volume'],
            currency=data['currency']
        )
        if success:
            logging.info(f"{ticker}: Updated - ${data['current_price']:.2f} {data['currency']}")
        return success

    return False


def update_all_companies(delay: float = 0.5) -> Dict:
    """
    Update market data for all companies in the database.
    Uses delay between requests to avoid rate limiting.

    Returns summary dict with success/fail counts.
    """
    tickers = get_company_tickers()
    results = {'success': 0, 'failed': 0, 'total': len(tickers)}

    logging.info(f"Updating market data for {len(tickers)} companies...")

    for i, ticker in enumerate(tickers, 1):
        company = get_company(ticker)
        exchange = company.get('exchange', 'TSX') if company else 'TSX'

        logging.info(f"[{i}/{len(tickers)}] Processing {ticker}...")

        if update_single_company(ticker):
            results['success'] += 1
        else:
            results['failed'] += 1

        # Rate limiting
        if i < len(tickers):
            time.sleep(delay)

    logging.info(f"Completed: {results['success']} success, {results['failed']} failed")
    return results


def print_market_summary():
    """Print a summary of market data in the database."""
    companies = get_all_companies()

    print("\n" + "="*80)
    print("MARKET DATA SUMMARY")
    print("="*80)

    # Filter to companies with price data
    with_data = [c for c in companies if c.get('current_price')]
    without_data = [c for c in companies if not c.get('current_price')]

    print(f"\nCompanies with market data: {len(with_data)}")
    print(f"Companies without market data: {len(without_data)}")

    if with_data:
        print("\n" + "-"*80)
        print(f"{'Ticker':<10} {'Name':<30} {'Price':>10} {'Market Cap':>15} {'52W High':>10} {'52W Low':>10}")
        print("-"*80)

        # Sort by market cap
        sorted_companies = sorted(with_data, key=lambda x: x.get('market_cap') or 0, reverse=True)

        for c in sorted_companies[:20]:  # Top 20
            name = (c['name'][:28] + '..') if len(c['name']) > 30 else c['name']
            price = c.get('current_price')
            mcap = c.get('market_cap')
            high = c.get('high_52w')
            low = c.get('low_52w')

            price_str = f"${price:.2f}" if price else "N/A"
            mcap_str = f"${mcap/1e9:.2f}B" if mcap and mcap > 1e9 else f"${mcap/1e6:.0f}M" if mcap else "N/A"
            high_str = f"${high:.2f}" if high else "N/A"
            low_str = f"${low:.2f}" if low else "N/A"

            print(f"{c['ticker']:<10} {name:<30} {price_str:>10} {mcap_str:>15} {high_str:>10} {low_str:>10}")

    if without_data:
        print(f"\nMissing data for: {', '.join([c['ticker'] for c in without_data[:10]])}")
        if len(without_data) > 10:
            print(f"  ... and {len(without_data) - 10} more")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Fetch market data for TSX mining companies")
    parser.add_argument('--ticker', type=str, help="Update single ticker")
    parser.add_argument('--all', action='store_true', help="Update all companies")
    parser.add_argument('--summary', action='store_true', help="Print market summary")
    parser.add_argument('--delay', type=float, default=0.5, help="Delay between requests (seconds)")

    args = parser.parse_args()

    if args.ticker:
        success = update_single_company(args.ticker)
        print(f"{'Success' if success else 'Failed'}")

    elif args.all:
        results = update_all_companies(delay=args.delay)
        print(f"\nResults: {results}")

    elif args.summary:
        print_market_summary()

    else:
        # Default: show summary
        print("Usage:")
        print("  python market_data.py --ticker ABX    # Update single company")
        print("  python market_data.py --all           # Update all companies")
        print("  python market_data.py --summary       # Show market summary")
        print("\nRun with --all to fetch market data for all companies.")
