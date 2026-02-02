#!/usr/bin/env python3
"""
Cron Job: Fetch Insider Transactions

Fetches insider trading data from TMXmoney for TSX/TSXV companies.
Run daily to update insider activity.
    
Usage:
    python fetch_insider_transactions.py           # Update all companies
    python fetch_insider_transactions.py --ticker ABX  # Single company
    python fetch_insider_transactions.py --test   # Test mode (dry run)
"""

import os
import sys
import sqlite3
import logging
import time
import argparse
import requests
from datetime import datetime
from typing import List, Dict, Optional, Tuple

# Setup logging
log_dir = os.path.join(os.path.dirname(__file__), 'logs')
os.makedirs(log_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(log_dir, 'insider_transactions.log'))
    ]
)
logger = logging.getLogger(__name__)

# Add parent directory for imports
sys.path.insert(0, os.path.dirname(__file__))
from processing.db_manager import (
    get_connection, 
    init_db, 
    bulk_insert_insider_transactions, 
    get_company_tickers,
    get_company
)

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'database', 'mining.db')

# Rate limiting
RATE_LIMIT_DELAY = 2.0  # seconds between requests to avoid blocking

# TMXmoney URLs
TMX_GRAPHQL_URL = "https://app-money.tmx.com/graphql"
GRAPHQL_HEADERS = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://money.tmx.com',
    'Referer': 'https://money.tmx.com/'
}


def normalize_transaction_type(trans_type: str, amount: float) -> str:
    """Normalize transaction type to Buy/Sell/Grant/Other."""
    t = (trans_type or '').lower()
    
    if 'purchase' in t or 'acquisition' in t or 'buy' in t:
        return 'Buy'
    elif 'sale' in t or 'disposition' in t or 'sell' in t:
        return 'Sell'
    elif 'grant' in t or 'award' in t or 'option' in t:
        return 'Grant'
    elif 'redemption' in t:
        return 'Sell' # Treat redemption as selling back to company
    
    # Fallback based on amount sign if type is ambiguous
    if amount > 0:
        return 'Buy'
    elif amount < 0:
        return 'Sell'
        
    return 'Other'


def process_transaction(ticker: str, raw_tx: Dict) -> Optional[Dict]:
    """
    Process a raw transaction object from GraphQL into database format.
    """
    try:
        # Extract fields from TMX GraphQL response keys
        # Keys seen: date, filer, relationship, type, amount, pricefrom, marketvalue
        
        insider_name = raw_tx.get('filer')
        if not insider_name:
            return None
            
        trans_date = raw_tx.get('date') # Use date as is (YYYY-MM-DD from GraphQL)
        if not trans_date:
            return None
            
        shares = raw_tx.get('amount', 0)
        price = raw_tx.get('pricefrom', 0) or 0
        total_value = raw_tx.get('marketvalue', 0) or (shares * price)
        
        # Determine transaction type
        raw_type = raw_tx.get('type', 'Unknown')
        trans_type = normalize_transaction_type(raw_type, shares)
        
        # Absolute value for shares in database usually, but let's keep sign logic consistent
        # If the UI expects positive numbers for volume, we should abs it.
        # But for net calculation, signs are useful.
        # The database schema has `shares` (INTEGER). 
        # Let's normalize `shares` to be positive for the record, but rely on Type involved.
        shares_abs = abs(shares)
        total_value_abs = abs(total_value)
        
        return {
            'ticker': ticker,
            'insider_name': insider_name,
            'insider_role': raw_tx.get('relationship'),
            'transaction_type': trans_type,
            'transaction_date': trans_date,
            'shares': shares_abs,
            'price_per_share': float(price),
            'total_value': float(total_value_abs),
            'shares_held_after': raw_tx.get('amountowned', 0),
            'source_url': f"https://money.tmx.com/en/quote/{ticker}/insider-trading",
            'fetched_at': datetime.now().isoformat()
        }

    except Exception as e:
        logger.warning(f"Error parsing transaction for {ticker}: {e}")
        return None


