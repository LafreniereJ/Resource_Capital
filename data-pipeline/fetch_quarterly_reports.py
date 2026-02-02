#!/usr/bin/env python3
"""
Quarterly Report Fetcher - Automatically downloads quarterly/annual reports from SEDAR+

Downloads:
- Quarterly MD&A (Management Discussion & Analysis)
- Interim/Annual Financial Statements
- Technical Reports (NI 43-101)

Sources:
- SEDAR+ (sedarplus.ca) - Official Canadian securities filings
- Company press releases (via news triggers)

Run daily via cron:
0 6 * * * cd /path/to/data-pipeline && ./venv/bin/python fetch_quarterly_reports.py >> logs/quarterly_reports.log 2>&1
"""

import os
import sys
import re
import json
import logging
import hashlib
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from pathlib import Path

# Add directories to path
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'processing'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from db_manager import (
    get_connection,
    get_company_tickers,
    get_company,
    add_to_extraction_queue
)

# Setup logging
LOG_DIR = os.path.join(os.path.dirname(__file__), 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(LOG_DIR, 'quarterly_reports.log'))
    ]
)
logger = logging.getLogger(__name__)

# Download directory
REPORTS_DIR = os.path.join(os.path.dirname(__file__), 'downloads', 'quarterly_reports')
os.makedirs(REPORTS_DIR, exist_ok=True)

# Known company IR page URLs (can be extended)
# Format: ticker -> investor relations page URL
KNOWN_IR_PAGES = {
    'AEM': 'https://www.agnicoeagle.com/English/investor-relations/news-and-events/default.aspx',
    'ABX': 'https://www.barrick.com/English/news/default.aspx',
    'NEM': 'https://www.newmont.com/investors/',
    'GOLD': 'https://www.barrick.com/English/news/default.aspx',
    'K': 'https://www.kinross.com/news-and-investors/default.aspx',
    'PAAS': 'https://www.panamericansilver.com/investors/',
    'WPM': 'https://www.wheatonpm.com/Investors/default.aspx',
    'FNV': 'https://www.franco-nevada.com/investors/default.aspx',
}

# Manual download folder - place PDFs here and they'll be processed
MANUAL_DOWNLOAD_DIR = os.path.join(os.path.dirname(__file__), 'downloads', 'manual')
os.makedirs(MANUAL_DOWNLOAD_DIR, exist_ok=True)


# =============================================================================
# SEDAR+ API
# =============================================================================

SEDAR_BASE_URL = "https://www.sedarplus.ca"
SEDAR_API_URL = "https://www.sedarplus.ca/csa-party/records/search"

# Filing categories we're interested in
QUARTERLY_FILING_TYPES = [
    "Interim financial statements",
    "Annual financial statements",
    "MD&A - Interim",
    "MD&A - Annual",
    "News release",
    "Technical Report"
]


