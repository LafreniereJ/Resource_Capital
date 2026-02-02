"""
Company Domain Module for Resource Capital

Database operations for company entities.
Extracted from db_manager.py for better code organization.

Usage:
    from processing.companies import (
        get_or_create_company,
        update_company_price,
        get_all_companies,
        get_company_by_ticker,
    )
"""

from typing import Dict, List, Optional

from .db_manager import get_cursor


def get_or_create_company(
    ticker: str,
    name: str,
    exchange: str = "TSX",
    website: str = None,
    commodity: str = None
) -> int:
    """
    Get existing company or create new one.

    Args:
        ticker: Stock ticker symbol (e.g., "ABX")
        name: Company name
        exchange: Stock exchange (default: "TSX")
        website: Company website URL
        commodity: Primary commodity (e.g., "Gold", "Copper")

    Returns:
        Company ID
    """
    with get_cursor() as cursor:
        # Try to get existing
        cursor.execute(
            "SELECT id FROM companies WHERE ticker = %s",
            (ticker.upper(),)
        )
        result = cursor.fetchone()

        if result:
            return result['id']

        # Create new
        cursor.execute("""
            INSERT INTO companies (ticker, name, exchange, website, commodity)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (ticker.upper(), name, exchange, website, commodity))

        return cursor.fetchone()['id']


def upsert_company(
    ticker: str,
    name: str,
    exchange: str = "TSX",
    website: str = None,
    commodity: str = None
) -> int:
    """
    Insert or update a company record.

    Args:
        ticker: Stock ticker symbol
        name: Company name
        exchange: Stock exchange
        website: Company website URL
        commodity: Primary commodity

    Returns:
        Company ID
    """
    with get_cursor() as cursor:
        cursor.execute("""
            INSERT INTO companies (ticker, name, exchange, website, commodity)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (ticker) DO UPDATE SET
                name = EXCLUDED.name,
                exchange = EXCLUDED.exchange,
                website = COALESCE(EXCLUDED.website, companies.website),
                commodity = COALESCE(EXCLUDED.commodity, companies.commodity)
            RETURNING id
        """, (ticker.upper(), name, exchange, website, commodity))

        return cursor.fetchone()['id']


def update_company_price(
    ticker: str,
    current_price: float = None,
    prev_close: float = None,
    day_change: float = None,
    day_change_percent: float = None,
    day_open: float = None,
    day_high: float = None,
    day_low: float = None,
    day_volume: int = None,
    market_cap: float = None,
    high_52w: float = None,
    low_52w: float = None,
    avg_volume: int = None,
    currency: str = 'CAD'
) -> bool:
    """
    Update company price data.

    Args:
        ticker: Stock ticker symbol
        current_price: Current stock price
        prev_close: Previous day's closing price
        day_change: Absolute change from previous close
        day_change_percent: Percentage change from previous close
        day_open: Today's opening price
        day_high: Today's high price
        day_low: Today's low price
        day_volume: Today's trading volume
        market_cap: Market capitalization
        high_52w: 52-week high
        low_52w: 52-week low
        avg_volume: Average daily volume
        currency: Currency code (default: "CAD")

    Returns:
        True if company was found and updated
    """
    with get_cursor() as cursor:
        cursor.execute("""
            UPDATE companies SET
                current_price = COALESCE(%s, current_price),
                prev_close = COALESCE(%s, prev_close),
                day_change = COALESCE(%s, day_change),
                day_change_percent = COALESCE(%s, day_change_percent),
                day_open = COALESCE(%s, day_open),
                day_high = COALESCE(%s, day_high),
                day_low = COALESCE(%s, day_low),
                day_volume = COALESCE(%s, day_volume),
                market_cap = COALESCE(%s, market_cap),
                high_52w = COALESCE(%s, high_52w),
                low_52w = COALESCE(%s, low_52w),
                avg_volume = COALESCE(%s, avg_volume),
                currency = COALESCE(%s, currency),
                last_updated = NOW()
            WHERE ticker = %s
        """, (
            current_price, prev_close, day_change, day_change_percent,
            day_open, day_high, day_low, day_volume,
            market_cap, high_52w, low_52w, avg_volume, currency,
            ticker.upper()
        ))

        return cursor.rowcount > 0


def get_all_companies() -> List[Dict]:
    """
    Get all companies ordered by market cap.

    Returns:
        List of company dictionaries
    """
    with get_cursor() as cursor:
        cursor.execute("SELECT * FROM companies ORDER BY market_cap DESC NULLS LAST")
        return cursor.fetchall()


def get_company_by_ticker(ticker: str) -> Optional[Dict]:
    """
    Get company by ticker symbol.

    Args:
        ticker: Stock ticker symbol

    Returns:
        Company dictionary or None if not found
    """
    with get_cursor() as cursor:
        cursor.execute("SELECT * FROM companies WHERE ticker = %s", (ticker.upper(),))
        return cursor.fetchone()


def get_company_by_id(company_id: int) -> Optional[Dict]:
    """
    Get company by ID.

    Args:
        company_id: Company database ID

    Returns:
        Company dictionary or None if not found
    """
    with get_cursor() as cursor:
        cursor.execute("SELECT * FROM companies WHERE id = %s", (company_id,))
        return cursor.fetchone()


def search_companies(query: str, limit: int = 20) -> List[Dict]:
    """
    Search companies by ticker or name.

    Args:
        query: Search query string
        limit: Maximum results to return

    Returns:
        List of matching company dictionaries
    """
    with get_cursor() as cursor:
        search_pattern = f"%{query}%"
        cursor.execute("""
            SELECT * FROM companies
            WHERE ticker ILIKE %s OR name ILIKE %s
            ORDER BY
                CASE WHEN ticker ILIKE %s THEN 0 ELSE 1 END,
                market_cap DESC NULLS LAST
            LIMIT %s
        """, (search_pattern, search_pattern, query, limit))
        return cursor.fetchall()


def get_companies_by_commodity(commodity: str) -> List[Dict]:
    """
    Get companies by primary commodity.

    Args:
        commodity: Commodity name (e.g., "Gold", "Copper")

    Returns:
        List of company dictionaries
    """
    with get_cursor() as cursor:
        cursor.execute(
            "SELECT * FROM companies WHERE commodity ILIKE %s ORDER BY market_cap DESC NULLS LAST",
            (commodity,)
        )
        return cursor.fetchall()


def get_companies_by_exchange(exchange: str) -> List[Dict]:
    """
    Get companies by stock exchange.

    Args:
        exchange: Exchange code (e.g., "TSX", "TSXV")

    Returns:
        List of company dictionaries
    """
    with get_cursor() as cursor:
        cursor.execute(
            "SELECT * FROM companies WHERE exchange = %s ORDER BY market_cap DESC NULLS LAST",
            (exchange.upper(),)
        )
        return cursor.fetchall()


def get_company_count() -> int:
    """
    Get total number of companies.

    Returns:
        Company count
    """
    with get_cursor() as cursor:
        cursor.execute("SELECT COUNT(*) as count FROM companies")
        return cursor.fetchone()['count']
