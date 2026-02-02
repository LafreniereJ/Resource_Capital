"""
Supabase/PostgreSQL Database Manager for Resource Capital

This replaces the SQLite-based db_manager.py with PostgreSQL via Supabase.
API surface is identical for easy migration.

Setup:
1. pip install psycopg2-binary python-dotenv
2. Add SUPABASE_DB_URL to .env
3. Rename this file to db_manager.py (backup the old one first)
"""

import logging
import os
import time
from contextlib import contextmanager
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Try to import psycopg2
try:
    from psycopg2 import pool
    from psycopg2.extras import RealDictCursor, execute_values
except ImportError:
    raise ImportError("psycopg2 not installed. Run: pip install psycopg2-binary")

logger = logging.getLogger(__name__)

# Database connection pool
_connection_pool: Optional[pool.ThreadedConnectionPool] = None

SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL")

# Query timing configuration
SLOW_QUERY_THRESHOLD_MS = float(os.getenv("SLOW_QUERY_THRESHOLD_MS", "500"))
ENABLE_QUERY_LOGGING = os.getenv("ENABLE_QUERY_LOGGING", "false").lower() == "true"

# Connection pool configuration
# Supabase free tier: 60 connections max (shared across all clients)
# Recommended: Keep pool small to avoid exhausting connections
DB_POOL_MIN_CONN = int(os.getenv("DB_POOL_MIN_CONN", "1"))
DB_POOL_MAX_CONN = int(os.getenv("DB_POOL_MAX_CONN", "5"))


def get_connection_pool() -> pool.ThreadedConnectionPool:
    """
    Get or create database connection pool.

    Pool Configuration (via env vars):
        DB_POOL_MIN_CONN: Minimum connections to maintain (default: 1)
        DB_POOL_MAX_CONN: Maximum connections allowed (default: 5)

    Note: Supabase free tier has 60 connection limit shared across all clients.
    Keep the pool small to avoid connection exhaustion.
    """
    global _connection_pool

    if _connection_pool is None:
        if not SUPABASE_DB_URL:
            raise ValueError(
                "SUPABASE_DB_URL not set. Get it from: "
                "Supabase Dashboard > Settings > Database > Connection string"
            )

        _connection_pool = pool.ThreadedConnectionPool(
            minconn=DB_POOL_MIN_CONN,
            maxconn=DB_POOL_MAX_CONN,
            dsn=SUPABASE_DB_URL
        )
        logger.info(
            f"Database connection pool created (min={DB_POOL_MIN_CONN}, max={DB_POOL_MAX_CONN})"
        )

    return _connection_pool


def get_pool_status() -> Dict[str, Any]:
    """
    Get connection pool status for health checks.

    Returns:
        Dictionary with pool metrics
    """
    if _connection_pool is None:
        return {"status": "not_initialized", "active": 0, "available": 0}

    # ThreadedConnectionPool doesn't expose detailed metrics, but we can check if it's alive
    try:
        with get_cursor(timed=False) as cursor:
            cursor.execute("SELECT 1")
        return {
            "status": "healthy",
            "min_connections": DB_POOL_MIN_CONN,
            "max_connections": DB_POOL_MAX_CONN,
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "min_connections": DB_POOL_MIN_CONN,
            "max_connections": DB_POOL_MAX_CONN,
        }


@contextmanager
def get_connection():
    """Context manager for database connections"""
    conn_pool = get_connection_pool()
    conn = conn_pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn_pool.putconn(conn)


class TimedCursor:
    """Wrapper around psycopg2 cursor that logs query execution time."""

    def __init__(self, cursor, log_all: bool = False):
        self._cursor = cursor
        self._log_all = log_all

    def execute(self, query: str, params: tuple = None):
        start_time = time.perf_counter()
        try:
            result = self._cursor.execute(query, params)
            return result
        finally:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            self._log_query(query, params, elapsed_ms)

    def _log_query(self, query: str, params: tuple, elapsed_ms: float):
        # Truncate query for logging
        query_preview = query[:200].replace('\n', ' ').strip()
        if len(query) > 200:
            query_preview += "..."

        if elapsed_ms >= SLOW_QUERY_THRESHOLD_MS:
            logger.warning(
                f"Slow query ({elapsed_ms:.1f}ms): {query_preview}",
                extra={"query_time_ms": elapsed_ms, "slow_query": True}
            )
        elif self._log_all or ENABLE_QUERY_LOGGING:
            logger.debug(
                f"Query ({elapsed_ms:.1f}ms): {query_preview}",
                extra={"query_time_ms": elapsed_ms}
            )

    def fetchone(self):
        return self._cursor.fetchone()

    def fetchall(self):
        return self._cursor.fetchall()

    def fetchmany(self, size=None):
        return self._cursor.fetchmany(size)

    @property
    def rowcount(self):
        return self._cursor.rowcount

    @property
    def description(self):
        return self._cursor.description

    def close(self):
        return self._cursor.close()

    def __iter__(self):
        return iter(self._cursor)