def search_sedar_filings(
    company_name: str = None,
    ticker: str = None,
    filing_types: List[str] = None,
    days_back: int = 30,
    limit: int = 50
) -> List[Dict]:
    """
    Search SEDAR+ for recent filings.

    Note: SEDAR+ uses a complex search API. This is a simplified version.
    For production, you may need to handle pagination and authentication.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }

    from_date = (datetime.now() - timedelta(days=days_back)).strftime('%Y-%m-%d')
    to_date = datetime.now().strftime('%Y-%m-%d')

    # SEDAR+ search payload
    payload = {
        "from": 0,
        "size": limit,
        "query": {
            "bool": {
                "must": [
                    {"range": {"filingDate": {"gte": from_date, "lte": to_date}}}
                ]
            }
        }
    }

    # Add company filter if provided
    if company_name:
        payload["query"]["bool"]["must"].append({
            "match": {"issuerName": company_name}
        })

    try:
        response = requests.post(
            SEDAR_API_URL,
            headers=headers,
            json=payload,
            timeout=30
        )

        if response.status_code == 200:
            data = response.json()
            return data.get('hits', {}).get('hits', [])
        else:
            logger.warning(f"SEDAR+ API returned {response.status_code}")
            return []

    except Exception as e:
        logger.error(f"SEDAR+ search failed: {e}")
        return []


def get_sedar_filing_url(filing_id: str) -> Optional[str]:
    """Get download URL for a SEDAR+ filing."""
    return f"{SEDAR_BASE_URL}/csa-party/records/{filing_id}/content"


# =============================================================================
# ALTERNATIVE: TMX MONEY RSS
# =============================================================================

TMX_RSS_URL = "https://api.tmxmoney.com/news/search/xml"


def fetch_tmx_filings(ticker: str, days_back: int = 30) -> List[Dict]:
    """
    Fetch recent filings/news from TMX Money.
    This catches earnings announcements which link to full reports.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }

    try:
        params = {
            'symbol': ticker,
            'page': 1,
            'limit': 50
        }

        response = requests.get(TMX_RSS_URL, params=params, headers=headers, timeout=15)

        if response.status_code == 200:
            # Parse XML response with error handling
            import xml.etree.ElementTree as ET
            try:
                # Try to clean up any problematic characters
                content = response.content.decode('utf-8', errors='ignore')
                # Remove any null bytes or invalid XML chars
                content = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', content)
                root = ET.fromstring(content)
            except ET.ParseError as pe:
                logger.warning(f"TMX XML parse error for {ticker}: {pe}")
                return []

            filings = []
            for item in root.findall('.//item'):
                title = item.findtext('title', '')
                link = item.findtext('link', '')
                pub_date = item.findtext('pubDate', '')

                # Check if it's a quarterly/annual report
                if any(kw in title.lower() for kw in [
                    'quarterly', 'annual', 'q1', 'q2', 'q3', 'q4',
                    'financial statements', 'md&a', 'results'
                ]):
                    filings.append({
                        'ticker': ticker,
                        'title': title,
                        'url': link,
                        'date': pub_date,
                        'source': 'TMX Money'
                    })

            return filings
    except Exception as e:
        logger.error(f"TMX fetch failed for {ticker}: {e}")

    return []


# =============================================================================
# NEWSFILE PRESS RELEASES
# =============================================================================

NEWSFILE_SEARCH_URL = "https://www.newsfilecorp.com/api/search"


