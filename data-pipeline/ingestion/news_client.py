"""
News Client - Fetches financial news from multiple sources

Sources:
1. Finnhub (free tier - 60 calls/min)
2. RSS feeds from major financial news sites

API Docs: https://finnhub.io/docs/api/market-news
"""

import logging
import os
import sys
from datetime import datetime, timedelta
from typing import Dict, List

import requests
from dotenv import load_dotenv

# Load .env file from data-pipeline root
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Add processing dir to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'processing'))

from db_manager import get_all_companies


def get_company_tickers() -> List[str]:
    """Get list of all company tickers from database."""
    companies = get_all_companies()
    return [c['ticker'] for c in companies if c.get('ticker')]

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# =============================================================================
# CONFIGURATION
# =============================================================================

# Finnhub API (free tier: 60 calls/min)
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "")
FINNHUB_BASE_URL = "https://finnhub.io/api/v1"

# NewsAPI.org (free tier: 100 requests/day, 1000 results/request)
NEWSAPI_KEY = os.getenv("NEWSAPI_KEY", "")
NEWSAPI_BASE_URL = "https://newsapi.org/v2"

# Mining-related keywords to filter news (strict filtering for relevance)
MINING_KEYWORDS = [
    # Commodities
    "mining", "gold", "copper", "nickel", "lithium", "uranium", "silver",
    "zinc", "cobalt", "platinum", "palladium", "rare earth", "iron ore",
    # Operations
    "mineral", "ore", "drill", "exploration", "deposit", "reserves",
    "concentrate", "smelter", "refinery", "tailings", "open pit", "underground",
    # Metrics
    "AISC", "all-in sustaining", "head grade", "recovery rate", "ounces",
    "grade", "g/t", "oz/t", "feasibility", "NI 43-101", "resource estimate",
    # Exchanges
    "TSX", "TSXV", "ASX", "LSE:AIM",
    # Major miners
    "barrick", "newmont", "vale", "teck", "agnico", "kinross", "yamana",
    "wheaton", "franco-nevada", "royal gold", "first quantum", "freeport",
    "rio tinto", "bhp", "glencore", "anglo american", "antofagasta",
    # Mining terms
    "miner", "producer", "explorer", "developer", "royalty", "streaming",
    "metallurgy", "assay", "bulk sample", "PEA", "PFS", "DFS"
]


# =============================================================================
# FINNHUB API FUNCTIONS
# =============================================================================

def fetch_market_news(category: str = "general", limit: int = 20) -> List[Dict]:
    """
    Fetch general market news from Finnhub.
    Categories: general, forex, crypto, merger
    """
    if not FINNHUB_API_KEY:
        logging.warning("FINNHUB_API_KEY not set, using RSS fallback")
        return fetch_rss_news(limit)

    try:
        url = f"{FINNHUB_BASE_URL}/news"
        params = {
            "category": category,
            "token": FINNHUB_API_KEY
        }

        logging.info(f"Fetching market news from Finnhub...")
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        articles = response.json()
        logging.info(f"Found {len(articles)} articles from Finnhub")

        return _normalize_finnhub(articles[:limit])

    except Exception as e:
        logging.error(f"Finnhub request failed: {e}")
        return fetch_rss_news(limit)


def fetch_company_news(ticker: str, days_back: int = 7, limit: int = 20) -> List[Dict]:
    """
    Fetch news for a specific company from Finnhub.
    """
    if not FINNHUB_API_KEY:
        logging.warning("FINNHUB_API_KEY not set, using RSS fallback")
        return fetch_rss_news(limit)

    try:
        today = datetime.now()
        from_date = (today - timedelta(days=days_back)).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")

        url = f"{FINNHUB_BASE_URL}/company-news"
        params = {
            "symbol": ticker,
            "from": from_date,
            "to": to_date,
            "token": FINNHUB_API_KEY
        }

        logging.info(f"Fetching news for {ticker} from Finnhub...")
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        articles = response.json()
        logging.info(f"Found {len(articles)} articles for {ticker}")

        normalized = _normalize_finnhub(articles[:limit])
        # Tag with ticker
        for article in normalized:
            article["symbols"] = [ticker]

        return normalized

    except Exception as e:
        logging.error(f"Finnhub company news failed: {e}")
        return []


