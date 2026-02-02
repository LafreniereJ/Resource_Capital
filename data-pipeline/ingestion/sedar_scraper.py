"""
Mining Company Filing Scraper
Fetches filings and production reports from multiple sources:
1. GlobeNewswire (press releases)
2. Newsfile (TSX/TSXV press releases)
3. Company investor relations pages

SEDAR+ requires CAPTCHA authentication, so we use alternative sources
for press releases and rely on company IR pages for technical reports.
"""

import hashlib
import logging
import os
import re
import sqlite3
import sys
import time
from datetime import datetime
from typing import Dict, List, Optional

import feedparser
import requests

# Add processing dir to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'processing'))
from db_manager import get_all_companies

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'database', 'mining.db')
DOWNLOAD_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'downloads', 'filings')

# Press release RSS feeds for mining news
RSS_FEEDS = {
    # GlobeNewswire - Mining & Metals industry
    "globenewswire": "https://www.globenewswire.com/RssFeed/industry/5005-Mining",
    # Newsfile - Canadian mining focus
    "newsfile": "https://www.newsfilecorp.com/rss",
    # Mining.com news
    "miningcom": "https://www.mining.com/feed/",
    # Kitco mining news
    "kitco": "https://www.kitco.com/rss/mining.xml",
}

# Rate limiting
REQUEST_DELAY = 1.0  # Seconds between requests

# Keywords for production/operational reports
PRODUCTION_KEYWORDS = [
    'production', 'quarterly results', 'annual results', 'q1 ', 'q2 ', 'q3 ', 'q4 ',
    'operating results', 'operational update', 'gold production', 'silver production',
    'copper production', 'ounces', 'tonnes', 'aisc', 'cost per ounce', 'cash cost',
    'mill throughput', 'grade', 'recovery', 'output'
]

# Keywords for technical reports
TECHNICAL_KEYWORDS = [
    'ni 43-101', '43-101', 'technical report', 'feasibility', 'pea', 'pre-feasibility',
    'resource estimate', 'reserve estimate', 'mineral resource', 'mineral reserve',
    'preliminary economic', 'bankable feasibility'
]