def fetch_insider_data(ticker: str) -> List[Dict]:
    """
    Fetch insider transactions from TMX GraphQL API.
    Returns processed list of transactions.
    """
    try:
        payload = {
            "operationName": "getInsiderTransactions",
            "variables": {"symbol": ticker},
            "query": "query getInsiderTransactions($symbol: String!) { getInsiderTransactions(symbol: $symbol) }"
        }

        response = requests.post(TMX_GRAPHQL_URL, json=payload, headers=GRAPHQL_HEADERS, timeout=10)
        
        if response.status_code != 200:
            logger.warning(f"GraphQL request failed for {ticker}: {response.status_code}")
            return []

        data = response.json()
        
        # The response structure is data -> getInsiderTransactions -> [list of objects]
        raw_transactions = data.get('data', {}).get('getInsiderTransactions', [])
        
        if not raw_transactions:
            logger.info(f"No insider data found for {ticker} in GraphQL response")
            return []
        
        processed_transactions = []
        for raw_tx in raw_transactions:
            ptx = process_transaction(ticker, raw_tx)
            if ptx:
                processed_transactions.append(ptx)
                
        return processed_transactions

    except Exception as e:
        logger.error(f"Error fetching insider data for {ticker}: {e}")
        return []


def get_companies_to_update(conn, ticker: str = None) -> List[Tuple]:
    """Get list of companies to update."""
    cursor = conn.cursor()
    
    if ticker:
        cursor.execute(
            "SELECT id, ticker FROM companies WHERE ticker = ?", 
            (ticker.upper(),)
        )
    else:
        # Get companies ordered by market cap (prioritize larger companies)
        cursor.execute(
            "SELECT id, ticker FROM companies ORDER BY market_cap DESC NULLS LAST"
        )
    
    return cursor.fetchall()


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Fetch insider transactions for TSX/TSXV companies')
    parser.add_argument('--ticker', '-t', help='Specific ticker to update')
    parser.add_argument('--test', action='store_true', help='Test mode - show data without saving')
    parser.add_argument('--limit', '-l', type=int, default=0, help='Limit number of companies to update')
    args = parser.parse_args()
    
    logger.info("=" * 60)
    logger.info(f"Insider transactions update started at {datetime.now().isoformat()}")
    logger.info("=" * 60)
    
    if not os.path.exists(DB_PATH):
        logger.error(f"Database not found at {DB_PATH}")
        logger.info("Initializing database...")
        init_db()
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    
    try:
        companies = get_companies_to_update(conn, args.ticker)
        
        if args.limit > 0:
            companies = companies[:args.limit]
        
        total = len(companies)
        logger.info(f"Found {total} companies to update")
        
        updated = 0
        failed = 0
        total_transactions = 0
        
        for idx, (company_id, ticker) in enumerate(companies, 1):
            # Rate limiting
            if idx > 1:
                time.sleep(RATE_LIMIT_DELAY)
            
            logger.info(f"[{idx}/{total}] Fetching insider data for {ticker}...")
            
            transactions = fetch_insider_data(ticker)
            
            if transactions:
                # Add company_id to each transaction
                for txn in transactions:
                    txn['company_id'] = company_id
                
                if args.test:
                    # Test mode - just display data
                    logger.info(f"  Found {len(transactions)} transactions:")
                    for txn in transactions[:5]:  # Show first 5
                        logger.info(f"    {txn['insider_name']}: {txn['transaction_type']} "
                                  f"{txn['shares']:,} shares @ ${txn['price_per_share']:.2f}")
                    if len(transactions) > 5:
                        logger.info(f"    ... and {len(transactions) - 5} more")
                else:
                    # Save to database
                    count = bulk_insert_insider_transactions(transactions)
                    logger.info(f"  Saved {count} transactions for {ticker}")
                    total_transactions += count
                
                updated += 1
            else:
                logger.info(f"  No insider data found for {ticker}")
                failed += 1
        
        logger.info("=" * 60)
        logger.info(f"Update complete: {updated} companies updated, {failed} no data")
        if not args.test:
            logger.info(f"Total transactions saved: {total_transactions}")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"Insider transactions update failed: {e}", exc_info=True)
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