def _normalize_finnhub(articles: List[Dict]) -> List[Dict]:
    """Normalize Finnhub response to standard format."""
    normalized = []
    for article in articles:
        # Convert unix timestamp
        timestamp = article.get("datetime", 0)
        pub_date = datetime.fromtimestamp(timestamp).isoformat() if timestamp else ""

        normalized.append({
            "id": article.get("id", str(timestamp)),
            "title": article.get("headline", ""),
            "description": article.get("summary", ""),
            "url": article.get("url", ""),
            "source": article.get("source", "Unknown"),
            "published_at": pub_date,
            "symbols": article.get("related", "").split(",") if article.get("related") else [],
            "image": article.get("image", ""),
            "category": article.get("category", "")
        })

    return normalized


# =============================================================================
# NEWSAPI.ORG FUNCTIONS
# =============================================================================

def fetch_newsapi_headlines(query: str = "mining OR gold OR copper", limit: int = 20) -> List[Dict]:
    """
    Fetch top headlines from NewsAPI.org.
    Free tier: 100 requests/day, great for general business news.
    """
    if not NEWSAPI_KEY:
        logging.warning("NEWSAPI_KEY not set, skipping NewsAPI")
        return []

    try:
        url = f"{NEWSAPI_BASE_URL}/everything"
        params = {
            "q": query,
            "language": "en",
            "sortBy": "publishedAt",
            "pageSize": min(limit, 100),
            "apiKey": NEWSAPI_KEY
        }

        logging.info(f"Fetching news from NewsAPI for: {query}")
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()
        if data.get("status") != "ok":
            logging.error(f"NewsAPI error: {data.get('message', 'Unknown error')}")
            return []

        articles = data.get("articles", [])
        logging.info(f"Found {len(articles)} articles from NewsAPI")

        return _normalize_newsapi(articles)

    except Exception as e:
        logging.error(f"NewsAPI request failed: {e}")
        return []


def fetch_newsapi_by_ticker(ticker: str, company_name: str = "", limit: int = 10) -> List[Dict]:
    """
    Fetch news for a specific company from NewsAPI.
    Searches both ticker and company name for better results.
    """
    if not NEWSAPI_KEY:
        return []

    # Build search query - ticker alone often misses results
    query_parts = [ticker]
    if company_name:
        query_parts.append(company_name.split()[0])  # First word of company name
    query = " OR ".join(query_parts)

    try:
        url = f"{NEWSAPI_BASE_URL}/everything"
        params = {
            "q": query,
            "language": "en",
            "sortBy": "relevancy",
            "pageSize": min(limit, 100),
            "apiKey": NEWSAPI_KEY
        }

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()
        articles = data.get("articles", [])

        normalized = _normalize_newsapi(articles)
        # Tag with ticker
        for article in normalized:
            article["symbols"] = [ticker]

        return normalized

    except Exception as e:
        logging.error(f"NewsAPI ticker search failed: {e}")
        return []


def fetch_newsapi_mining_news(limit: int = 30) -> List[Dict]:
    """
    Fetch mining industry news from NewsAPI.
    Uses tight filters to avoid noise.
    """
    # Tight mining-focused query - require "mining" or specific mining terms
    query = '("mining company" OR "gold mining" OR "copper mining" OR "lithium mining" OR "mineral exploration" OR "drill results" OR AISC OR "gold producer" OR "TSX:") AND (production OR exploration OR deposit OR reserves OR quarterly)'

    articles = fetch_newsapi_headlines(query, limit * 2)  # Fetch more, filter down

    # Extra filtering - must contain mining-related terms
    mining_terms = {'mining', 'miner', 'gold', 'copper', 'lithium', 'nickel', 'uranium',
                    'exploration', 'drill', 'deposit', 'ore', 'tsx', 'tsxv', 'production',
                    'ounces', 'reserves', 'aisc', 'barrick', 'newmont', 'agnico'}

    filtered = []
    for article in articles:
        text = (article.get('title', '') + ' ' + article.get('description', '')).lower()
        # Require at least 2 mining terms to reduce noise
        matches = sum(1 for term in mining_terms if term in text)
        if matches >= 2:
            filtered.append(article)

    return filtered[:limit]


