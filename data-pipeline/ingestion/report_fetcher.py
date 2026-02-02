"""
Automated Technical Report Fetcher

Finds and downloads NI 43-101 technical reports, feasibility studies, and other
mining documents from multiple sources:

1. Press release pages (extracts PDF links from announcements)
2. Company investor relations pages (direct report discovery)
3. SEDAR+ RSS feeds (filing announcements)

Downloads are saved to the documents folder for processing by the extraction pipeline.
"""

import hashlib
import logging
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse

import feedparser
import requests
from bs4 import BeautifulSoup

# Add processing dir to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'processing'))
from db_manager import get_all_companies

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# =============================================================================
# PATHS
# =============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
DOCUMENTS_DIR = PROJECT_ROOT / "documents"
INCOMING_DIR = DOCUMENTS_DIR / "incoming"
TECHNICAL_DIR = INCOMING_DIR / "technical_reports"
FEASIBILITY_DIR = INCOMING_DIR / "feasibility_studies"
RESOURCE_ESTIMATES_DIR = INCOMING_DIR / "resource_estimates"

# Ensure directories exist
for dir_path in [TECHNICAL_DIR, FEASIBILITY_DIR, RESOURCE_ESTIMATES_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# =============================================================================
# CONFIGURATION
# =============================================================================

REQUEST_DELAY = 1.5  # Seconds between requests (be respectful)
REQUEST_TIMEOUT = 30

# Keywords for classifying report types
FEASIBILITY_KEYWORDS = [
    'feasibility study', 'pre-feasibility', 'prefeasibility', 'pfs',
    'definitive feasibility', 'dfs', 'bankable feasibility', 'bfs'
]

PEA_KEYWORDS = [
    'preliminary economic assessment', 'pea', 'economic assessment',
    'scoping study'
]

RESOURCE_KEYWORDS = [
    'resource estimate', 'reserve estimate', 'mineral resource update',
    'resource update', 'measured and indicated', 'inferred resource',
    'proven and probable'
]

TECHNICAL_KEYWORDS = [
    'ni 43-101', '43-101', 'technical report', 'national instrument 43-101'
]

# Company IR page patterns (common URL structures)
IR_PAGE_PATTERNS = [
    "/investors",
    "/investor-relations",
    "/investor",
    "/financials",
    "/reports",
    "/technical-reports",
    "/resources",
    "/documents",
]

# Known IR page URLs for major companies (manual mapping)
# Note: Many company sites block direct scraping - use RSS feeds instead
COMPANY_IR_URLS = {
    # These sites allow scraping or have accessible PDF directories
    # Add verified working URLs here after testing
}

# RSS feeds for technical report announcements (verified working)
TECHNICAL_RSS_FEEDS = {
    "newsfile_datalynx": "https://feeds.newsfilecorp.com/feed/DataLynx",  # Official TSX/TSXV source
    "mining_com": "https://www.mining.com/feed/",  # Industry news
    "globenewswire": "https://www.globenewswire.com/RssFeed/industry/5003-Basic-Materials",  # Materials/Mining
}

# SEDAR+ RSS feeds (best source for NI 43-101 filings)
# Note: SEDAR+ web interface requires CAPTCHA but RSS feeds work
SEDAR_CATEGORIES = {
    "technical_reports": "NI 43-101",
    "annual_reports": "Annual Report",
    "quarterly_reports": "Interim Financial",
}


class ReportFetcher:
    """Fetches and downloads technical reports from multiple sources."""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-CA,en;q=0.9',
        })
        self.last_request_time = 0
        self.downloaded_files = []

    def _rate_limit(self):
        """Enforce rate limiting between requests."""
        elapsed = time.time() - self.last_request_time
        if elapsed < REQUEST_DELAY:
            time.sleep(REQUEST_DELAY - elapsed)
        self.last_request_time = time.time()

    def _get(self, url: str) -> Optional[requests.Response]:
        """Make a GET request with rate limiting and error handling."""
        self._rate_limit()
        try:
            response = self.session.get(url, timeout=REQUEST_TIMEOUT)
            if response.status_code == 200:
                return response
            logger.warning(f"HTTP {response.status_code} for {url}")
            return None
        except Exception as e:
            logger.error(f"Request error for {url}: {e}")
            return None

    def classify_report(self, title: str, url: str = "") -> str:
        """Classify a report by type based on title/URL."""
        text = (title + " " + url).lower()

        if any(kw in text for kw in FEASIBILITY_KEYWORDS):
            return 'feasibility'
        elif any(kw in text for kw in PEA_KEYWORDS):
            return 'pea'
        elif any(kw in text for kw in RESOURCE_KEYWORDS):
            return 'resource_estimate'
        elif any(kw in text for kw in TECHNICAL_KEYWORDS):
            return 'technical_report'
        return 'other'

    def get_download_dir(self, report_type: str) -> Path:
        """Get the appropriate download directory for a report type."""
        if report_type == 'feasibility':
            return FEASIBILITY_DIR
        elif report_type == 'resource_estimate':
            return RESOURCE_ESTIMATES_DIR
        else:
            return TECHNICAL_DIR

    def extract_pdf_links(self, html: str, base_url: str) -> List[Tuple[str, str]]:
        """
        Extract PDF links from HTML page.

        Returns list of (url, link_text) tuples.
        """
        soup = BeautifulSoup(html, 'html.parser')
        pdf_links = []

        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']

            # Check if it's a PDF link
            if '.pdf' in href.lower():
                # Convert relative URLs to absolute
                full_url = urljoin(base_url, href)
                link_text = a_tag.get_text(strip=True) or os.path.basename(href)
                pdf_links.append((full_url, link_text))

        return pdf_links

    def download_pdf(self, url: str, ticker: str, title: str, report_type: str) -> Optional[str]:
        """
        Download a PDF file to the appropriate documents folder.

        Returns the local file path if successful, None otherwise.
        """
        self._rate_limit()

        # Determine download directory
        download_dir = self.get_download_dir(report_type)
        ticker_dir = download_dir / ticker.upper()
        ticker_dir.mkdir(parents=True, exist_ok=True)

        # Generate safe filename
        safe_title = re.sub(r'[^\w\s-]', '', title)[:60].strip()
        safe_title = re.sub(r'\s+', '-', safe_title)
        timestamp = datetime.now().strftime('%Y%m%d')
        url_hash = hashlib.md5(url.encode()).hexdigest()[:6]
        filename = f"{safe_title}_{timestamp}_{url_hash}.pdf"
        filepath = ticker_dir / filename

        # Skip if already downloaded
        if filepath.exists():
            logger.info(f"Already exists: {filename}")
            return str(filepath)

        try:
            response = self.session.get(url, timeout=60, stream=True)

            if response.status_code != 200:
                logger.warning(f"HTTP {response.status_code} downloading {url}")
                return None

            # Verify it's actually a PDF
            content_type = response.headers.get('Content-Type', '')
            if 'pdf' not in content_type.lower() and not url.lower().endswith('.pdf'):
                logger.warning(f"Not a PDF: {url} (Content-Type: {content_type})")
                return None

            # Download the file
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            file_size = filepath.stat().st_size
            if file_size < 1000:  # Less than 1KB is probably an error page
                filepath.unlink()
                logger.warning(f"Downloaded file too small ({file_size} bytes): {url}")
                return None

            logger.info(f"Downloaded: {filename} ({file_size / 1024:.1f} KB)")
            self.downloaded_files.append(str(filepath))
            return str(filepath)

        except Exception as e:
            logger.error(f"Download error for {url}: {e}")
            if filepath.exists():
                filepath.unlink()
            return None

    def fetch_press_release_pdfs(self, pr_url: str, ticker: str) -> List[str]:
        """
        Fetch a press release page and extract/download any PDF links.

        Returns list of downloaded file paths.
        """
        response = self._get(pr_url)
        if not response:
            return []

        pdf_links = self.extract_pdf_links(response.text, pr_url)
        downloaded = []

        for pdf_url, link_text in pdf_links:
            # Classify the report
            report_type = self.classify_report(link_text, pdf_url)

            # Only download technical/feasibility/resource reports
            if report_type in ['technical_report', 'feasibility', 'pea', 'resource_estimate']:
                filepath = self.download_pdf(pdf_url, ticker, link_text, report_type)
                if filepath:
                    downloaded.append(filepath)

        return downloaded

    def scrape_ir_page(self, ticker: str, ir_url: str = None) -> List[Dict]:
        """
        Scrape a company's IR page for technical reports.

        Returns list of report info dicts.
        """
        # Use known URL or try to discover
        if not ir_url:
            ir_url = COMPANY_IR_URLS.get(ticker)

        if not ir_url:
            logger.info(f"No IR URL known for {ticker}")
            return []

        logger.info(f"Scraping IR page for {ticker}: {ir_url}")

        response = self._get(ir_url)
        if not response:
            return []

        pdf_links = self.extract_pdf_links(response.text, ir_url)
        reports = []

        for pdf_url, link_text in pdf_links:
            report_type = self.classify_report(link_text, pdf_url)

            if report_type != 'other':
                reports.append({
                    'url': pdf_url,
                    'title': link_text,
                    'type': report_type,
                    'ticker': ticker,
                    'source': 'ir_page',
                })

        logger.info(f"Found {len(reports)} potential reports on {ticker} IR page")
        return reports

    def fetch_rss_technical_reports(self) -> List[Dict]:
        """
        Fetch technical report announcements from RSS feeds.

        Returns list of press release info for reports.
        """
        companies = get_all_companies()
        company_tickers = {c['ticker']: c for c in companies}
        company_names = {c['name'].lower(): c for c in companies}

        reports = []

        for feed_name, feed_url in TECHNICAL_RSS_FEEDS.items():
            self._rate_limit()

            try:
                response = self.session.get(feed_url, timeout=30)
                if response.status_code != 200:
                    logger.warning(f"Feed {feed_name} returned {response.status_code}")
                    continue

                feed = feedparser.parse(response.content)

                for entry in feed.entries:
                    title = entry.get('title', '')
                    summary = entry.get('summary', entry.get('description', ''))
                    url = entry.get('link', '')
                    combined = (title + ' ' + summary).lower()

                    # Check if it's a technical report
                    is_technical = any(kw in combined for kw in
                        TECHNICAL_KEYWORDS + FEASIBILITY_KEYWORDS + PEA_KEYWORDS + RESOURCE_KEYWORDS)

                    if not is_technical:
                        continue

                    # Try to match to a company
                    ticker = self._extract_ticker(title)
                    matched_company = None

                    if ticker and ticker in company_tickers:
                        matched_company = company_tickers[ticker]
                    else:
                        # Try name matching
                        for name, company in company_names.items():
                            name_parts = name.replace('inc.', '').replace('corp.', '').split()[:2]
                            if len(name_parts) >= 2 and ' '.join(name_parts) in combined:
                                matched_company = company
                                break

                    if matched_company:
                        report_type = self.classify_report(title, url)
                        reports.append({
                            'url': url,
                            'title': title,
                            'type': report_type,
                            'ticker': matched_company['ticker'],
                            'company_name': matched_company['name'],
                            'source': feed_name,
                            'published': entry.get('published', ''),
                        })

                logger.info(f"Found {len([r for r in reports if r['source'] == feed_name])} reports from {feed_name}")

            except Exception as e:
                logger.error(f"Error fetching {feed_name}: {e}")

        return reports

    def _extract_ticker(self, text: str) -> Optional[str]:
        """Extract ticker symbol from text."""
        patterns = [
            r'\(TSX[:\s-]?\s*([A-Z]{2,5})\)',
            r'\(TSXV[:\s-]?\s*([A-Z]{2,5})\)',
            r'\(TSX\.V[:\s-]?\s*([A-Z]{2,5})\)',
            r'TSX[:\s]+([A-Z]{2,5})',
            r'TSXV[:\s]+([A-Z]{2,5})',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).upper()

        return None