class FilingScraper:
    """Scraper for mining company filings from multiple sources."""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
            'Accept-Language': 'en-CA,en;q=0.9',
        })
        self.last_request_time = 0

        # Ensure download directory exists
        os.makedirs(DOWNLOAD_DIR, exist_ok=True)

    def _rate_limit(self):
        """Enforce rate limiting between requests."""
        elapsed = time.time() - self.last_request_time
        if elapsed < REQUEST_DELAY:
            time.sleep(REQUEST_DELAY - elapsed)
        self.last_request_time = time.time()

    def fetch_rss_feed(self, feed_name: str, feed_url: str) -> List[Dict]:
        """Fetch and parse an RSS feed."""
        self._rate_limit()

        try:
            # Use requests to get feed with proper headers
            response = self.session.get(feed_url, timeout=30)
            if response.status_code != 200:
                logging.warning(f"Feed {feed_name} returned {response.status_code}")
                return []

            feed = feedparser.parse(response.content)

            articles = []
            for entry in feed.entries:
                article = {
                    'title': entry.get('title', ''),
                    'url': entry.get('link', ''),
                    'published': entry.get('published', entry.get('updated', '')),
                    'summary': entry.get('summary', entry.get('description', '')),
                    'source': feed_name,
                }
                articles.append(article)

            logging.info(f"Fetched {len(articles)} articles from {feed_name}")
            return articles

        except Exception as e:
            logging.error(f"Error fetching {feed_name}: {e}")
            return []

    def fetch_all_mining_news(self) -> List[Dict]:
        """Fetch news from all RSS feeds."""
        all_articles = []

        for feed_name, feed_url in RSS_FEEDS.items():
            articles = self.fetch_rss_feed(feed_name, feed_url)
            all_articles.extend(articles)

        return all_articles

    def extract_ticker_from_title(self, title: str) -> Optional[str]:
        """Extract stock ticker from press release title."""
        # Common patterns: (TSX: ABC), (TSXV: ABC), TSX:ABC, etc.
        patterns = [
            r'\(TSX[:\s-]?\s*([A-Z]{2,5})\)',
            r'\(TSXV[:\s-]?\s*([A-Z]{2,5})\)',
            r'\(TSX\.V[:\s-]?\s*([A-Z]{2,5})\)',
            r'TSX[:\s]+([A-Z]{2,5})',
            r'TSXV[:\s]+([A-Z]{2,5})',
        ]

        for pattern in patterns:
            match = re.search(pattern, title, re.IGNORECASE)
            if match:
                return match.group(1).upper()

        return None

    def classify_article(self, article: Dict) -> str:
        """Classify article as production, technical, or other."""
        title_lower = article.get('title', '').lower()
        summary_lower = article.get('summary', '').lower()
        combined = title_lower + ' ' + summary_lower

        # Check for production-related content
        if any(kw in combined for kw in PRODUCTION_KEYWORDS):
            return 'production'

        # Check for technical report content
        if any(kw in combined for kw in TECHNICAL_KEYWORDS):
            return 'technical'

        return 'other'

    def match_article_to_company(self, article: Dict, companies: List[Dict]) -> Optional[Dict]:
        """Match an article to a company in our database."""
        # First try to extract ticker from title
        ticker = self.extract_ticker_from_title(article.get('title', ''))
        if ticker:
            for company in companies:
                if company['ticker'] == ticker:
                    return company

        # Fallback: search for company name in title
        title_lower = article.get('title', '').lower()
        for company in companies:
            company_name = company['name'].lower()
            # Use first 2-3 significant words from company name
            name_parts = company_name.replace('inc.', '').replace('corp.', '').replace('ltd.', '').split()[:3]
            if len(name_parts) >= 2:
                search_term = ' '.join(name_parts[:2])
                if search_term in title_lower:
                    return company

        return None

    def fetch_production_reports_from_feeds(self) -> List[Dict]:
        """Fetch production-related press releases from RSS feeds."""
        all_articles = self.fetch_all_mining_news()
        companies = get_all_companies()

        production_reports = []

        for article in all_articles:
            # Classify the article
            article_type = self.classify_article(article)
            if article_type != 'production':
                continue

            # Match to a company
            company = self.match_article_to_company(article, companies)
            if company:
                article['company_id'] = company['id']
                article['ticker'] = company['ticker']
                article['company_name'] = company['name']
                article['filing_type'] = 'production_report'
                production_reports.append(article)

        logging.info(f"Found {len(production_reports)} production reports matching tracked companies")
        return production_reports

    def fetch_technical_reports_from_feeds(self) -> List[Dict]:
        """Fetch NI 43-101 related press releases from RSS feeds."""
        all_articles = self.fetch_all_mining_news()
        companies = get_all_companies()

        technical_reports = []

        for article in all_articles:
            article_type = self.classify_article(article)
            if article_type != 'technical':
                continue

            company = self.match_article_to_company(article, companies)
            if company:
                article['company_id'] = company['id']
                article['ticker'] = company['ticker']
                article['company_name'] = company['name']
                article['filing_type'] = 'technical_report'
                technical_reports.append(article)

        logging.info(f"Found {len(technical_reports)} technical reports matching tracked companies")
        return technical_reports

    def download_pdf(self, url: str, ticker: str, title: str) -> Optional[str]:
        """Download a PDF file from URL."""
        if not url or not url.endswith('.pdf'):
            return None

        self._rate_limit()

        # Create company download directory
        company_dir = os.path.join(DOWNLOAD_DIR, ticker)
        os.makedirs(company_dir, exist_ok=True)

        # Generate filename
        safe_title = re.sub(r'[^\w\s-]', '', title)[:50]
        filename_hash = hashlib.md5(url.encode()).hexdigest()[:8]
        filename = f"{safe_title}_{filename_hash}.pdf"
        filepath = os.path.join(company_dir, filename)

        if os.path.exists(filepath):
            return filepath

        try:
            response = self.session.get(url, timeout=60, stream=True)
            if response.status_code != 200:
                return None

            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            logging.info(f"Downloaded: {filename}")
            return filepath

        except Exception as e:
            logging.error(f"Download error: {e}")
            return None


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def save_filing_to_db(company_id: int, filing: Dict, local_path: str = None) -> Optional[int]:
    """
    Save filing to database and queue for processing.
    
    Returns:
        Filing ID if saved, None if error
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    url = filing.get("url", "")
    
    try:
        # 1. Check if already in filings
        cursor.execute("SELECT id FROM filings WHERE sedar_url = ?", (url,))
        existing = cursor.fetchone()
        
        filing_id = None
        if existing:
            filing_id = existing["id"]
        else:
            # Insert into filings table
            cursor.execute("""
                INSERT INTO filings (company_id, filing_type, filing_date, sedar_url, local_path, is_processed)
                VALUES (?, ?, ?, ?, ?, FALSE)
            """, (
                company_id,
                filing.get("filing_type", "other"),
                filing.get("published", datetime.now().isoformat())[:10], # Use 'published' from article
                url,
                local_path
            ))
            filing_id = cursor.lastrowid
            
        # 2. Add to Ingestion Queue (if not already queued)
        # Check source_url in queue
        cursor.execute("SELECT id FROM ingestion_queue WHERE source_url = ?", (url,))
        in_queue = cursor.fetchone()
        
        if not in_queue:
            logging.info(f"Queuing document: {filing.get('title', 'Unknown')[:50]}...") # Use 'title' for logging
            
            # Determine priority
            priority = 0
            doc_type = filing.get("filing_type", "other")
            if doc_type in ["technical_report", "production_report"]:
                priority = 10
            elif doc_type == "financial":
                priority = 5
            
            cursor.execute("""
                INSERT INTO ingestion_queue (
                    source_url, source_type, document_type, company_id, 
                    status, priority, local_path, discovered_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """, (
                url,
                "scraper_feed", # Generic source type for now
                doc_type,
                company_id,
                "PENDING", # Ready for detailed extraction
                priority,
                local_path
            ))
            
        conn.commit()
        return filing_id
        
    except Exception as e:
        logging.error(f"DB error saving filing: {e}")
        return None
    finally:
        conn.close()


def fetch_and_save_production_reports() -> Dict:
    """Fetch production reports and save to database."""
    scraper = FilingScraper()
    reports = scraper.fetch_production_reports_from_feeds()

    results = {
        'found': len(reports),
        'saved': 0,
        'by_company': {}
    }

    for report in reports:
        filing_id = save_filing_to_db(report['company_id'], report)
        if filing_id:
            results['saved'] += 1
            ticker = report['ticker']
            results['by_company'][ticker] = results['by_company'].get(ticker, 0) + 1

    return results


def fetch_and_save_technical_reports() -> Dict:
    """Fetch technical report announcements and save to database."""
    scraper = FilingScraper()
    reports = scraper.fetch_technical_reports_from_feeds()

    results = {
        'found': len(reports),
        'saved': 0,
        'by_company': {}
    }

    for report in reports:
        filing_id = save_filing_to_db(report['company_id'], report)
        if filing_id:
            results['saved'] += 1
            ticker = report['ticker']
            results['by_company'][ticker] = results['by_company'].get(ticker, 0) + 1

    return results


def get_filing_stats() -> Dict:
    """Get filing statistics from database."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as cnt FROM filings")
    total = cursor.fetchone()['cnt']

    cursor.execute("""
        SELECT filing_type, COUNT(*) as cnt
        FROM filings
        GROUP BY filing_type
    """)
    by_type = {row['filing_type']: row['cnt'] for row in cursor.fetchall()}

    cursor.execute("""
        SELECT c.ticker, COUNT(*) as cnt
        FROM filings f
        JOIN companies c ON f.company_id = c.id
        GROUP BY c.ticker
        ORDER BY cnt DESC
        LIMIT 10
    """)
    top_companies = {row['ticker']: row['cnt'] for row in cursor.fetchall()}

    conn.close()

    return {
        'total': total,
        'by_type': by_type,
        'top_companies': top_companies
    }