def _normalize_newsapi(articles: List[Dict]) -> List[Dict]:
    """Normalize NewsAPI response to standard format."""
    normalized = []
    for article in articles:
        # Extract tickers from title
        title = article.get("title", "") or ""
        symbols = extract_tickers_from_text(title)

        normalized.append({
            "id": article.get("url", ""),
            "title": title,
            "description": (article.get("description", "") or "")[:500],
            "url": article.get("url", ""),
            "source": article.get("source", {}).get("name", "NewsAPI"),
            "published_at": article.get("publishedAt", ""),
            "symbols": symbols,
            "image": article.get("urlToImage", ""),
            "category": "news"
        })

    return normalized


# =============================================================================
# RSS FALLBACK (No API key required)
# =============================================================================

# =============================================================================
# MINING & METALS NEWS FEEDS (All sources are mining/metals focused)
# =============================================================================

MINING_RSS_FEEDS = [
    # TMX Newsfile DataLynx - OFFICIAL TSX/TSXV/CSE Press Releases (PRIMARY SOURCE)
    {
        "name": "TMX Newsfile DataLynx",
        "url": "https://feeds.newsfilecorp.com/feed/DataLynx",
        "category": "press_releases",
        "priority": 0  # Highest priority - official TMX source
    },
    # Mining.com - Main feed (all commodities)
    {
        "name": "Mining.com All",
        "url": "https://www.mining.com/feed/",
        "category": "mining_news",
        "priority": 1
    },
    # Mining.com - Dedicated mining industry news by commodity
    {
        "name": "Mining.com Gold",
        "url": "https://www.mining.com/commodity/gold/feed/",
        "category": "gold",
        "priority": 1
    },
    {
        "name": "Mining.com Copper",
        "url": "https://www.mining.com/commodity/copper/feed/",
        "category": "copper",
        "priority": 1
    },
    {
        "name": "Mining.com Lithium",
        "url": "https://www.mining.com/commodity/lithium/feed/",
        "category": "lithium",
        "priority": 1
    },
    {
        "name": "Mining.com Nickel",
        "url": "https://www.mining.com/commodity/nickel/feed/",
        "category": "nickel",
        "priority": 1
    },
    {
        "name": "Mining.com Uranium",
        "url": "https://www.mining.com/commodity/uranium/feed/",
        "category": "uranium",
        "priority": 1
    },
    {
        "name": "Mining.com Silver",
        "url": "https://www.mining.com/commodity/silver/feed/",
        "category": "silver",
        "priority": 1
    },
    # Seeking Alpha - Investment analysis (filter for mining)
    {
        "name": "Seeking Alpha",
        "url": "https://seekingalpha.com/feed.xml",
        "category": "analysis",
        "priority": 2
    },
    # IGF Mining - Intergovernmental Forum on Mining (policy/sustainability)
    {
        "name": "IGF Mining",
        "url": "https://www.igfmining.org/blog/feed/",
        "category": "mining_policy",
        "priority": 2
    },
    # Financial Post Mining - Canadian business/mining news
    {
        "name": "Financial Post Mining",
        "url": "https://financialpost.com/category/commodities/mining/feed.xml",
        "category": "mining_news",
        "priority": 1
    },
    # Canadian Mining Journal - Industry publication
    {
        "name": "Canadian Mining Journal",
        "url": "https://www.canadianminingjournal.com/feed/",
        "category": "mining_news",
        "priority": 1
    },
    # Canadian Mining Magazine
    {
        "name": "Canadian Mining Magazine",
        "url": "https://canadianminingmagazine.com/feed/",
        "category": "mining_news",
        "priority": 1
    },
]

# =============================================================================
# COMMODITIES & METALS NEWS FEEDS (Fallback - still mining/metals focused)
# =============================================================================