@contextmanager
def get_cursor(dict_cursor: bool = True, timed: bool = True):
    """
    Context manager for database cursor.

    Args:
        dict_cursor: If True, returns rows as dictionaries (default: True)
        timed: If True, wraps cursor with query timing (default: True)

    Yields:
        Database cursor (optionally wrapped with TimedCursor)
    """
    with get_connection() as conn:
        cursor_factory = RealDictCursor if dict_cursor else None
        cursor = conn.cursor(cursor_factory=cursor_factory)
        try:
            if timed:
                yield TimedCursor(cursor)
            else:
                yield cursor
        finally:
            cursor.close()


def init_db():
    """Initialize database - for PostgreSQL, just verify connection"""
    try:
        with get_cursor() as cursor:
            cursor.execute("SELECT 1")
            logger.info("Database connection verified")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise


# =============================================================================
# COMPANY FUNCTIONS
# =============================================================================

def get_or_create_company(
    ticker: str,
    name: str,
    exchange: str = "TSX",
    website: str = None,
    commodity: str = None
) -> int:
    """Get existing company or create new one, returns company ID"""
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
    """Update company price data"""
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
    """Get all companies"""
    with get_cursor() as cursor:
        cursor.execute("SELECT * FROM companies ORDER BY market_cap DESC NULLS LAST")
        return cursor.fetchall()


def get_company_by_ticker(ticker: str) -> Optional[Dict]:
    """Get company by ticker"""
    with get_cursor() as cursor:
        cursor.execute("SELECT * FROM companies WHERE ticker = %s", (ticker.upper(),))
        return cursor.fetchone()


# =============================================================================
# PROJECT FUNCTIONS
# =============================================================================

def get_or_create_project(
    company_id: int,
    name: str,
    location: str = None,
    latitude: float = None,
    longitude: float = None,
    stage: str = None,
    commodity: str = None,
    ownership_percentage: float = 100.0
) -> int:
    """Get existing project or create new one"""
    with get_cursor() as cursor:
        # Try to get existing
        cursor.execute(
            "SELECT id FROM projects WHERE company_id = %s AND name = %s",
            (company_id, name)
        )
        result = cursor.fetchone()

        if result:
            return result['id']

        # Create new
        cursor.execute("""
            INSERT INTO projects
                (company_id, name, location, latitude, longitude, stage, commodity, ownership_percentage)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (company_id, name, location, latitude, longitude, stage, commodity, ownership_percentage))

        return cursor.fetchone()['id']


def get_projects_by_company(company_id: int) -> List[Dict]:
    """Get all projects for a company"""
    with get_cursor() as cursor:
        cursor.execute(
            "SELECT * FROM projects WHERE company_id = %s ORDER BY name",
            (company_id,)
        )
        return cursor.fetchall()


# =============================================================================
# PRICE HISTORY FUNCTIONS
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
    """Insert or update price history record"""
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
    """Batch insert price history records
    records: list of (company_id, date, open, high, low, close, volume)
    """
    if not records:
        return 0

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


# =============================================================================
# METAL PRICES FUNCTIONS
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
    """Update or insert metal price"""
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
    """Get current metal prices"""
    with get_cursor() as cursor:
        cursor.execute("SELECT * FROM metal_prices ORDER BY commodity")
        return cursor.fetchall()


# =============================================================================
# NEWS FUNCTIONS
# =============================================================================

def insert_news(
    title: str,
    url: str,
    description: str = None,
    source: str = None,
    published_at: str = None,
    ticker: str = None,
    company_id: int = None,
    external_id: str = None,
    category: str = None,
    is_press_release: bool = False,
    image_url: str = None
) -> Optional[int]:
    """Insert news article, returns ID or None if duplicate"""
    with get_cursor() as cursor:
        try:
            cursor.execute("""
                INSERT INTO news
                    (title, url, description, source, published_at, ticker, company_id,
                     external_id, category, is_press_release, image_url)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (external_id) DO NOTHING
                RETURNING id
            """, (
                title, url, description, source, published_at,
                ticker.upper() if ticker else None, company_id,
                external_id, category, is_press_release, image_url
            ))

            result = cursor.fetchone()
            return result['id'] if result else None

        except Exception as e:
            logger.warning(f"Failed to insert news: {e}")
            return None


def get_recent_news(limit: int = 50) -> List[Dict]:
    """Get recent news articles"""
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT * FROM news
            ORDER BY published_at DESC NULLS LAST
            LIMIT %s
        """, (limit,))
        return cursor.fetchall()


