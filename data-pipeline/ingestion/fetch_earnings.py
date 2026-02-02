"""
Fetch and Extract Earnings Data
Combines scraping and extraction to get production data from company reports.

Workflow:
1. Find latest earnings/production press releases via RSS feeds
2. Fetch the full text content
3. Extract structured production data
4. Save to database
"""

import json
import logging
import os
import sys
from datetime import datetime
from typing import Dict, List, Optional

import requests
from bs4 import BeautifulSoup

# Add paths
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'processing'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'config'))

from db_manager import get_company
from earnings_extractor import EarningsExtractor, ProductionData

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)


# Company IR pages for direct access
COMPANY_IR_URLS = {
    "AEM": "https://www.agnicoeagle.com/English/investor-relations/news-and-events/news-releases/default.aspx",
    "ABX": "https://www.barrick.com/English/news/default.aspx",
    "K": "https://www.kinross.com/news/default.aspx",
    "NEM": "https://www.newmont.com/investors/news-releases/",
    "LUG": "https://lundingold.com/investors/news/",
    "AGI": "https://www.alamosgold.com/investors/news-releases",
    "BTO": "https://www.b2gold.com/investors/press-releases/",
    "ELD": "https://www.eldoradogold.com/investors/news-and-events/news-releases/",
}


class EarningsFetcher:
    """Fetch and extract earnings data from company sources."""

    def __init__(self, use_llm: bool = True):
        self.extractor = EarningsExtractor(use_llm=use_llm)
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })

    def fetch_url_content(self, url: str) -> Optional[str]:
        """Fetch and parse content from URL."""
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')

            # Remove non-content elements
            for element in soup(['script', 'style', 'nav', 'footer', 'header']):
                element.decompose()

            return soup.get_text(separator='\n', strip=True)

        except Exception as e:
            logging.error(f"Failed to fetch {url}: {e}")
            return None

    def find_earnings_links(self, ir_url: str, ticker: str) -> List[Dict]:
        """Find earnings/production press release links from IR page."""
        try:
            response = self.session.get(ir_url, timeout=30)
            soup = BeautifulSoup(response.text, 'html.parser')

            links = []
            keywords = ['production', 'results', 'quarterly', 'q1', 'q2', 'q3', 'q4', 'operating']

            for a in soup.find_all('a', href=True):
                text = a.get_text().lower()
                if any(kw in text for kw in keywords):
                    href = a['href']
                    if not href.startswith('http'):
                        # Make absolute URL
                        from urllib.parse import urljoin
                        href = urljoin(ir_url, href)

                    links.append({
                        'title': a.get_text().strip(),
                        'url': href,
                        'ticker': ticker
                    })

            return links[:10]  # Limit to 10 most recent

        except Exception as e:
            logging.error(f"Failed to find links from {ir_url}: {e}")
            return []

    def extract_from_press_release(self, url: str, ticker: str) -> List[ProductionData]:
        """Extract production data from a press release URL."""
        content = self.fetch_url_content(url)
        if not content:
            return []

        results = self.extractor.extract_from_text(content, source_url=url)

        # Add ticker context
        company = get_company(ticker)
        if company:
            for r in results:
                if not r.mine_name:
                    r.mine_name = company.get('name', ticker)

        return results

    def fetch_company_earnings(self, ticker: str) -> Dict:
        """Fetch and extract earnings data for a specific company."""
        logging.info(f"Fetching earnings for {ticker}")

        result = {
            'ticker': ticker,
            'sources_checked': 0,
            'data_extracted': [],
            'errors': []
        }

        # Check if we have IR URL for this company
        ir_url = COMPANY_IR_URLS.get(ticker)

        if ir_url:
            links = self.find_earnings_links(ir_url, ticker)
            logging.info(f"Found {len(links)} potential earnings links")

            for link in links[:3]:  # Process top 3
                result['sources_checked'] += 1
                try:
                    data = self.extract_from_press_release(link['url'], ticker)
                    if data:
                        result['data_extracted'].extend([
                            {
                                'source': link['title'],
                                'url': link['url'],
                                'data': [d.__dict__ for d in data]
                            }
                        ])
                except Exception as e:
                    result['errors'].append(f"{link['url']}: {str(e)}")
        else:
            result['errors'].append(f"No IR URL configured for {ticker}")

        return result

    def fetch_all_tier1(self) -> Dict:
        """Fetch earnings for all Tier 1 producers."""
        from target_producers import PRIORITY_TIERS

        results = {
            'timestamp': datetime.now().isoformat(),
            'companies': {}
        }

        for ticker in PRIORITY_TIERS.get('tier1_majors', []):
            if ticker in COMPANY_IR_URLS:
                results['companies'][ticker] = self.fetch_company_earnings(ticker)

        return results


