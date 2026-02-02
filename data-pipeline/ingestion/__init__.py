# Ingestion module - Data fetching from external sources
"""
Data ingestion components for the Resource Capital pipeline.

Key modules:
- news_client: Mining news RSS aggregation (DataLynx, Mining.com, etc.)
- metal_prices: Commodity price fetching (yfinance)
- financials: Company financial data
- sedar_scraper: SEDAR+ filings scraper
- pdf_extractor: PDF parsing utilities
"""

from .metal_prices import fetch_all_metal_prices, fetch_single_metal, get_current_prices
from .news_client import fetch_mining_news, fetch_tmx_newsfile

__all__ = [
    "fetch_mining_news",
    "fetch_tmx_newsfile",
    "fetch_all_metal_prices",
    "fetch_single_metal",
    "get_current_prices",
]