# =============================================================================
# EARNINGS FUNCTIONS
# =============================================================================

def insert_earnings(
    company_id: int,
    period: str,
    period_end: str = None,
    ticker: str = None,
    mine_name: str = 'Consolidated',
    gold_oz: float = None,
    silver_oz: float = None,
    copper_lbs: float = None,
    gold_equivalent_oz: float = None,
    ore_processed_tonnes: float = None,
    head_grade: float = None,
    recovery_rate: float = None,
    aisc_per_oz: float = None,
    cash_cost_per_oz: float = None,
    source_url: str = None,
    extraction_method: str = None,
    confidence: float = None
) -> Optional[int]:
    """Insert earnings record"""
    with get_cursor() as cursor:
        cursor.execute("""
            INSERT INTO earnings
                (company_id, ticker, period, period_end, mine_name,
                 gold_oz, silver_oz, copper_lbs, gold_equivalent_oz,
                 ore_processed_tonnes, head_grade, recovery_rate,
                 aisc_per_oz, cash_cost_per_oz, source_url,
                 extraction_method, confidence)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (company_id, period, mine_name) DO UPDATE SET
                gold_oz = COALESCE(EXCLUDED.gold_oz, earnings.gold_oz),
                silver_oz = COALESCE(EXCLUDED.silver_oz, earnings.silver_oz),
                copper_lbs = COALESCE(EXCLUDED.copper_lbs, earnings.copper_lbs),
                aisc_per_oz = COALESCE(EXCLUDED.aisc_per_oz, earnings.aisc_per_oz)
            RETURNING id
        """, (
            company_id, ticker, period, period_end, mine_name,
            gold_oz, silver_oz, copper_lbs, gold_equivalent_oz,
            ore_processed_tonnes, head_grade, recovery_rate,
            aisc_per_oz, cash_cost_per_oz, source_url,
            extraction_method, confidence
        ))

        result = cursor.fetchone()
        return result['id'] if result else None


# =============================================================================
# FINANCIALS FUNCTIONS
# =============================================================================

def insert_financials(
    company_id: int,
    statement_type: str,
    period_type: str,
    period_end: str,
    currency: str = 'CAD',
    **financial_data
) -> Optional[int]:
    """Insert financial statement data"""
    valid_columns = [
        'total_revenue', 'cost_of_revenue', 'gross_profit', 'operating_expenses',
        'operating_income', 'net_income', 'ebitda', 'eps_basic', 'eps_diluted',
        'total_assets', 'total_liabilities', 'total_equity', 'cash_and_equivalents',
        'total_debt', 'current_assets', 'current_liabilities',
        'operating_cash_flow', 'investing_cash_flow', 'financing_cash_flow',
        'free_cash_flow', 'capital_expenditures',
        'production_oz', 'aisc_per_oz', 'cash_cost_per_oz', 'reserves_oz', 'resources_oz'
    ]

    # Filter to valid columns only
    data = {k: v for k, v in financial_data.items() if k in valid_columns and v is not None}

    if not data:
        return None

    columns = ['company_id', 'statement_type', 'period_type', 'period_end', 'currency'] + list(data.keys())
    values = [company_id, statement_type, period_type, period_end, currency] + list(data.values())

    placeholders = ', '.join(['%s'] * len(values))
    columns_str = ', '.join(columns)

    # Build update clause for upsert
    update_cols = [f"{c} = EXCLUDED.{c}" for c in data.keys()]
    update_str = ', '.join(update_cols)

    with get_cursor() as cursor:
        cursor.execute(f"""
            INSERT INTO financials ({columns_str})
            VALUES ({placeholders})
            ON CONFLICT (company_id, statement_type, period_type, period_end) DO UPDATE SET
                {update_str}
            RETURNING id
        """, values)

        result = cursor.fetchone()
        return result['id'] if result else None