def fetch_newsfile_releases(ticker: str, company_name: str = None, days_back: int = 30) -> List[Dict]:
    """
    Search Newsfile for press releases with quarterly report PDFs.
    Many mining companies use Newsfile for their press releases.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
    }

    filings = []

    try:
        # Search by ticker
        search_terms = [ticker]
        if company_name:
            # Add company name without common suffixes
            clean_name = company_name.replace(' Ltd', '').replace(' Limited', '').replace(' Inc', '').replace(' Corp', '').strip()
            search_terms.append(clean_name.split()[0])  # First word of company name

        for term in search_terms:
            try:
                response = requests.get(
                    f"https://www.newsfilecorp.com/release/{ticker}",
                    headers=headers,
                    timeout=15
                )

                if response.status_code == 200:
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(response.text, 'html.parser')

                    # Find press release links
                    for link in soup.find_all('a', href=True):
                        href = link['href']
                        text = link.get_text().lower()

                        # Check for quarterly/annual keywords
                        if any(kw in text for kw in [
                            'quarterly', 'annual', 'q1', 'q2', 'q3', 'q4',
                            'financial results', 'production results', 'md&a'
                        ]):
                            if '.pdf' in href.lower():
                                filings.append({
                                    'ticker': ticker,
                                    'title': link.get_text().strip()[:100],
                                    'url': href if href.startswith('http') else f"https://www.newsfilecorp.com{href}",
                                    'source': 'Newsfile'
                                })
            except Exception as e:
                logger.debug(f"Newsfile search failed for {term}: {e}")
                continue

    except Exception as e:
        logger.error(f"Newsfile fetch failed for {ticker}: {e}")

    return filings[:10]  # Limit results


def scrape_newsfile_article_for_pdfs(url: str, ticker: str) -> List[Dict]:
    """
    Scrape a Newsfile article page to find PDF attachments.
    """
    reports = []
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }

    try:
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code == 200:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(response.text, 'html.parser')

            # Find all links
            for link in soup.find_all('a', href=True):
                href = link['href']

                # Look for PDF links
                if '.pdf' in href.lower():
                    # Make absolute URL if needed
                    if href.startswith('/'):
                        href = f"https://www.newsfilecorp.com{href}"

                    reports.append({
                        'ticker': ticker,
                        'title': link.get_text().strip()[:100] or 'PDF Attachment',
                        'url': href,
                        'source': 'Newsfile PDF'
                    })

    except Exception as e:
        logger.debug(f"Newsfile article scrape failed for {url}: {e}")

    return reports


# =============================================================================
# DATABASE NEWS SEARCH
# =============================================================================

def fetch_pdf_links_from_news(ticker: str, company_name: str = None, days_back: int = 30) -> List[Dict]:
    """
    Search the news table for articles with PDF links.
    Searches by ticker OR by company name in title.
    Many press releases contain direct links to quarterly reports.
    """
    reports = []

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Build search terms from company name
        search_terms = [ticker]
        if company_name:
            # Extract first word of company name (e.g., "Agnico" from "Agnico Eagle Mines Limited")
            words = company_name.split()
            if words:
                search_terms.append(words[0])

        # Try each search term
        for term in search_terms:
            query = """
                SELECT id, title, url, description, published_at
                FROM news
                WHERE (ticker = ? OR LOWER(title) LIKE ?)
                  AND published_at >= date('now', '-' || ? || ' days')
                  AND (
                      LOWER(title) LIKE '%quarterly%' OR
                      LOWER(title) LIKE '%q1%' OR LOWER(title) LIKE '%q2%' OR
                      LOWER(title) LIKE '%q3%' OR LOWER(title) LIKE '%q4%' OR
                      LOWER(title) LIKE '%annual%' OR
                      LOWER(title) LIKE '%financial%' OR
                      LOWER(title) LIKE '%production%' OR
                      LOWER(title) LIKE '%results%' OR
                      LOWER(title) LIKE '%md&a%' OR
                      LOWER(title) LIKE '%43-101%' OR
                      LOWER(title) LIKE '%technical report%'
                  )
                ORDER BY published_at DESC
                LIMIT 20
            """
            cursor.execute(query, (term, f'%{term.lower()}%', days_back))

            for row in cursor.fetchall():
                description = row['description'] or ''
                title = row['title'] or ''
                url = row['url'] or ''

                # Look for PDF links in description
                pdf_pattern = r'https?://[^\s<>"\']+\.pdf'
                pdf_links = re.findall(pdf_pattern, description, re.IGNORECASE)

                for pdf_url in pdf_links:
                    # Avoid duplicates
                    if not any(r['url'] == pdf_url for r in reports):
                        reports.append({
                            'ticker': ticker,
                            'title': f"{title[:80]}...",
                            'url': pdf_url,
                            'date': row['published_at'],
                            'source': 'News DB',
                            'news_id': row['id']
                        })

                # Also add the news URL itself if it's a Newsfile article
                if url and 'newsfile' in url.lower():
                    if not any(r['url'] == url for r in reports):
                        reports.append({
                            'ticker': ticker,
                            'title': title,
                            'url': url,
                            'date': row['published_at'],
                            'source': 'Newsfile Article',
                            'news_id': row['id']
                        })

        conn.close()

    except Exception as e:
        logger.error(f"News DB search failed for {ticker}: {e}")

    return reports


# =============================================================================
# COMPANY IR PAGE SCRAPING
# =============================================================================

# Common investor relations page patterns
IR_PAGE_PATTERNS = [
    "{website}/investors",
    "{website}/investor-relations",
    "{website}/investors/financials",
    "{website}/investors/reports",
    "{website}/en/investors"
]


def find_ir_page(website: str) -> Optional[str]:
    """Try to find a company's investor relations page."""
    if not website:
        return None

    # Normalize website URL
    if not website.startswith('http'):
        website = f"https://{website}"
    website = website.rstrip('/')

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }

    for pattern in IR_PAGE_PATTERNS:
        url = pattern.format(website=website)
        try:
            response = requests.head(url, headers=headers, timeout=5, allow_redirects=True)
            if response.status_code == 200:
                return url
        except requests.RequestException:
            continue

    return None