def fetch_all_technical_reports(download: bool = True) -> Dict:
    """
    Main function to discover and optionally download technical reports.

    Args:
        download: If True, download PDFs. If False, just return discovery results.

    Returns:
        Results dictionary with discovered and downloaded reports.
    """
    fetcher = ReportFetcher()

    results = {
        'rss_reports': [],
        'ir_reports': [],
        'downloaded': [],
        'errors': [],
    }

    # 1. Fetch from RSS feeds
    logger.info("=== Scanning RSS feeds for technical reports ===")
    rss_reports = fetcher.fetch_rss_technical_reports()
    results['rss_reports'] = rss_reports

    if download:
        for report in rss_reports:
            try:
                # Visit the press release and extract PDFs
                downloaded = fetcher.fetch_press_release_pdfs(
                    report['url'],
                    report['ticker']
                )
                results['downloaded'].extend(downloaded)
            except Exception as e:
                results['errors'].append(f"{report['url']}: {e}")

    # 2. Scrape IR pages for companies with known URLs
    logger.info("=== Scraping company IR pages ===")
    for ticker, ir_url in COMPANY_IR_URLS.items():
        ir_reports = fetcher.scrape_ir_page(ticker, ir_url)
        results['ir_reports'].extend(ir_reports)

        if download:
            for report in ir_reports:
                try:
                    filepath = fetcher.download_pdf(
                        report['url'],
                        report['ticker'],
                        report['title'],
                        report['type']
                    )
                    if filepath:
                        results['downloaded'].append(filepath)
                except Exception as e:
                    results['errors'].append(f"{report['url']}: {e}")

    # Summary
    logger.info(f"\n=== Report Fetch Complete ===")
    logger.info(f"RSS reports found: {len(results['rss_reports'])}")
    logger.info(f"IR page reports found: {len(results['ir_reports'])}")
    logger.info(f"Files downloaded: {len(results['downloaded'])}")
    if results['errors']:
        logger.warning(f"Errors: {len(results['errors'])}")

    return results