# =============================================================================
# INSIDER TRANSACTIONS
# =============================================================================

def insert_insider_transaction(
    company_id: int,
    insider_name: str,
    transaction_type: str,
    transaction_date: str,
    ticker: str = None,
    insider_role: str = None,
    shares: int = None,
    price_per_share: float = None,
    total_value: float = None,
    shares_held_after: int = None,
    source_url: str = None
) -> Optional[int]:
    """Insert insider transaction"""
    with get_cursor() as cursor:
        cursor.execute("""
            INSERT INTO insider_transactions
                (company_id, ticker, insider_name, insider_role, transaction_type,
                 transaction_date, shares, price_per_share, total_value, shares_held_after, source_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (company_id, insider_name, transaction_date, transaction_type, shares)
            DO NOTHING
            RETURNING id
        """, (
            company_id, ticker, insider_name, insider_role, transaction_type,
            transaction_date, shares, price_per_share, total_value, shares_held_after, source_url
        ))

        result = cursor.fetchone()
        return result['id'] if result else None


# =============================================================================
# RESERVES & RESOURCES
# =============================================================================

def insert_reserves_resources(
    project_id: int,
    report_date: str,
    category: str,
    is_reserve: bool = False,
    deposit_name: str = 'Main',
    tonnes: float = None,
    grade: float = None,
    grade_unit: str = None,
    contained_metal: float = None,
    contained_metal_unit: str = None,
    **kwargs
) -> Optional[int]:
    """Insert reserves/resources record"""
    with get_cursor() as cursor:
        cursor.execute("""
            INSERT INTO reserves_resources
                (project_id, report_date, category, is_reserve, deposit_name,
                 tonnes, grade, grade_unit, contained_metal, contained_metal_unit)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (project_id, report_date, category, deposit_name) DO UPDATE SET
                tonnes = COALESCE(EXCLUDED.tonnes, reserves_resources.tonnes),
                grade = COALESCE(EXCLUDED.grade, reserves_resources.grade),
                contained_metal = COALESCE(EXCLUDED.contained_metal, reserves_resources.contained_metal)
            RETURNING id
        """, (
            project_id, report_date, category, is_reserve, deposit_name,
            tonnes, grade, grade_unit, contained_metal, contained_metal_unit
        ))

        result = cursor.fetchone()
        return result['id'] if result else None


# =============================================================================
# MINE PRODUCTION
# =============================================================================

def insert_mine_production(
    project_id: int,
    period_end: str,
    period_type: str = 'quarterly',
    **production_data
) -> Optional[int]:
    """Insert mine production record"""
    valid_columns = [
        'ore_mined_tonnes', 'ore_processed_tonnes', 'throughput_tpd',
        'head_grade', 'head_grade_unit', 'recovery_rate',
        'gold_produced_oz', 'silver_produced_oz', 'copper_produced_lbs',
        'nickel_produced_lbs', 'uranium_produced_lbs',
        'platinum_produced_oz', 'palladium_produced_oz',
        'gold_equivalent_oz', 'copper_equivalent_lbs',
        'aisc_per_oz', 'cash_cost_per_oz', 'aisc_per_lb', 'cash_cost_per_lb',
        'mining_cost_per_tonne', 'processing_cost_per_tonne',
        'source_url', 'source_type', 'source_priority', 'confidence_score'
    ]

    data = {k: v for k, v in production_data.items() if k in valid_columns and v is not None}

    columns = ['project_id', 'period_end', 'period_type'] + list(data.keys())
    values = [project_id, period_end, period_type] + list(data.values())

    placeholders = ', '.join(['%s'] * len(values))
    columns_str = ', '.join(columns)

    update_cols = [f"{c} = EXCLUDED.{c}" for c in data.keys()]
    update_str = ', '.join(update_cols) if update_cols else "project_id = EXCLUDED.project_id"

    with get_cursor() as cursor:
        cursor.execute(f"""
            INSERT INTO mine_production ({columns_str})
            VALUES ({placeholders})
            ON CONFLICT (project_id, period_type, period_end) DO UPDATE SET
                {update_str}
            RETURNING id
        """, values)

        result = cursor.fetchone()
        return result['id'] if result else None


