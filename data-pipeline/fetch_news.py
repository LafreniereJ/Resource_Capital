#!/usr/bin/env python3
"""
News Fetcher - Cron Job Script
Fetches mining news from all sources and stores in database.

Run every 15 minutes via cron:
*/15 * * * * cd /path/to/data-pipeline && ./venv/bin/python fetch_news.py >> logs/news_fetch.log 2>&1
"""

import os
import sys
import logging
from datetime import datetime

# Add directories to path
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'processing'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ingestion'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from db_manager import bulk_upsert_news, cleanup_old_news, get_news_stats
from news_client import fetch_tmx_newsfile, fetch_tmx_for_tracked_companies, fetch_canadian_mining_news, fetch_newsapi_mining_news

# Setup logging
LOG_DIR = os.path.join(os.path.dirname(__file__), 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(LOG_DIR, 'news_fetch.log'))
    ]
)

logger = logging.getLogger(__name__)


def fetch_and_store_news():
    """Fetch news from all sources and store in database."""
    logger.info("=" * 60)
    logger.info(f"Starting news fetch at {datetime.now().isoformat()}")

    total_stored = 0

    # 1. TMX Newsfile DataLynx - Official TSX/TSXV/CSE press releases (PRIMARY)
    # First fetch news specifically for companies we track
    try:
        logger.info("Fetching TMX DataLynx for tracked companies...")
        tracked_articles = fetch_tmx_for_tracked_companies(limit=100)
        
        count = bulk_upsert_news(tracked_articles)
        logger.info(f"  Stored {count} articles for tracked companies from TMX DataLynx")
        total_stored += count
    except Exception as e:
        logger.error(f"Error fetching TMX for tracked companies: {e}")
    
    # Also fetch recent general releases (may include companies not yet in our database)
    try:
        logger.info("Fetching all recent TMX DataLynx releases...")
        all_tmx_articles = fetch_tmx_newsfile(limit=50, filter_tracked_only=False)
        
        count = bulk_upsert_news(all_tmx_articles)
        logger.info(f"  Stored {count} additional articles from TMX DataLynx")
        total_stored += count
    except Exception as e:
        logger.error(f"Error fetching TMX Newsfile: {e}")

    # 2. Canadian Mining News (GlobeNewswire, PR Newswire, Mining.com, etc.)
    try:
        logger.info("Fetching Canadian mining news sources...")
        canadian_articles = fetch_canadian_mining_news(limit=100)
        count = bulk_upsert_news(canadian_articles)
        logger.info(f"  Stored {count} articles from Canadian sources")
        total_stored += count
    except Exception as e:
        logger.error(f"Error fetching Canadian mining news: {e}")

    # 3. NewsAPI (if configured)
    try:
        logger.info("Fetching from NewsAPI...")
        newsapi_articles = fetch_newsapi_mining_news(limit=30)
        if newsapi_articles:
            count = bulk_upsert_news(newsapi_articles)
            logger.info(f"  Stored {count} articles from NewsAPI")
            total_stored += count
        else:
            logger.info("  NewsAPI not configured or no results")
    except Exception as e:
        logger.error(f"Error fetching NewsAPI: {e}")

    logger.info(f"Total articles stored/updated: {total_stored}")

    # 4. Cleanup old news (older than 30 days)
    try:
        deleted = cleanup_old_news(days=30)
        if deleted > 0:
            logger.info(f"Cleaned up {deleted} old articles (>30 days)")
    except Exception as e:
        logger.error(f"Error cleaning up old news: {e}")

    # 5. Print stats
    try:
        stats = get_news_stats()
        logger.info(f"News database stats: {stats['total']} total, {stats['press_releases']} press releases")
        logger.info(f"Date range: {stats['oldest']} to {stats['newest']}")
    except Exception as e:
        logger.error(f"Error getting stats: {e}")

    logger.info(f"News fetch completed at {datetime.now().isoformat()}")
    logger.info("=" * 60)

    return total_stored


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Fetch mining news and store in database")
    parser.add_argument("--stats", action="store_true", help="Show news stats only")
    parser.add_argument("--cleanup", type=int, help="Cleanup news older than N days")

    args = parser.parse_args()

    if args.stats:
        stats = get_news_stats()
        print(f"\nNews Database Stats:")
        print(f"  Total articles: {stats['total']}")
        print(f"  Press releases: {stats['press_releases']}")
        print(f"  Date range: {stats['oldest']} to {stats['newest']}")
        print(f"\n  By source:")
        for src in stats['by_source']:
            print(f"    {src['source']}: {src['count']}")
    elif args.cleanup:
        deleted = cleanup_old_news(days=args.cleanup)
        print(f"Deleted {deleted} articles older than {args.cleanup} days")
    else:
        fetch_and_store_news()