RSS_FEEDS = [
    # Financial Times Precious Metals - Premium financial coverage
    {
        "name": "FT Precious Metals",
        "url": "https://www.ft.com/precious-metals?format=rss",
        "category": "precious_metals"
    },
    # Investing.com Commodities - Gold, Silver, Copper, etc.
    {
        "name": "Investing.com Commodities",
        "url": "https://www.investing.com/rss/news_301.rss",
        "category": "commodities"
    },
    # Kitco News - Precious metals focused
    {
        "name": "Kitco Gold News",
        "url": "https://www.kitco.com/rss/gold.xml",
        "category": "gold"
    },
    # Resource World Magazine
    {
        "name": "Resource World",
        "url": "https://resourceworld.com/feed/",
        "category": "mining_news"
    },
]


def fetch_tmx_newsfile(limit: int = 50, filter_tracked_only: bool = False) -> List[Dict]:
    """
    Fetch news releases from TMX Newsfile official DataLynx RSS feed.
    This is the OFFICIAL source for TSX/TSXV/CSE company announcements.
    
    Args:
        limit: Maximum number of articles to return
        filter_tracked_only: If True, only return news for companies in our database
    
    Returns:
        List of parsed news articles with extracted tickers
    """
    try:
        import feedparser
    except ImportError:
        logging.error("feedparser not installed. Run: pip install feedparser")
        return []

    # Official TMX DataLynx RSS feed
    url = "https://feeds.newsfilecorp.com/feed/DataLynx"

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()

        import io
        feed = feedparser.parse(io.BytesIO(response.content))

        # Get our tracked tickers if filtering is enabled
        our_tickers = set()
        if filter_tracked_only:
            try:
                our_tickers = set(t.upper() for t in get_company_tickers())
                logging.info(f"Filtering for {len(our_tickers)} tracked companies")
            except Exception as e:
                logging.warning(f"Could not get company tickers: {e}")

        articles = []
        for entry in feed.entries:
            # Parse date
            pub_date = ""
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                try:
                    pub_date = datetime(*entry.published_parsed[:6]).isoformat()
                except (ValueError, TypeError):
                    pub_date = entry.get('published', '')

            # Extract tickers from RSS categories (official format: "CNSX:TICO", "TSX:AEM", etc.)
            tickers = []
            isin_codes = []
            if hasattr(entry, 'tags'):
                for tag in entry.tags:
                    term = tag.get('term', '')
                    # Parse exchange:ticker format (e.g., "CNSX:TICO", "TSX:AEM", "TSXV:XYZ")
                    if ':' in term and not term.startswith('ISIN'):
                        parts = term.split(':')
                        if len(parts) == 2:
                            exchange, ticker = parts
                            if exchange.upper() in ('TSX', 'TSXV', 'CNSX', 'CSE', 'NEO'):
                                tickers.append(ticker.upper())
                    # Capture ISIN codes too
                    elif term.startswith('ISIN:'):
                        isin_codes.append(term.replace('ISIN:', ''))
            
            # Also try to extract from title and description as fallback
            title = entry.get('title', '')
            description = entry.get('summary', entry.get('description', ''))
            
            import re
            for text in [title, description]:
                # Match patterns like (TSX: ABC), (TSXV: XYZ), (CSE: DEF)
                for match in re.finditer(r'\((TSX[V]?|CSE|CNSX|NEO):\s*([A-Z]{1,6})\)', text, re.IGNORECASE):
                    ticker = match.group(2).upper()
                    if ticker not in tickers:
                        tickers.append(ticker)

            # Apply company filter if enabled
            if filter_tracked_only and our_tickers:
                matched = [t for t in tickers if t in our_tickers]
                if not matched:
                    continue  # Skip articles not matching our tracked companies
                tickers = matched

            articles.append({
                "id": entry.get('link', entry.get('id', '')),
                "title": title,
                "description": description[:500] if description else "",
                "url": entry.get('link', ''),
                "source": "TMX Newsfile",
                "published_at": pub_date,
                "ticker": tickers[0] if tickers else None,
                "symbols": tickers,
                "isin_codes": isin_codes,
                "category": "press_release",
                "is_press_release": True
            })

            if len(articles) >= limit:
                break

        logging.info(f"Fetched {len(articles)} articles from TMX DataLynx feed" + 
                    (f" (filtered to tracked companies)" if filter_tracked_only else ""))
        return articles

    except Exception as e:
        logging.error(f"Error fetching TMX DataLynx: {e}")
        return []


