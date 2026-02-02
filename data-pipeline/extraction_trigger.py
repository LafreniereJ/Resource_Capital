#!/usr/bin/env python3
"""
Extraction Trigger System - News-based Trigger for Earnings & Technical Reports

Scans recent news articles for keywords that indicate:
- Production/earnings reports (quarterly results, AISC, gold production)
- Technical reports (NI 43-101, feasibility studies, resource estimates)

When matches are found, adds jobs to the extraction queue for processing.

Run every 30 minutes via cron:
*/30 * * * * cd /path/to/data-pipeline && ./venv/bin/python extraction_trigger.py >> logs/extraction_trigger.log 2>&1
"""

import os
import sys
import re
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional

# Add directories to path
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'processing'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ingestion'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from config import EARNINGS_KEYWORDS, TECHNICAL_KEYWORDS, TICKER_PATTERNS
from db_manager import (
    get_connection,
    add_to_extraction_queue,
    get_extraction_queue_stats,
    get_company
)

# Setup logging
LOG_DIR = os.path.join(os.path.dirname(__file__), 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(LOG_DIR, 'extraction_trigger.log'))
    ]
)

logger = logging.getLogger(__name__)


# =============================================================================
# EXTRACTION FUNCTIONS
# =============================================================================

def extract_tickers_from_text(text: str) -> List[str]:
    """Extract ticker symbols from text using common patterns."""
    tickers = []
    for pattern in TICKER_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        tickers.extend([m.upper() for m in matches])
    return list(set(tickers))


def classify_news_article(title: str, description: str = "") -> Tuple[Optional[str], List[str]]:
    """
    Classify a news article as earnings, technical_report, or None.
    Returns (extraction_type, matched_keywords).
    """
    text = (title + " " + (description or "")).lower()

    # Check for earnings keywords
    earnings_matches = [kw for kw in EARNINGS_KEYWORDS if kw in text]

    # Check for technical report keywords
    technical_matches = [kw for kw in TECHNICAL_KEYWORDS if kw in text]

    # Prioritize technical reports if both match (more specific)
    if technical_matches and len(technical_matches) >= len(earnings_matches):
        return 'technical_report', technical_matches
    elif earnings_matches:
        return 'earnings', earnings_matches

    return None, []


def get_recent_news(hours: int = 6) -> List[Dict]:
    """Get news articles from the last N hours."""
    conn = get_connection()
    cursor = conn.cursor()

    cutoff = datetime.now() - timedelta(hours=hours)

    cursor.execute('''
        SELECT id, title, description, url, source, published_at, ticker
        FROM news
        WHERE datetime(published_at) >= datetime(?)
        ORDER BY published_at DESC
    ''', (cutoff.isoformat(),))

    columns = ['id', 'title', 'description', 'url', 'source', 'published_at', 'ticker']
    articles = [dict(zip(columns, row)) for row in cursor.fetchall()]

    conn.close()
    return articles