# =============================================================================
# CLI
# =============================================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Mining Company Filing Scraper")
    parser.add_argument("--production", action="store_true", help="Fetch production reports")
    parser.add_argument("--technical", action="store_true", help="Fetch technical report announcements")
    parser.add_argument("--all", action="store_true", help="Fetch all report types")
    parser.add_argument("--stats", action="store_true", help="Show filing statistics")
    parser.add_argument("--test", action="store_true", help="Test RSS feed fetching")

    args = parser.parse_args()

    if args.stats:
        stats = get_filing_stats()
        print("\nFiling Statistics:")
        print(f"  Total filings: {stats['total']}")
        print(f"\n  By Type:")
        for ftype, cnt in stats['by_type'].items():
            print(f"    {ftype}: {cnt}")
        print(f"\n  Top Companies:")
        for ticker, cnt in stats['top_companies'].items():
            print(f"    {ticker}: {cnt}")

    elif args.test:
        print("\nTesting RSS feed fetching...")
        scraper = FilingScraper()
        articles = scraper.fetch_all_mining_news()
        print(f"Fetched {len(articles)} articles total")

        # Show sample
        print("\nSample articles:")
        for article in articles[:5]:
            print(f"  - {article['title'][:80]}...")
            ticker = scraper.extract_ticker_from_title(article['title'])
            if ticker:
                print(f"    Ticker: {ticker}")

    elif args.production or args.all:
        print("\nFetching production reports...")
        results = fetch_and_save_production_reports()
        print(f"Found: {results['found']}, Saved: {results['saved']}")
        if results['by_company']:
            print("By company:")
            for ticker, cnt in results['by_company'].items():
                print(f"  {ticker}: {cnt}")

    elif args.technical or args.all:
        print("\nFetching technical report announcements...")
        results = fetch_and_save_technical_reports()
        print(f"Found: {results['found']}, Saved: {results['saved']}")

    else:
        print("Mining Company Filing Scraper")
        print("=" * 40)
        print("\nUsage:")
        print("  python sedar_scraper.py --test          # Test RSS feeds")
        print("  python sedar_scraper.py --production    # Fetch production reports")
        print("  python sedar_scraper.py --technical     # Fetch technical reports")
        print("  python sedar_scraper.py --all           # Fetch all types")
        print("  python sedar_scraper.py --stats         # Show statistics")
        print("\nNote: SEDAR+ requires CAPTCHA, so this uses RSS feeds instead.")
        print("For full SEDAR+ access, consider browser automation with Selenium.")