def interactive_extract():
    """Interactive mode for testing extraction."""
    print("\nEarnings Data Extractor - Interactive Mode")
    print("=" * 50)

    fetcher = EarningsFetcher(use_llm=False)  # Start with pattern matching

    while True:
        print("\nOptions:")
        print("  1. Extract from URL")
        print("  2. Extract from file")
        print("  3. Fetch company earnings (by ticker)")
        print("  4. Toggle LLM mode")
        print("  5. Exit")

        choice = input("\nChoice: ").strip()

        if choice == '1':
            url = input("Enter URL: ").strip()
            if url:
                print("\nExtracting...")
                content = fetcher.fetch_url_content(url)
                if content:
                    results = fetcher.extractor.extract_from_text(content, source_url=url)
                    print(f"\nFound {len(results)} records:")
                    for r in results:
                        print(f"  - {r.mine_name}: {r.gold_oz} oz gold")
                else:
                    print("Failed to fetch content")

        elif choice == '2':
            path = input("Enter file path: ").strip()
            if os.path.exists(path):
                results = fetcher.extractor.extract_from_pdf(path)
                print(f"\nFound {len(results)} records:")
                for r in results:
                    print(f"  - {r.mine_name}: {r.gold_oz} oz gold")
            else:
                print("File not found")

        elif choice == '3':
            ticker = input("Enter ticker (e.g., AEM, ABX, K): ").strip().upper()
            if ticker:
                result = fetcher.fetch_company_earnings(ticker)
                print(f"\nResults for {ticker}:")
                print(f"  Sources checked: {result['sources_checked']}")
                print(f"  Data extracted: {len(result['data_extracted'])} sources")
                if result['errors']:
                    print(f"  Errors: {len(result['errors'])}")

        elif choice == '4':
            current = "LLM" if fetcher.extractor.use_llm else "Pattern"
            new_mode = not fetcher.extractor.use_llm
            fetcher.extractor.use_llm = new_mode
            print(f"Switched from {current} to {'LLM' if new_mode else 'Pattern'} mode")

        elif choice == '5':
            break


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Fetch and extract earnings data")
    parser.add_argument("--ticker", type=str, help="Fetch for specific ticker")
    parser.add_argument("--tier1", action="store_true", help="Fetch for all Tier 1 producers")
    parser.add_argument("--interactive", action="store_true", help="Interactive mode")
    parser.add_argument("--no-llm", action="store_true", help="Use pattern matching only")
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    if args.interactive:
        interactive_extract()

    elif args.ticker:
        fetcher = EarningsFetcher(use_llm=not args.no_llm)
        result = fetcher.fetch_company_earnings(args.ticker.upper())

        if args.json:
            print(json.dumps(result, indent=2, default=str))
        else:
            print(f"\nResults for {args.ticker}:")
            print(f"  Sources checked: {result['sources_checked']}")
            for item in result['data_extracted']:
                print(f"\n  Source: {item['source']}")
                for data in item['data']:
                    print(f"    - {data.get('mine_name')}: {data.get('gold_oz')} oz")

    elif args.tier1:
        fetcher = EarningsFetcher(use_llm=not args.no_llm)
        results = fetcher.fetch_all_tier1()

        if args.json:
            print(json.dumps(results, indent=2, default=str))
        else:
            print(f"\nFetched earnings for {len(results['companies'])} companies")

    else:
        print("Fetch and Extract Earnings Data")
        print("=" * 40)
        print("\nUsage:")
        print("  python fetch_earnings.py --ticker AEM")
        print("  python fetch_earnings.py --tier1")
        print("  python fetch_earnings.py --interactive")
        print("\nConfigured companies:")
        for ticker in COMPANY_IR_URLS:
            print(f"  - {ticker}")