def fetch_tmx_for_tracked_companies(limit: int = 100) -> List[Dict]:
    """
    Fetch TMX news only for companies we're tracking in the database.
    Wrapper around fetch_tmx_newsfile with filtering enabled.
    """
    return fetch_tmx_newsfile(limit=limit, filter_tracked_only=True)


def fetch_canadian_mining_news(limit: int = 30) -> List[Dict]:
    """
    Fetch press releases from Canadian mining news sources.
    Primary sources: Newsfile (TSX/TSXV), GlobeNewswire, Business Wire
    """
    try:
        import feedparser
    except ImportError:
        logging.error("feedparser not installed. Run: pip install feedparser")
        return []

    all_articles = []

    for feed_info in MINING_RSS_FEEDS:
        try:
            logging.info(f"Fetching from {feed_info['name']}...")
            
            # Use requests with headers to avoid 403/406 from some servers
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            
            try:
                # Fetch content first
                response = requests.get(feed_info["url"], headers=headers, timeout=10)
                if response.status_code != 200:
                    logging.warning(f"Failed to fetch {feed_info['name']}: HTTP {response.status_code}")
                    continue
                    
                # Parse content
                import io
                feed = feedparser.parse(io.BytesIO(response.content))
                
            except Exception as req_err:
                logging.warning(f"Request failed for {feed_info['name']}: {req_err}")
                continue

            if feed.bozo and not feed.entries:
                logging.warning(f"Feed error for {feed_info['name']}: {feed.get('bozo_exception', 'unknown')}")
                continue

            for entry in feed.entries[:15]:
                # Parse date
                pub_date = ""
                if hasattr(entry, 'published_parsed') and entry.published_parsed:
                    try:
                        pub_date = datetime(*entry.published_parsed[:6]).isoformat()
                    except (ValueError, TypeError):
                        pass

                # Extract ticker symbols from title (common format: "Company Name (TSX: ABC)")
                title = entry.get("title", "")
                symbols = extract_tickers_from_text(title)

                all_articles.append({
                    "id": entry.get("id", entry.get("link", "")),
                    "title": title,
                    "description": entry.get("summary", entry.get("description", ""))[:500],
                    "url": entry.get("link", ""),
                    "source": feed_info["name"],
                    "published_at": pub_date,
                    "symbols": symbols,
                    "image": _extract_rss_image(entry),
                    "category": feed_info["category"],
                    "is_press_release": True
                })

            logging.info(f"  Got {len(feed.entries)} items from {feed_info['name']}")

        except Exception as e:
            logging.error(f"Failed to fetch {feed_info['name']}: {e}")
            continue

    # Sort by date (newest first)
    all_articles.sort(key=lambda x: x.get("published_at", ""), reverse=True)

    # Remove duplicates by title similarity
    seen_titles = set()
    unique_articles = []
    for article in all_articles:
        title_key = article["title"][:50].lower()
        if title_key not in seen_titles:
            seen_titles.add(title_key)
            unique_articles.append(article)

    logging.info(f"Found {len(unique_articles)} unique mining press releases")
    return unique_articles[:limit]


def extract_tickers_from_text(text: str) -> List[str]:
    """
    Extract ticker symbols from text.
    Matches patterns like: (TSX: ABC), (TSXV: XYZ), (NYSE: DEF), TSX:ABC
    """
    import re
    patterns = [
        r'\(TSX[V]?[:\s]+([A-Z]{2,5})\)',      # (TSX: ABC) or (TSXV: ABC)
        r'\(NYSE[:\s]+([A-Z]{1,5})\)',          # (NYSE: ABC)
        r'\(NASDAQ[:\s]+([A-Z]{1,5})\)',        # (NASDAQ: ABC)
        r'TSX[V]?[:\s]+([A-Z]{2,5})',           # TSX:ABC without parens
        r'\(([A-Z]{2,5})\.TO\)',                # (ABC.TO)
        r'\(([A-Z]{2,5})\.V\)',                 # (ABC.V) for TSXV
    ]

    symbols = []
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        symbols.extend([m.upper() for m in matches])

    return list(set(symbols))  # Remove duplicates