def scrape_ir_page_for_reports(ir_url: str, ticker: str) -> List[Dict]:
    """
    Scrape an investor relations page for quarterly report PDFs.
    Returns list of PDF URLs found.
    """
    if not ir_url:
        return []

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }

    try:
        response = requests.get(ir_url, headers=headers, timeout=15)
        response.raise_for_status()

        from bs4 import BeautifulSoup
        soup = BeautifulSoup(response.text, 'html.parser')

        reports = []

        # Find all PDF links
        for link in soup.find_all('a', href=True):
            href = link['href']
            text = link.get_text().lower()

            # Check if it's a PDF and looks like a quarterly report
            if '.pdf' in href.lower():
                if any(kw in text or kw in href.lower() for kw in [
                    'q1', 'q2', 'q3', 'q4', 'quarterly', 'annual',
                    'financial', 'md&a', 'mda', 'interim', 'report'
                ]):
                    # Make absolute URL
                    if href.startswith('/'):
                        from urllib.parse import urljoin
                        href = urljoin(ir_url, href)

                    reports.append({
                        'ticker': ticker,
                        'title': link.get_text().strip()[:100],
                        'url': href,
                        'source': 'Company IR'
                    })

        return reports[:20]  # Limit to 20 most recent

    except Exception as e:
        logger.error(f"IR scrape failed for {ir_url}: {e}")
        return []


# =============================================================================
# DOWNLOAD AND STORE
# =============================================================================

def download_report(url: str, ticker: str, title: str = "") -> Optional[str]:
    """
    Download a report PDF and save to the reports directory.
    Returns the local file path or None if failed.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }

    try:
        response = requests.get(url, headers=headers, timeout=60, stream=True)
        response.raise_for_status()

        # Check content type
        content_type = response.headers.get('content-type', '')
        if 'pdf' not in content_type.lower() and not url.lower().endswith('.pdf'):
            logger.warning(f"Not a PDF: {url}")
            return None

        # Generate filename
        url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
        safe_title = re.sub(r'[^\w\s-]', '', title)[:50].strip()
        date_str = datetime.now().strftime('%Y%m%d')
        filename = f"{ticker}_{date_str}_{safe_title}_{url_hash}.pdf"

        # Create ticker subdirectory
        ticker_dir = os.path.join(REPORTS_DIR, ticker)
        os.makedirs(ticker_dir, exist_ok=True)

        filepath = os.path.join(ticker_dir, filename)

        # Check if already downloaded
        if os.path.exists(filepath):
            logger.info(f"Already downloaded: {filename}")
            return filepath

        # Download
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        file_size = os.path.getsize(filepath)
        logger.info(f"Downloaded: {filename} ({file_size/1024:.1f} KB)")

        return filepath

    except Exception as e:
        logger.error(f"Download failed for {url}: {e}")
        return None


def get_downloaded_files() -> set:
    """Get set of already downloaded file hashes to avoid duplicates."""
    downloaded = set()
    for root, dirs, files in os.walk(REPORTS_DIR):
        for f in files:
            if f.endswith('.pdf'):
                # Extract hash from filename
                parts = f.rsplit('_', 1)
                if len(parts) == 2:
                    downloaded.add(parts[1].replace('.pdf', ''))
    return downloaded


# =============================================================================
# MAIN FETCH LOGIC
# =============================================================================

def infer_company_website(company_name: str) -> Optional[str]:
    """Try to infer a company's website from its name."""
    if not company_name:
        return None

    # Clean up company name
    name = company_name.lower()
    for suffix in [' limited', ' ltd', ' ltd.', ' inc', ' inc.', ' corp', ' corp.', ' corporation', ' mines', ' mining', ' gold', ' resources', ' metals']:
        name = name.replace(suffix, '')
    name = name.strip()

    # Get first two words (handles "Agnico Eagle" -> "agnicoeagle")
    words = name.split()
    two_word = ''.join(words[:2]) if len(words) >= 2 else words[0]
    first_word = words[0]

    # Common mining company website patterns
    patterns = [
        f"https://www.{two_word}.com",
        f"https://{two_word}.com",
        f"https://www.{first_word}.com",
        f"https://www.{name.replace(' ', '')}.com",
        f"https://{name.replace(' ', '')}.com",
        f"https://www.{name.replace(' ', '-')}.com",
    ]

    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

    for url in patterns:
        try:
            response = requests.head(url, headers=headers, timeout=5, allow_redirects=True)
            if response.status_code == 200:
                return url
        except requests.RequestException:
            continue

    return None


