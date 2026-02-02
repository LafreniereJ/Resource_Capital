#!/usr/bin/env python3
"""
Cron Job: Fetch Stock Prices

Run every 15 minutes during market hours to update company stock prices.
Add to cron:
    */15 * * * * cd /path/to/data-pipeline && python fetch_stock_prices.py >> logs/stock_prices.log 2>&1

For Windows Task Scheduler, use: python fetch_stock_prices.py
"""

import os
import sys
import sqlite3
import logging
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple

from config import get_yf_ticker

# Setup logging
log_dir = os.path.join(os.path.dirname(__file__), 'logs')
os.makedirs(log_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(log_dir, 'stock_prices.log'))
    ]
)
logger = logging.getLogger(__name__)

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'database', 'mining.db')

# Rate limiting
RATE_LIMIT_DELAY = 0.3  # seconds between API calls


def get_db_connection():
    """Get database connection."""
    return sqlite3.connect(DB_PATH)


def ensure_columns_exist(conn):
    """Add price tracking columns if they don't exist."""
    cursor = conn.cursor()

    columns_to_add = [
        ("prev_close", "REAL"),
        ("day_change", "REAL"),
        ("day_change_percent", "REAL"),
        ("day_open", "REAL"),
        ("day_high", "REAL"),
        ("day_low", "REAL"),
        ("day_volume", "INTEGER"),
    ]

    # Get existing columns
    cursor.execute("PRAGMA table_info(companies)")
    existing_cols = {row[1] for row in cursor.fetchall()}

    for col_name, col_type in columns_to_add:
        if col_name not in existing_cols:
            try:
                logger.info(f"Adding column {col_name} to companies table...")
                cursor.execute(f"ALTER TABLE companies ADD COLUMN {col_name} {col_type}")
            except Exception as e:
                logger.warning(f"Could not add column {col_name}: {e}")

    conn.commit()


def get_companies(conn) -> List[Tuple]:
    """Get all companies from database."""
    cursor = conn.cursor()
    # SQLite doesn't support NULLS LAST, use COALESCE workaround
    cursor.execute("SELECT id, ticker, exchange FROM companies ORDER BY COALESCE(market_cap, 0) DESC")
    return cursor.fetchall()


def fetch_stock_data(yf_ticker: str) -> Optional[Dict]:
    """Fetch stock data from yfinance."""
    try:
        import yfinance as yf

        stock = yf.Ticker(yf_ticker)

        # Try fast_info first (faster, fewer API calls)
        try:
            fast = stock.fast_info
            if hasattr(fast, 'last_price') and fast.last_price:
                return {
                    'current_price': fast.last_price,
                    'prev_close': getattr(fast, 'previous_close', None),
                    'day_open': getattr(fast, 'open', None),
                    'day_high': getattr(fast, 'day_high', None),
                    'day_low': getattr(fast, 'day_low', None),
                    'market_cap': getattr(fast, 'market_cap', None),
                    'day_volume': getattr(fast, 'last_volume', None),
                    'currency': getattr(fast, 'currency', 'CAD'),
                    '52w_high': getattr(fast, 'year_high', None),
                    '52w_low': getattr(fast, 'year_low', None),
                }
        except Exception:
            pass

        # Fallback to info dict
        info = stock.info
        if not info:
            return None

        current_price = info.get('currentPrice') or info.get('regularMarketPrice')
        if not current_price:
            return None

        return {
            'current_price': current_price,
            'prev_close': info.get('previousClose') or info.get('regularMarketPreviousClose'),
            'day_open': info.get('open') or info.get('regularMarketOpen'),
            'day_high': info.get('dayHigh') or info.get('regularMarketDayHigh'),
            'day_low': info.get('dayLow') or info.get('regularMarketDayLow'),
            'market_cap': info.get('marketCap'),
            'day_volume': info.get('volume') or info.get('regularMarketVolume'),
            'currency': info.get('currency', 'CAD'),
            '52w_high': info.get('fiftyTwoWeekHigh'),
            '52w_low': info.get('fiftyTwoWeekLow'),
        }

    except Exception as e:
        logger.debug(f"Error fetching {yf_ticker}: {e}")
        return None


