"""
News Domain Module for Resource Capital

Database operations for news articles and press releases.
Extracted from db_manager.py for better code organization.

Usage:
    from processing.news import (
        insert_news,
        get_recent_news,
        get_news_by_ticker,
    )
"""

import logging
from typing import Dict, List, Optional

from .db_manager import get_cursor

logger = logging.getLogger(__name__)


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
    """
    Insert news article.

    Args:
        title: Article title
        url: Article URL
        description: Article summary/description
        source: Source name (e.g., "TMX Newsfile", "Mining.com")
        published_at: Publication timestamp
        ticker: Related stock ticker
        company_id: Related company ID
        external_id: External identifier for deduplication
        category: Article category
        is_press_release: True if official press release
        image_url: Featured image URL

    Returns:
        Article ID or None if duplicate
    """
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
    """
    Get recent news articles.

    Args:
        limit: Maximum articles to return

    Returns:
        List of news article dictionaries
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT * FROM news
            ORDER BY published_at DESC NULLS LAST
            LIMIT %s
        """, (limit,))
        return cursor.fetchall()


def get_news_by_id(news_id: int) -> Optional[Dict]:
    """
    Get news article by ID.

    Args:
        news_id: Article database ID

    Returns:
        Article dictionary or None if not found
    """
    with get_cursor() as cursor:
        cursor.execute("SELECT * FROM news WHERE id = %s", (news_id,))
        return cursor.fetchone()


def get_news_by_ticker(ticker: str, limit: int = 20) -> List[Dict]:
    """
    Get news for a specific company ticker.

    Args:
        ticker: Stock ticker symbol
        limit: Maximum articles to return

    Returns:
        List of news article dictionaries
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT * FROM news
            WHERE ticker = %s
            ORDER BY published_at DESC NULLS LAST
            LIMIT %s
        """, (ticker.upper(), limit))
        return cursor.fetchall()


def get_news_by_company(company_id: int, limit: int = 20) -> List[Dict]:
    """
    Get news for a specific company ID.

    Args:
        company_id: Company database ID
        limit: Maximum articles to return

    Returns:
        List of news article dictionaries
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT * FROM news
            WHERE company_id = %s
            ORDER BY published_at DESC NULLS LAST
            LIMIT %s
        """, (company_id, limit))
        return cursor.fetchall()


def get_news_by_source(source: str, limit: int = 50) -> List[Dict]:
    """
    Get news from a specific source.

    Args:
        source: Source name
        limit: Maximum articles to return

    Returns:
        List of news article dictionaries
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT * FROM news
            WHERE source ILIKE %s
            ORDER BY published_at DESC NULLS LAST
            LIMIT %s
        """, (source, limit))
        return cursor.fetchall()


def get_press_releases(limit: int = 50) -> List[Dict]:
    """
    Get official press releases.

    Args:
        limit: Maximum articles to return

    Returns:
        List of press release dictionaries
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT * FROM news
            WHERE is_press_release = true
            ORDER BY published_at DESC NULLS LAST
            LIMIT %s
        """, (limit,))
        return cursor.fetchall()


def search_news(query: str, limit: int = 50) -> List[Dict]:
    """
    Search news by title or description.

    Args:
        query: Search query string
        limit: Maximum articles to return

    Returns:
        List of matching news article dictionaries
    """
    with get_cursor() as cursor:
        search_pattern = f"%{query}%"
        cursor.execute("""
            SELECT * FROM news
            WHERE title ILIKE %s OR description ILIKE %s
            ORDER BY published_at DESC NULLS LAST
            LIMIT %s
        """, (search_pattern, search_pattern, limit))
        return cursor.fetchall()


def get_news_by_date_range(
    start_date: str,
    end_date: str,
    limit: int = 100
) -> List[Dict]:
    """
    Get news within a date range.

    Args:
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
        limit: Maximum articles to return

    Returns:
        List of news article dictionaries
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT * FROM news
            WHERE published_at::date BETWEEN %s AND %s
            ORDER BY published_at DESC
            LIMIT %s
        """, (start_date, end_date, limit))
        return cursor.fetchall()


def get_news_count() -> int:
    """
    Get total number of news articles.

    Returns:
        Article count
    """
    with get_cursor() as cursor:
        cursor.execute("SELECT COUNT(*) as count FROM news")
        return cursor.fetchone()['count']


def get_news_sources() -> List[Dict]:
    """
    Get list of unique news sources with counts.

    Returns:
        List of dictionaries with source name and count
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT source, COUNT(*) as count
            FROM news
            WHERE source IS NOT NULL
            GROUP BY source
            ORDER BY count DESC
        """)
        return cursor.fetchall()


def delete_old_news(days_to_keep: int = 90) -> int:
    """
    Delete news articles older than specified days.

    Args:
        days_to_keep: Number of days of news to retain

    Returns:
        Number of articles deleted
    """
    with get_cursor() as cursor:
        cursor.execute("""
            DELETE FROM news
            WHERE published_at < CURRENT_TIMESTAMP - INTERVAL '%s days'
        """, (days_to_keep,))
        return cursor.rowcount


def mark_news_as_read(news_id: int) -> bool:
    """
    Mark a news article as read (for user tracking).

    Args:
        news_id: Article database ID

    Returns:
        True if article was found
    """
    # Note: This would need a user_news_reads table in production
    # For now, just verify the article exists
    with get_cursor() as cursor:
        cursor.execute("SELECT id FROM news WHERE id = %s", (news_id,))
        return cursor.fetchone() is not None
