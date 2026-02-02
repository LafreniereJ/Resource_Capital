"""
Pytest configuration and fixtures for Resource Capital tests.
"""

import os
import sys
from unittest.mock import MagicMock, patch

import pytest

# Add parent directories to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'processing'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'ingestion'))


@pytest.fixture
def mock_db_connection():
    """Mock database connection for unit tests."""
    with patch('db_manager.get_cursor') as mock_cursor:
        cursor = MagicMock()
        cursor.__enter__ = MagicMock(return_value=cursor)
        cursor.__exit__ = MagicMock(return_value=False)
        cursor.fetchall.return_value = []
        cursor.fetchone.return_value = None
        mock_cursor.return_value = cursor
        yield cursor


@pytest.fixture
def sample_company():
    """Sample company data for testing."""
    return {
        'id': 1,
        'ticker': 'ABX',
        'name': 'Barrick Gold Corporation',
        'exchange': 'TSX',
        'commodity': 'Gold',
        'current_price': 23.45,
        'prev_close': 23.10,
        'day_change': 0.35,
        'day_change_percent': 1.52,
        'market_cap': 42000000000,
        'volume': 5000000,
        'currency': 'CAD',
    }


@pytest.fixture
def sample_metal_price():
    """Sample metal price data for testing."""
    return {
        'commodity': 'gold',
        'symbol': 'GC=F',
        'price': 2024.50,
        'currency': 'USD',
        'change_percent': 0.45,
        'day_high': 2030.00,
        'day_low': 2015.00,
        'prev_close': 2015.40,
        'source': 'yfinance',
    }


@pytest.fixture
def sample_news_article():
    """Sample news article data for testing."""
    return {
        'id': 'https://example.com/article-1',
        'title': 'Barrick Gold Reports Record Q3 Production',
        'description': 'Barrick Gold Corporation announced record gold production of 1.1M oz in Q3 2024.',
        'url': 'https://example.com/article-1',
        'source': 'Mining.com',
        'published_at': '2024-10-15T10:30:00',
        'ticker': 'ABX',
        'symbols': ['ABX'],
    }


@pytest.fixture
def sample_rss_entry():
    """Sample RSS feed entry for testing."""
    entry = MagicMock()
    entry.title = 'Gold Mining Company Announces New Discovery (TSX: ABC)'
    entry.summary = 'Major gold discovery in northern Ontario with high-grade results.'
    entry.link = 'https://example.com/news/123'
    entry.published_parsed = (2024, 10, 15, 10, 30, 0, 0, 0, 0)
    entry.get = lambda key, default='': {
        'title': entry.title,
        'summary': entry.summary,
        'link': entry.link,
        'id': entry.link,
    }.get(key, default)
    return entry


@pytest.fixture
def mock_yfinance_ticker():
    """Mock yfinance Ticker object."""
    with patch('yfinance.Ticker') as mock_ticker:
        ticker_instance = MagicMock()
        ticker_instance.info = {
            'regularMarketPrice': 23.45,
            'previousClose': 23.10,
            'regularMarketOpen': 23.20,
            'dayHigh': 23.80,
            'dayLow': 23.00,
            'regularMarketVolume': 5000000,
            'marketCap': 42000000000,
            'fiftyTwoWeekHigh': 28.50,
            'fiftyTwoWeekLow': 18.20,
            'averageVolume': 4500000,
        }
        mock_ticker.return_value = ticker_instance
        yield mock_ticker