def fetch_rss_news(limit: int = 20) -> List[Dict]:
    """
    Fetch news from general RSS feeds (fallback/supplementary).
    """
    try:
        import feedparser
    except ImportError:
        logging.error("feedparser not installed. Run: pip install feedparser")
        return []

    all_articles = []

    for feed_info in RSS_FEEDS:
        try:
            logging.info(f"Fetching RSS from {feed_info['name']}...")
            feed = feedparser.parse(feed_info["url"])

            for entry in feed.entries[:10]:
                # Parse date
                pub_date = ""
                if hasattr(entry, 'published_parsed') and entry.published_parsed:
                    try:
                        pub_date = datetime(*entry.published_parsed[:6]).isoformat()
                    except (ValueError, TypeError):
                        pass

                all_articles.append({
                    "id": entry.get("id", entry.get("link", "")),
                    "title": entry.get("title", ""),
                    "description": entry.get("summary", entry.get("description", ""))[:500],
                    "url": entry.get("link", ""),
                    "source": feed_info["name"],
                    "published_at": pub_date,
                    "symbols": [],
                    "image": _extract_rss_image(entry),
                    "category": feed_info["category"]
                })

        except Exception as e:
            logging.error(f"Failed to fetch {feed_info['name']}: {e}")
            continue

    # Sort by date
    all_articles.sort(key=lambda x: x.get("published_at", ""), reverse=True)

    logging.info(f"Found {len(all_articles)} articles from RSS feeds")
    return all_articles[:limit]


# =============================================================================
# MAIN API FUNCTIONS (used by FastAPI)
# =============================================================================

def fetch_news_by_ticker(ticker: str, limit: int = 10) -> List[Dict]:
    """Fetch news articles for a specific ticker symbol."""
    return fetch_company_news(ticker, days_back=14, limit=limit)


def fetch_news_by_tickers(tickers: List[str], limit: int = 20) -> List[Dict]:
    """Fetch news for multiple tickers."""
    all_articles = []
    for ticker in tickers[:5]:  # Limit to avoid rate limits
        articles = fetch_company_news(ticker, days_back=7, limit=5)
        all_articles.extend(articles)

    all_articles.sort(key=lambda x: x.get("published_at", ""), reverse=True)
    return all_articles[:limit]


def fetch_mining_news(limit: int = 30) -> List[Dict]:
    """
    Fetch mining industry news from mining-focused sources only.
    Priority: Canadian mining press releases > Mining RSS feeds > NewsAPI (mining query)

    All sources are strictly mining/metals focused - no general financial news.
    """
    all_articles = []

    # 1. Primary: Mining press releases and news (TMX Newsfile, Mining.com, etc.)
    mining_news = fetch_canadian_mining_news(limit)
    all_articles.extend(mining_news)
    logging.info(f"Got {len(mining_news)} mining press releases/news")

    # 2. NewsAPI with strict mining query (if API key available)
    if NEWSAPI_KEY:
        newsapi_articles = fetch_newsapi_mining_news(limit)
        all_articles.extend(newsapi_articles)
        logging.info(f"Got {len(newsapi_articles)} articles from NewsAPI (mining)")

    # 3. Commodities/metals RSS feeds as supplement (still mining-focused)
    if len(all_articles) < limit:
        rss_articles = fetch_rss_news(limit)
        # Apply strict mining filter to ensure relevance
        filtered_rss = [a for a in rss_articles if _is_mining_related(a)]
        all_articles.extend(filtered_rss)
        logging.info(f"Got {len(filtered_rss)} articles from commodities RSS")

    # Sort by date and deduplicate
    all_articles.sort(key=lambda x: x.get("published_at", ""), reverse=True)

    # Remove duplicates
    seen = set()
    unique = []
    for article in all_articles:
        key = article.get("title", "")[:40].lower()
        if key not in seen:
            seen.add(key)
            unique.append(article)

    # Enrich articles missing images with og:image from article pages
    final_articles = unique[:limit]
    enrich_articles_with_images(final_articles, max_fetch=15)

    return final_articles