# =============================================================================
# REPORTS
# =============================================================================

def insert_report(
    title: str,
    filename: str,
    file_path: str,
    ticker: str = None,
    file_size: int = None
) -> int:
    """Insert a report record"""
    with get_cursor() as cursor:
        cursor.execute("""
            INSERT INTO reports (title, ticker, filename, file_path, file_size)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (title, ticker.upper() if ticker else None, filename, file_path, file_size))

        return cursor.fetchone()['id']


def get_reports(ticker: str = None) -> List[Dict]:
    """Get reports, optionally filtered by ticker"""
    with get_cursor() as cursor:
        if ticker:
            cursor.execute(
                "SELECT * FROM reports WHERE ticker = %s ORDER BY created_at DESC",
                (ticker.upper(),)
            )
        else:
            cursor.execute("SELECT * FROM reports ORDER BY created_at DESC")

        return cursor.fetchall()


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def execute_raw(query: str, params: tuple = None) -> List[Dict]:
    """Execute raw SQL query"""
    with get_cursor() as cursor:
        cursor.execute(query, params)
        return cursor.fetchall()


def bulk_upsert_news(articles: List[Dict]) -> int:
    """
    Bulk insert/update news articles.

    Args:
        articles: List of article dictionaries from news_client
            Expected fields: id, title, description, url, source, published_at,
                           symbols, image, category, is_press_release, ticker

    Returns:
        Number of articles inserted/updated
    """
    if not articles:
        return 0

    count = 0
    for article in articles:
        try:
            # Map fields from news_client format to database format
            # news_client uses 'image', database uses 'image_url'
            # news_client uses 'symbols' array, we take first as ticker
            ticker = article.get('ticker')
            if not ticker and article.get('symbols'):
                symbols = article.get('symbols', [])
                ticker = symbols[0] if symbols else None

            result = insert_news(
                title=article.get('title', ''),
                url=article.get('url', ''),
                description=article.get('description'),
                source=article.get('source'),
                published_at=article.get('published_at'),
                ticker=ticker,
                external_id=article.get('id') or article.get('url'),  # Use URL as fallback ID
                category=article.get('category'),
                is_press_release=article.get('is_press_release', False),
                image_url=article.get('image')  # Map 'image' to 'image_url'
            )
            if result:
                count += 1
        except Exception as e:
            logger.warning(f"Failed to insert article '{article.get('title', '')[:50]}': {e}")
            continue

    return count


def cleanup_old_news(days: int = 30) -> int:
    """
    Delete news articles older than specified days.

    Args:
        days: Number of days to keep (default: 30)

    Returns:
        Number of articles deleted
    """
    with get_cursor() as cursor:
        cursor.execute("""
            DELETE FROM news
            WHERE published_at < NOW() - INTERVAL '%s days'
            OR (published_at IS NULL AND fetched_at < NOW() - INTERVAL '%s days')
        """, (days, days))

        return cursor.rowcount


def get_news_stats() -> Dict[str, Any]:
    """
    Get statistics about the news table.

    Returns:
        Dictionary with total count, press release count, date range, and counts by source
    """
    with get_cursor() as cursor:
        # Total count
        cursor.execute("SELECT COUNT(*) as count FROM news")
        total = cursor.fetchone()['count']

        # Press release count
        cursor.execute("SELECT COUNT(*) as count FROM news WHERE is_press_release = true")
        press_releases = cursor.fetchone()['count']

        # Date range
        cursor.execute("""
            SELECT
                MIN(published_at)::text as oldest,
                MAX(published_at)::text as newest
            FROM news
        """)
        date_range = cursor.fetchone()

        # By source
        cursor.execute("""
            SELECT source, COUNT(*) as count
            FROM news
            GROUP BY source
            ORDER BY count DESC
        """)
        by_source = cursor.fetchall()

        return {
            'total': total,
            'press_releases': press_releases,
            'oldest': date_range['oldest'],
            'newest': date_range['newest'],
            'by_source': [dict(row) for row in by_source]
        }


def close_pool():
    """Close the connection pool"""
    global _connection_pool
    if _connection_pool:
        _connection_pool.closeall()
        _connection_pool = None
        logger.info("Database connection pool closed")