def fetch_sedar_quarterly_reports(company_name: str, ticker: str, days_back: int = 30) -> List[Dict]:
    """
    Fetch quarterly reports directly from SEDAR+ using company name.
    Returns list of filing dictionaries with PDF URLs.
    """
    filings = search_sedar_filings(company_name=company_name, days_back=days_back, limit=50)

    reports = []
    for filing in filings:
        source = filing.get('_source', {})
        filing_type = source.get('formType', '')

        # Only interested in quarterly filings
        if not any(qt.lower() in filing_type.lower() for qt in [
            'interim financial', 'annual financial', 'md&a', 'quarterly'
        ]):
            continue

        filing_id = source.get('filingId', '')
        if filing_id:
            reports.append({
                'ticker': ticker,
                'title': f"{filing_type} - {source.get('filingDate', '')}",
                'url': get_sedar_filing_url(filing_id),
                'date': source.get('filingDate', ''),
                'source': 'SEDAR+'
            })

    return reports


def fetch_reports_for_company(ticker: str, days_back: int = 30) -> Dict:
    """Fetch quarterly reports for a single company."""
    logger.info(f"Fetching reports for {ticker}...")

    company = get_company(ticker)
    if not company:
        return {'ticker': ticker, 'error': 'Company not found'}

    company_name = company.get('name')
    results = {
        'ticker': ticker,
        'company_name': company_name,
        'reports_found': [],
        'reports_downloaded': [],
        'queued_for_extraction': 0
    }

    # 1. Search our news database (most reliable - already collected)
    news_reports = fetch_pdf_links_from_news(ticker, company_name, days_back)
    results['reports_found'].extend(news_reports)
    logger.info(f"  News DB: {len(news_reports)} articles found")

    # 2. Try SEDAR+ (may require auth)
    sedar_reports = fetch_sedar_quarterly_reports(company_name, ticker, days_back)
    results['reports_found'].extend(sedar_reports)
    if sedar_reports:
        logger.info(f"  SEDAR+: {len(sedar_reports)} reports found")

    # 3. Try TMX Money
    tmx_reports = fetch_tmx_filings(ticker, days_back)
    results['reports_found'].extend(tmx_reports)
    if tmx_reports:
        logger.info(f"  TMX Money: {len(tmx_reports)} reports found")

    # 4. Try Newsfile press releases
    newsfile_reports = fetch_newsfile_releases(ticker, company_name, days_back)
    results['reports_found'].extend(newsfile_reports)
    if newsfile_reports:
        logger.info(f"  Newsfile: {len(newsfile_reports)} reports found")

    # 5. Try known IR page if configured
    if ticker in KNOWN_IR_PAGES:
        ir_url = KNOWN_IR_PAGES[ticker]
        logger.info(f"  Using known IR page: {ir_url}")
        ir_reports = scrape_ir_page_for_reports(ir_url, ticker)
        results['reports_found'].extend(ir_reports)
        if ir_reports:
            logger.info(f"  Known IR: {len(ir_reports)} reports found")
    else:
        # 6. Try to find company IR page
        website = company.get('website')
        if not website:
            website = infer_company_website(company_name)
            if website:
                logger.info(f"  Inferred website: {website}")

        if website:
            ir_url = find_ir_page(website)
            if ir_url:
                ir_reports = scrape_ir_page_for_reports(ir_url, ticker)
                results['reports_found'].extend(ir_reports)
                if ir_reports:
                    logger.info(f"  IR page: {len(ir_reports)} reports found")

    # 7. For Newsfile article URLs, scrape for PDF links
    additional_pdfs = []
    for report in results['reports_found']:
        url = report.get('url', '')
        if url and 'newsfile' in url.lower() and not url.lower().endswith('.pdf'):
            logger.info(f"  Scraping Newsfile article: {url[:60]}...")
            pdfs = scrape_newsfile_article_for_pdfs(url, ticker)
            additional_pdfs.extend(pdfs)
            if pdfs:
                logger.info(f"    Found {len(pdfs)} PDF(s) in article")

    results['reports_found'].extend(additional_pdfs)

    # 8. Download new reports
    downloaded_hashes = get_downloaded_files()

    for report in results['reports_found']:
        url = report.get('url', '')
        if not url or not url.lower().endswith('.pdf'):
            continue

        url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
        if url_hash in downloaded_hashes:
            continue

        filepath = download_report(url, ticker, report.get('title', ''))
        if filepath:
            results['reports_downloaded'].append({
                'file': filepath,
                'url': url,
                'title': report.get('title')
            })

            # Queue for extraction - determine type based on keywords
            extraction_type = 'earnings'
            title_lower = (report.get('title', '') or '').lower()
            if '43-101' in title_lower or 'technical report' in title_lower:
                extraction_type = 'technical_report'

            add_to_extraction_queue(
                ticker=ticker,
                extraction_type=extraction_type,
                url=filepath,  # Local file path
                source='quarterly_fetch',
                priority=3
            )
            results['queued_for_extraction'] += 1

    return results