def calculate_change(current: float, prev_close: float) -> Tuple[float, float]:
    """Calculate price change and percentage."""
    if not current or not prev_close or prev_close == 0:
        return (0.0, 0.0)

    change = current - prev_close
    change_percent = (change / prev_close) * 100
    return (round(change, 4), round(change_percent, 2))


def update_company(conn, company_id: int, data: Dict) -> bool:
    """Update company with new price data."""
    cursor = conn.cursor()

    current_price = data.get('current_price')
    prev_close = data.get('prev_close')

    # Calculate daily change
    day_change, day_change_percent = calculate_change(current_price, prev_close)

    try:
        cursor.execute('''
            UPDATE companies SET
                current_price = ?,
                prev_close = ?,
                day_change = ?,
                day_change_percent = ?,
                day_open = ?,
                day_high = ?,
                day_low = ?,
                day_volume = ?,
                market_cap = ?,
                high_52w = COALESCE(?, high_52w),
                low_52w = COALESCE(?, low_52w),
                currency = ?,
                last_updated = ?
            WHERE id = ?
        ''', (
            current_price,
            prev_close,
            day_change,
            day_change_percent,
            data.get('day_open'),
            data.get('day_high'),
            data.get('day_low'),
            data.get('day_volume'),
            data.get('market_cap'),
            data.get('52w_high'),
            data.get('52w_low'),
            data.get('currency', 'CAD'),
            datetime.now().isoformat(),
            company_id
        ))
        return True
    except Exception as e:
        logger.error(f"Failed to update company {company_id}: {e}")
        return False


def main():
    """Main entry point for stock price update."""
    logger.info("=" * 60)
    logger.info(f"Stock price update started at {datetime.now().isoformat()}")
    logger.info("=" * 60)

    if not os.path.exists(DB_PATH):
        logger.error(f"Database not found at {DB_PATH}")
        sys.exit(1)

    conn = get_db_connection()

    try:
        # Ensure we have all needed columns
        ensure_columns_exist(conn)

        # Get all companies
        companies = get_companies(conn)
        total = len(companies)
        logger.info(f"Found {total} companies to update")

        updated = 0
        failed = 0

        for idx, (company_id, ticker, exchange) in enumerate(companies, 1):
            yf_ticker = get_yf_ticker(ticker, exchange or 'TSX')

            # Rate limiting
            if idx > 1:
                time.sleep(RATE_LIMIT_DELAY)

            data = fetch_stock_data(yf_ticker)

            if data and data.get('current_price'):
                if update_company(conn, company_id, data):
                    change_pct = 0
                    if data.get('prev_close') and data.get('current_price'):
                        _, change_pct = calculate_change(data['current_price'], data['prev_close'])

                    logger.info(
                        f"[{idx}/{total}] {ticker:8} ${data['current_price']:>8.2f}  "
                        f"{change_pct:>+6.2f}%  (via {yf_ticker})"
                    )
                    updated += 1
                else:
                    failed += 1
            else:
                # Try alternate suffix
                alt_ticker = f"{ticker}.V" if yf_ticker.endswith('.TO') else f"{ticker}.TO"
                data = fetch_stock_data(alt_ticker)

                if data and data.get('current_price'):
                    if update_company(conn, company_id, data):
                        change_pct = 0
                        if data.get('prev_close'):
                            _, change_pct = calculate_change(data['current_price'], data['prev_close'])
                        logger.info(
                            f"[{idx}/{total}] {ticker:8} ${data['current_price']:>8.2f}  "
                            f"{change_pct:>+6.2f}%  (via {alt_ticker})"
                        )
                        updated += 1
                    else:
                        failed += 1
                else:
                    logger.warning(f"[{idx}/{total}] {ticker:8} - No data found")
                    failed += 1

        # Commit all updates
        conn.commit()

        logger.info("=" * 60)
        logger.info(f"Update complete: {updated} updated, {failed} failed out of {total}")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"Stock price update failed: {e}", exc_info=True)
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