def get_existing_queue_urls() -> set:
    """Get URLs already in the extraction queue to avoid duplicates."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT url FROM extraction_queue WHERE url IS NOT NULL')
    urls = {row[0] for row in cursor.fetchall()}

    conn.close()
    return urls


def validate_ticker(ticker: str) -> Optional[Dict]:
    """Check if ticker exists in our companies database."""
    try:
        return get_company(ticker)
    except Exception:
        return None


def scan_news_for_triggers(hours: int = 6, dry_run: bool = False) -> Dict:
    """
    Scan recent news for extraction candidates.

    Args:
        hours: Look back this many hours
        dry_run: If True, don't add to queue, just report findings

    Returns:
        Statistics about findings and queue additions
    """
    logger.info(f"Scanning news from last {hours} hours for extraction triggers...")

    # Get recent news
    articles = get_recent_news(hours)
    logger.info(f"Found {len(articles)} recent articles to scan")

    # Get existing queue URLs to avoid duplicates
    existing_urls = get_existing_queue_urls()

    stats = {
        'scanned': len(articles),
        'earnings_found': 0,
        'technical_found': 0,
        'queued': 0,
        'skipped_no_ticker': 0,
        'skipped_unknown_ticker': 0,
        'skipped_duplicate': 0,
        'candidates': []
    }

    for article in articles:
        title = article.get('title', '')
        description = article.get('description', '')
        url = article.get('url', '')
        news_id = article.get('id')

        # Classify the article
        extraction_type, matched_keywords = classify_news_article(title, description)

        if not extraction_type:
            continue

        # Track findings
        if extraction_type == 'earnings':
            stats['earnings_found'] += 1
        else:
            stats['technical_found'] += 1

        # Extract ticker from article
        tickers = extract_tickers_from_text(title + " " + (description or ""))

        # Also check if article has a ticker field
        if article.get('ticker') and article['ticker'] not in tickers:
            tickers.append(article['ticker'])

        if not tickers:
            stats['skipped_no_ticker'] += 1
            continue

        # Check if URL already in queue
        if url and url in existing_urls:
            stats['skipped_duplicate'] += 1
            continue

        # Process each ticker found
        for ticker in tickers:
            company = validate_ticker(ticker)

            if not company:
                stats['skipped_unknown_ticker'] += 1
                continue

            candidate = {
                'ticker': ticker,
                'company_id': company.get('id'),
                'company_name': company.get('name'),
                'extraction_type': extraction_type,
                'url': url,
                'news_id': news_id,
                'title': title[:100],
                'keywords': matched_keywords[:3]
            }

            stats['candidates'].append(candidate)

            if not dry_run:
                # Calculate priority based on keywords matched
                priority = max(1, 5 - len(matched_keywords))  # More keywords = higher priority (lower number)

                success = add_to_extraction_queue(
                    ticker=ticker,
                    extraction_type=extraction_type,
                    url=url,
                    news_id=news_id,
                    source='news_trigger',
                    priority=priority
                )

                if success:
                    stats['queued'] += 1
                    logger.info(f"  Queued: {ticker} - {extraction_type} - {title[:60]}...")
                    # Add to existing URLs to prevent duplicates in same run
                    if url:
                        existing_urls.add(url)

    return stats


def print_scan_report(stats: Dict):
    """Print a formatted report of scan results."""
    print("\n" + "=" * 60)
    print("EXTRACTION TRIGGER SCAN REPORT")
    print("=" * 60)
    print(f"\nArticles scanned: {stats['scanned']}")
    print(f"Earnings triggers found: {stats['earnings_found']}")
    print(f"Technical report triggers found: {stats['technical_found']}")
    print(f"\nJobs queued: {stats['queued']}")
    print(f"Skipped (no ticker): {stats['skipped_no_ticker']}")
    print(f"Skipped (unknown ticker): {stats['skipped_unknown_ticker']}")
    print(f"Skipped (duplicate): {stats['skipped_duplicate']}")

    if stats['candidates']:
        print(f"\n{'='*60}")
        print("CANDIDATES FOUND:")
        print("-" * 60)
        for c in stats['candidates'][:20]:  # Show first 20
            print(f"  [{c['extraction_type'].upper()}] {c['ticker']}: {c['title'][:50]}...")
            print(f"    Keywords: {', '.join(c['keywords'])}")


def run_trigger_scan(hours: int = 6):
    """Main entry point for the trigger scan."""
    logger.info("=" * 60)
    logger.info(f"Starting extraction trigger scan at {datetime.now().isoformat()}")

    # Scan news for triggers
    stats = scan_news_for_triggers(hours=hours, dry_run=False)

    # Log results
    logger.info(f"Scan complete: {stats['queued']} jobs queued")
    logger.info(f"  Earnings found: {stats['earnings_found']}")
    logger.info(f"  Technical reports found: {stats['technical_found']}")

    # Get queue stats
    queue_stats = get_extraction_queue_stats()
    logger.info(f"Queue status: {queue_stats.get('pending', 0)} pending, "
                f"{queue_stats.get('processing', 0)} processing, "
                f"{queue_stats.get('completed', 0)} completed")

    logger.info(f"Extraction trigger scan completed at {datetime.now().isoformat()}")
    logger.info("=" * 60)

    return stats


# =============================================================================
# CLI INTERFACE
# =============================================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Extraction Trigger System")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be queued without actually queueing")
    parser.add_argument("--hours", type=int, default=6,
                        help="Hours of news to scan (default: 6)")
    parser.add_argument("--stats", action="store_true",
                        help="Show extraction queue statistics")
    parser.add_argument("--test-keywords", type=str,
                        help="Test keyword detection on a title string")

    args = parser.parse_args()

    if args.stats:
        # Show queue stats
        stats = get_extraction_queue_stats()
        print("\nExtraction Queue Statistics:")
        print("-" * 40)
        print(f"  Pending: {stats.get('pending', 0)}")
        print(f"  Processing: {stats.get('processing', 0)}")
        print(f"  Completed: {stats.get('completed', 0)}")
        print(f"  Failed: {stats.get('failed', 0)}")
        if stats.get('by_type'):
            print("\n  By Type:")
            for t in stats['by_type']:
                print(f"    {t['extraction_type']}: {t['count']}")

    elif args.test_keywords:
        # Test keyword detection
        extraction_type, keywords = classify_news_article(args.test_keywords)
        print(f"\nTitle: {args.test_keywords}")
        print(f"Type: {extraction_type or 'None'}")
        print(f"Keywords matched: {keywords}")
        tickers = extract_tickers_from_text(args.test_keywords)
        print(f"Tickers found: {tickers}")

    elif args.dry_run:
        # Dry run - show what would be queued
        print("\nRunning in DRY RUN mode - no changes will be made")
        stats = scan_news_for_triggers(hours=args.hours, dry_run=True)
        print_scan_report(stats)

    else:
        # Normal run
        stats = run_trigger_scan(hours=args.hours)
        print_scan_report(stats)