def fetch_all_quarterly_reports(
    tickers: List[str] = None,
    days_back: int = 30,
    limit: int = 50
) -> Dict:
    """
    Fetch quarterly reports for multiple companies.

    Args:
        tickers: List of tickers to fetch (None = all tracked companies)
        days_back: Look back this many days
        limit: Max companies to process
    """
    logger.info("=" * 60)
    logger.info(f"Starting quarterly report fetch at {datetime.now().isoformat()}")

    if tickers is None:
        tickers = get_company_tickers()[:limit]

    logger.info(f"Processing {len(tickers)} companies...")

    stats = {
        'companies_processed': 0,
        'total_reports_found': 0,
        'total_downloaded': 0,
        'total_queued': 0,
        'errors': []
    }

    for ticker in tickers:
        try:
            result = fetch_reports_for_company(ticker, days_back)
            stats['companies_processed'] += 1
            stats['total_reports_found'] += len(result.get('reports_found', []))
            stats['total_downloaded'] += len(result.get('reports_downloaded', []))
            stats['total_queued'] += result.get('queued_for_extraction', 0)
        except Exception as e:
            logger.error(f"Error processing {ticker}: {e}")
            stats['errors'].append({'ticker': ticker, 'error': str(e)})

    logger.info(f"Fetch complete: {stats['total_downloaded']} reports downloaded")
    logger.info("=" * 60)

    return stats


def process_manual_downloads() -> Dict:
    """
    Process PDFs manually placed in the downloads/manual folder.

    File naming convention:
      {TICKER}_{description}.pdf
      Example: AEM_Q3_2024_MDA.pdf, NEM_Annual_Report_2024.pdf

    Files without a ticker prefix will be skipped.
    """
    logger.info("=" * 60)
    logger.info("Processing manual downloads...")

    stats = {
        'files_found': 0,
        'files_processed': 0,
        'files_skipped': 0,
        'queued': 0
    }

    if not os.path.exists(MANUAL_DOWNLOAD_DIR):
        logger.info(f"Manual download folder not found: {MANUAL_DOWNLOAD_DIR}")
        return stats

    for filename in os.listdir(MANUAL_DOWNLOAD_DIR):
        if not filename.lower().endswith('.pdf'):
            continue

        stats['files_found'] += 1
        filepath = os.path.join(MANUAL_DOWNLOAD_DIR, filename)

        # Extract ticker from filename (expected: TICKER_description.pdf)
        parts = filename.split('_', 1)
        if len(parts) < 2:
            logger.warning(f"Skipping {filename} - no ticker prefix (use TICKER_description.pdf format)")
            stats['files_skipped'] += 1
            continue

        ticker = parts[0].upper()

        # Verify ticker exists in database
        company = get_company(ticker)
        if not company:
            logger.warning(f"Skipping {filename} - ticker {ticker} not found in database")
            stats['files_skipped'] += 1
            continue

        # Move to ticker-specific folder
        ticker_dir = os.path.join(REPORTS_DIR, ticker)
        os.makedirs(ticker_dir, exist_ok=True)

        dest_path = os.path.join(ticker_dir, filename)

        # Check if already processed
        if os.path.exists(dest_path):
            logger.info(f"Already processed: {filename}")
            stats['files_skipped'] += 1
            continue

        # Move file
        import shutil
        shutil.move(filepath, dest_path)
        logger.info(f"Moved: {filename} -> {ticker}/")

        # Determine extraction type
        extraction_type = 'earnings'
        if '43-101' in filename.lower() or 'technical' in filename.lower():
            extraction_type = 'technical_report'

        # Queue for extraction
        add_to_extraction_queue(
            ticker=ticker,
            extraction_type=extraction_type,
            url=dest_path,
            source='manual_download',
            priority=2  # Higher priority for manual downloads
        )

        stats['files_processed'] += 1
        stats['queued'] += 1

    logger.info(f"Manual processing complete: {stats['files_processed']} files queued")
    logger.info("=" * 60)

    return stats