def _is_mining_related(article: Dict) -> bool:
    """
    Check if an article is mining/metals related.
    Requires at least 2 mining keywords to be considered relevant.
    """
    text = (article.get("title", "") + " " + article.get("description", "")).lower()
    matches = sum(1 for kw in MINING_KEYWORDS if kw.lower() in text)
    return matches >= 2


def fetch_news_for_tracked_companies(limit: int = 30) -> List[Dict]:
    """Fetch news for all companies in our database."""
    tickers = get_company_tickers()
    if not tickers:
        logging.warning("No tickers found in database")
        return fetch_mining_news(limit)

    return fetch_news_by_tickers(tickers[:5], limit)


# =============================================================================
# FILTERING & ENRICHMENT
# =============================================================================

def filter_relevant_news(articles: List[Dict], our_tickers: List[str] = None) -> List[Dict]:
    """
    Filter articles to those relevant to mining industry.
    Uses strict filtering - requires multiple mining keywords or ticker match.
    """
    if our_tickers is None:
        try:
            our_tickers = get_company_tickers()
        except Exception:
            our_tickers = []

    our_tickers_set = set(t.upper() for t in our_tickers)
    relevant = []

    for article in articles:
        # Check if any of our tickers are mentioned
        article_symbols = set(s.upper() for s in article.get("symbols", []))
        matched_tickers = article_symbols.intersection(our_tickers_set)

        if matched_tickers:
            article["matched_tickers"] = list(matched_tickers)
            relevant.append(article)
        else:
            # Strict mining keyword check - require at least 2 keywords
            if _is_mining_related(article):
                article["matched_tickers"] = []
                relevant.append(article)

    return relevant


def format_for_feed(articles: List[Dict]) -> List[Dict]:
    """Format articles for the intelligence feed display."""
    feed_items = []

    for article in articles:
        pub_date = article.get("published_at", "")
        try:
            if pub_date:
                dt = datetime.fromisoformat(pub_date.replace("Z", "+00:00"))
                time_ago = _time_ago(dt)
            else:
                time_ago = "Recently"
        except (ValueError, TypeError):
            time_ago = "Recently"

        feed_items.append({
            "type": "news",
            "title": article.get("title", "")[:120],
            "description": article.get("description", "")[:200],
            "source": article.get("source", "Unknown"),
            "url": article.get("url", ""),
            "tickers": article.get("matched_tickers", article.get("symbols", []))[:3],
            "time_ago": time_ago,
            "published_at": pub_date
        })

    return feed_items


def _extract_rss_image(entry) -> str:
    """Helper to extract thumbnail URL from common RSS media tags."""
    # 1. Try media:content (standard)
    if hasattr(entry, 'media_content'):
        for media in entry.media_content:
            if 'url' in media and (media.get('medium') == 'image' or 'image' in media.get('type', '')):
                return media['url']
        if len(entry.media_content) > 0 and 'url' in entry.media_content[0]:
            return entry.media_content[0]['url']

    # 2. Try media:thumbnail
    if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
        return entry.media_thumbnail[0]['url']

    # 3. Try enclosure
    if hasattr(entry, 'enclosures'):
        for enc in entry.enclosures:
            if enc.get('type', '').startswith('image'):
                return enc['href']

    # 4. Try looking in summary/content for <img> tag
    import re
    search_text = entry.get('summary', '') + entry.get('content', [{}])[0].get('value' if isinstance(entry.get('content', [{}])[0], dict) else '', '')
    img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', search_text)
    if img_match:
        # Avoid tiny tracking pixels
        src = img_match.group(1)
        if 'track' not in src.lower() and 'pixel' not in src.lower():
            return src

    return ""