def discover_reports_only() -> Dict:
    """Discover reports without downloading. Useful for dry-run/preview."""
    return fetch_all_technical_reports(download=False)


# =============================================================================
# CLI
# =============================================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Technical Report Fetcher")
    parser.add_argument("--discover", action="store_true",
                        help="Discover reports without downloading")
    parser.add_argument("--download", action="store_true",
                        help="Discover and download reports")
    parser.add_argument("--ticker", type=str,
                        help="Fetch reports for a specific ticker")
    parser.add_argument("--ir-only", action="store_true",
                        help="Only scrape IR pages (skip RSS)")

    args = parser.parse_args()

    if args.ticker:
        fetcher = ReportFetcher()
        ir_url = COMPANY_IR_URLS.get(args.ticker.upper())

        if ir_url:
            reports = fetcher.scrape_ir_page(args.ticker.upper(), ir_url)
            print(f"\nFound {len(reports)} reports for {args.ticker}:")
            for r in reports:
                print(f"  [{r['type']}] {r['title'][:60]}...")
                print(f"    URL: {r['url']}")
        else:
            print(f"No IR URL known for {args.ticker}. Add it to COMPANY_IR_URLS.")

    elif args.discover:
        print("\n=== Discovering Technical Reports (Dry Run) ===\n")
        results = discover_reports_only()

        print(f"\nRSS Feed Reports ({len(results['rss_reports'])}):")
        for r in results['rss_reports'][:10]:
            print(f"  [{r['type']}] {r['ticker']}: {r['title'][:50]}...")

        print(f"\nIR Page Reports ({len(results['ir_reports'])}):")
        for r in results['ir_reports'][:10]:
            print(f"  [{r['type']}] {r['ticker']}: {r['title'][:50]}...")

    elif args.download:
        print("\n=== Fetching and Downloading Technical Reports ===\n")
        results = fetch_all_technical_reports(download=True)

        print(f"\nDownloaded {len(results['downloaded'])} files:")
        for f in results['downloaded']:
            print(f"  {f}")

    else:
        print("Technical Report Fetcher")
        print("=" * 50)
        print("\nUsage:")
        print("  python report_fetcher.py --discover      # Find reports (no download)")
        print("  python report_fetcher.py --download      # Find and download reports")
        print("  python report_fetcher.py --ticker ABX    # Check specific company")
        print("\nDownloads are saved to:")
        print(f"  Technical reports: {TECHNICAL_DIR}")
        print(f"  Feasibility studies: {FEASIBILITY_DIR}")
        print(f"  Resource estimates: {RESOURCE_ESTIMATES_DIR}")