# =============================================================================
# CLI
# =============================================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Quarterly Report Fetcher")
    parser.add_argument("--ticker", type=str, help="Fetch for specific ticker")
    parser.add_argument("--all", action="store_true", help="Fetch for all companies")
    parser.add_argument("--days", type=int, default=30, help="Days to look back")
    parser.add_argument("--limit", type=int, default=20, help="Max companies to process")
    parser.add_argument("--list-downloads", action="store_true", help="List downloaded files")
    parser.add_argument("--process-manual", action="store_true", help="Process manually downloaded PDFs")

    args = parser.parse_args()

    if args.process_manual:
        print(f"\nManual download folder: {MANUAL_DOWNLOAD_DIR}")
        print("File naming: {TICKER}_{description}.pdf")
        print("Example: AEM_Q3_2024_MDA.pdf\n")

        stats = process_manual_downloads()
        print(f"\nManual Processing Summary:")
        print(f"  Files found: {stats['files_found']}")
        print(f"  Files processed: {stats['files_processed']}")
        print(f"  Files skipped: {stats['files_skipped']}")
        print(f"  Queued for extraction: {stats['queued']}")

    elif args.list_downloads:
        print(f"\nDownloaded reports in: {REPORTS_DIR}\n")
        for ticker_dir in sorted(os.listdir(REPORTS_DIR)):
            dir_path = os.path.join(REPORTS_DIR, ticker_dir)
            if os.path.isdir(dir_path):
                files = os.listdir(dir_path)
                print(f"{ticker_dir}: {len(files)} files")
                for f in files[:5]:
                    print(f"  - {f}")
                if len(files) > 5:
                    print(f"  ... and {len(files)-5} more")

        print(f"\nManual download folder: {MANUAL_DOWNLOAD_DIR}")
        manual_files = [f for f in os.listdir(MANUAL_DOWNLOAD_DIR) if f.endswith('.pdf')] if os.path.exists(MANUAL_DOWNLOAD_DIR) else []
        print(f"  Pending manual files: {len(manual_files)}")

    elif args.ticker:
        result = fetch_reports_for_company(args.ticker.upper(), args.days)
        print(f"\nResults for {args.ticker}:")
        print(f"  Reports found: {len(result['reports_found'])}")
        print(f"  Downloaded: {len(result['reports_downloaded'])}")
        print(f"  Queued: {result['queued_for_extraction']}")

        if result['reports_downloaded']:
            print("\n  Downloaded files:")
            for r in result['reports_downloaded']:
                print(f"    - {r['file']}")

    elif args.all:
        stats = fetch_all_quarterly_reports(days_back=args.days, limit=args.limit)
        print(f"\nFetch Summary:")
        print(f"  Companies processed: {stats['companies_processed']}")
        print(f"  Reports found: {stats['total_reports_found']}")
        print(f"  Reports downloaded: {stats['total_downloaded']}")
        print(f"  Queued for extraction: {stats['total_queued']}")
        if stats['errors']:
            print(f"  Errors: {len(stats['errors'])}")

    else:
        print("Quarterly Report Fetcher")
        print("=" * 50)
        print(f"\nReports directory: {REPORTS_DIR}")
        print(f"Manual upload folder: {MANUAL_DOWNLOAD_DIR}")
        print("\nUsage:")
        print("  python fetch_quarterly_reports.py --ticker AEM")
        print("  python fetch_quarterly_reports.py --all --limit 10")
        print("  python fetch_quarterly_reports.py --list-downloads")
        print("  python fetch_quarterly_reports.py --process-manual")
        print("\nAutomatic fetching:")
        print("  1. Searches news database for quarterly/production articles")
        print("  2. Scrapes Newsfile articles for PDF links")
        print("  3. Checks known company IR pages")
        print("  4. Downloads PDFs to ./downloads/quarterly_reports/{ticker}/")
        print("  5. Queues them for extraction")
        print("\nManual SEDAR+ workflow:")
        print("  1. Go to https://www.sedarplus.ca and search for filings")
        print("  2. Download quarterly reports (MD&A, Financial Statements)")
        print("  3. Rename files: {TICKER}_{description}.pdf")
        print("     Example: AEM_Q3_2024_MDA.pdf")
        print("  4. Place in ./downloads/manual/")
        print("  5. Run: python fetch_quarterly_reports.py --process-manual")