def fetch_og_image(url: str, timeout: float = 3.0) -> str:
    """
    Fetch og:image meta tag from an article URL.
    Used as fallback when RSS feeds don't provide images.
    
    Args:
        url: Article URL to fetch
        timeout: Request timeout in seconds (keep short to avoid blocking)
    
    Returns:
        Image URL string, or empty string if not found
    """
    if not url:
        return ""
    
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        response = requests.get(url, headers=headers, timeout=timeout)
        
        if response.status_code != 200:
            return ""
        
        # Parse HTML to find og:image
        import re
        html = response.text[:50000]  # Only check first 50KB for meta tags
        
        # Try og:image first (most common)
        og_match = re.search(
            r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
            html, re.IGNORECASE
        )
        if og_match:
            return og_match.group(1)
        
        # Try alternate format (content before property)
        og_match = re.search(
            r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
            html, re.IGNORECASE
        )
        if og_match:
            return og_match.group(1)
        
        # Try twitter:image as fallback
        tw_match = re.search(
            r'<meta[^>]+(?:name|property)=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']',
            html, re.IGNORECASE
        )
        if tw_match:
            return tw_match.group(1)
        
        return ""
        
    except Exception as e:
        logging.debug(f"Failed to fetch og:image from {url[:50]}...: {e}")
        return ""


def enrich_articles_with_images(articles: List[Dict], max_fetch: int = 10) -> List[Dict]:
    """
    Enrich articles with images by fetching og:image for those missing images.
    
    Args:
        articles: List of article dictionaries
        max_fetch: Maximum number of URLs to fetch (to avoid long delays)
    
    Returns:
        Same articles list with image fields populated where possible
    """
    fetch_count = 0
    
    for article in articles:
        # Skip if already has image
        if article.get("image"):
            continue
            
        # Limit fetches to avoid long ingestion times
        if fetch_count >= max_fetch:
            break
            
        url = article.get("url")
        if url:
            image = fetch_og_image(url)
            if image:
                article["image"] = image
                logging.info(f"  Fetched og:image for: {article.get('title', '')[:40]}...")
                fetch_count += 1
    
    if fetch_count > 0:
        logging.info(f"Enriched {fetch_count} articles with og:image")

    return articles


def _time_ago(dt: datetime) -> str:
    """Convert datetime to relative time string."""
    now = datetime.now(dt.tzinfo) if dt.tzinfo else datetime.now()
    diff = now - dt

    if diff.days > 0:
        return f"{diff.days}d ago"
    elif diff.seconds > 3600:
        return f"{diff.seconds // 3600}h ago"
    elif diff.seconds > 60:
        return f"{diff.seconds // 60}m ago"
    else:
        return "Just now"


# =============================================================================
# CLI
# =============================================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="News Client for Mining Intelligence")
    parser.add_argument("--ticker", type=str, help="Fetch news for specific ticker")
    parser.add_argument("--mining", action="store_true", help="Fetch general mining news")
    parser.add_argument("--rss", action="store_true", help="Fetch from RSS feeds only")
    parser.add_argument("--newsapi", action="store_true", help="Fetch from NewsAPI only")
    parser.add_argument("--limit", type=int, default=10, help="Number of articles to fetch")

    args = parser.parse_args()

    if args.ticker:
        articles = fetch_news_by_ticker(args.ticker.upper(), args.limit)
    elif args.newsapi:
        articles = fetch_newsapi_mining_news(args.limit)
    elif args.rss:
        articles = fetch_rss_news(args.limit)
    elif args.mining:
        articles = fetch_mining_news(args.limit)
    else:
        print("Mining News Client")
        print("=" * 40)
        print("\nUsage:")
        print("  python news_client.py --ticker ABX")
        print("  python news_client.py --mining")
        print("  python news_client.py --newsapi")
        print("  python news_client.py --rss")
        print("\nAPI Keys configured:")
        print(f"  FINNHUB_API_KEY: {'✓ Set' if FINNHUB_API_KEY else '✗ Not set'}")
        print(f"  NEWSAPI_KEY:     {'✓ Set' if NEWSAPI_KEY else '✗ Not set'}")
        exit(0)

    print(f"\n{'='*60}")
    print(f"Found {len(articles)} articles")
    print('='*60)

    for article in articles:
        print(f"\n{article['title'][:80]}")
        print(f"   Source: {article['source']}")
        symbols = article.get('symbols', [])
        if symbols:
            print(f"   Tickers: {', '.join(symbols)}")
        print(f"   URL: {article['url'][:60]}...")
