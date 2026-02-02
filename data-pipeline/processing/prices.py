"""
Prices Domain Module for Resource Capital

Database operations for stock prices, metal prices, and price history.
Extracted from db_manager.py for better code organization.

Usage:
    from processing.prices import (
        update_metal_price,
        get_metal_prices,
        insert_price_history,
        insert_price_history_batch,
    )
"""

from typing import Dict, List, Optional, Tuple

from .db_manager import get_cursor

# Import execute_values for batch operations
try:
    from psycopg2.extras import execute_values
except ImportError:
    execute_values = None


# =============================================================================
# METAL PRICES
# =============================================================================

def update_metal_price(
    commodity: str,
    symbol: str,
    price: float,
    currency: str = 'USD',
    change_percent: float = None,
    day_high: float = None,
    day_low: float = None,
    prev_close: float = None,
    source: str = 'yfinance'
) -> bool:
    """
    Update or insert metal price.

    Args:
        commodity: Metal name (e.g., "gold", "silver", "copper")
        symbol: Trading symbol (e.g., "GC=F", "SI=F")
        price: Current price
        currency: Currency code (default: "USD")
        change_percent: Daily percentage change
        day_high: Today's high price
        day_low: Today's low price
        prev_close: Previous close price
        source: Data source (default: "yfinance")

    Returns:
        True on success
    """
    with get_cursor() as cursor:
        cursor.execute("""
            INSERT INTO metal_prices
                (commodity, symbol, price, currency, change_percent, day_high, day_low, prev_close, source, fetched_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (commodity) DO UPDATE SET
                symbol = EXCLUDED.symbol,
                price = EXCLUDED.price,
                currency = EXCLUDED.currency,
                change_percent = EXCLUDED.change_percent,
                day_high = EXCLUDED.day_high,
                day_low = EXCLUDED.day_low,
                prev_close = EXCLUDED.prev_close,
                source = EXCLUDED.source,
                fetched_at = NOW()
        """, (commodity.lower(), symbol, price, currency, change_percent, day_high, day_low, prev_close, source))

        # Also insert into history
        cursor.execute("""
            INSERT INTO metal_prices_history (commodity, price, currency, fetched_at)
            VALUES (%s, %s, %s, NOW())
        """, (commodity.lower(), price, currency))

        return True


def get_metal_prices() -> List[Dict]:
    """
    Get current metal prices.

    Returns:
        List of metal price dictionaries
    """
    with get_cursor() as cursor:
        cursor.execute("SELECT * FROM metal_prices ORDER BY commodity")
        return cursor.fetchall()


def get_metal_price(commodity: str) -> Optional[Dict]:
    """
    Get current price for a specific metal.

    Args:
        commodity: Metal name (e.g., "gold")

    Returns:
        Metal price dictionary or None if not found
    """
    with get_cursor() as cursor:
        cursor.execute(
            "SELECT * FROM metal_prices WHERE commodity = %s",
            (commodity.lower(),)
        )
        return cursor.fetchone()


def get_metal_price_history(commodity: str, limit: int = 100) -> List[Dict]:
    """
    Get price history for a metal.

    Args:
        commodity: Metal name
        limit: Maximum records to return

    Returns:
        List of price history records
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT * FROM metal_prices_history
            WHERE commodity = %s
            ORDER BY fetched_at DESC
            LIMIT %s
        """, (commodity.lower(), limit))
        return cursor.fetchall()


# =============================================================================
# STOCK PRICE HISTORY
# =============================================================================

def insert_price_history(
    company_id: int,
    date: str,
    open_price: float = None,
    high: float = None,
    low: float = None,
    close: float = None,
    volume: int = None
) -> bool:
    """
    Insert or update price history record.

    Args:
        company_id: Company database ID
        date: Trading date (YYYY-MM-DD)
        open_price: Opening price
        high: High price
        low: Low price
        close: Closing price
        volume: Trading volume

    Returns:
        True on success
    """
    with get_cursor() as cursor:
        cursor.execute("""
            INSERT INTO price_history (company_id, date, open, high, low, close, volume)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (company_id, date) DO UPDATE SET
                open = EXCLUDED.open,
                high = EXCLUDED.high,
                low = EXCLUDED.low,
                close = EXCLUDED.close,
                volume = EXCLUDED.volume
        """, (company_id, date, open_price, high, low, close, volume))

        return True


def insert_price_history_batch(records: List[Tuple]) -> int:
    """
    Batch insert price history records.

    Args:
        records: List of tuples (company_id, date, open, high, low, close, volume)

    Returns:
        Number of records inserted/updated
    """
    if not records:
        return 0

    if execute_values is None:
        # Fallback to individual inserts if execute_values not available
        count = 0
        for record in records:
            insert_price_history(*record)
            count += 1
        return count

    with get_cursor() as cursor:
        execute_values(
            cursor,
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
            records
        )

        return len(records)


def get_price_history(company_id: int, limit: int = 365) -> List[Dict]:
    """
    Get price history for a company.

    Args:
        company_id: Company database ID
        limit: Maximum records to return

    Returns:
        List of price history records (newest first)
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT * FROM price_history
            WHERE company_id = %s
            ORDER BY date DESC
            LIMIT %s
        """, (company_id, limit))
        return cursor.fetchall()


def get_price_history_range(
    company_id: int,
    start_date: str,
    end_date: str
) -> List[Dict]:
    """
    Get price history for a date range.

    Args:
        company_id: Company database ID
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)

    Returns:
        List of price history records
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT * FROM price_history
            WHERE company_id = %s AND date BETWEEN %s AND %s
            ORDER BY date ASC
        """, (company_id, start_date, end_date))
        return cursor.fetchall()


def get_latest_price(company_id: int) -> Optional[Dict]:
    """
    Get the most recent price record for a company.

    Args:
        company_id: Company database ID

    Returns:
        Most recent price record or None
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT * FROM price_history
            WHERE company_id = %s
            ORDER BY date DESC
            LIMIT 1
        """, (company_id,))
        return cursor.fetchone()


def get_price_statistics(company_id: int, days: int = 30) -> Optional[Dict]:
    """
    Calculate price statistics for a company.

    Args:
        company_id: Company database ID
        days: Number of days to analyze

    Returns:
        Statistics dictionary with avg, min, max, volume
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT
                AVG(close) as avg_close,
                MIN(low) as min_low,
                MAX(high) as max_high,
                SUM(volume) as total_volume,
                COUNT(*) as trading_days
            FROM price_history
            WHERE company_id = %s
              AND date >= CURRENT_DATE - INTERVAL '%s days'
        """, (company_id, days))
        return cursor.fetchone()


def delete_old_price_history(days_to_keep: int = 730) -> int:
    """
    Delete price history older than specified days.

    Args:
        days_to_keep: Number of days of history to retain (default: 2 years)

    Returns:
        Number of records deleted
    """
    with get_cursor() as cursor:
        cursor.execute("""
            DELETE FROM price_history
            WHERE date < CURRENT_DATE - INTERVAL '%s days'
        """, (days_to_keep,))
        return cursor.rowcount
