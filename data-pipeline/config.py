"""
Centralized Configuration for Data Pipeline

All constants, settings, and paths are defined here.
Import this module instead of defining paths/constants locally.

Usage:
    from config import DB_PATH, LOG_DIR, RATE_LIMIT_DELAY
"""

import os
from pathlib import Path

# =============================================================================
# BASE PATHS
# =============================================================================

# Project root directory (data-pipeline folder)
PROJECT_ROOT = Path(__file__).parent.resolve()

# Database path
DATABASE_DIR = PROJECT_ROOT.parent / "database"
DB_PATH = DATABASE_DIR / "mining.db"

# Ensure database directory exists
DATABASE_DIR.mkdir(parents=True, exist_ok=True)

# =============================================================================
# LOGGING
# =============================================================================

LOG_DIR = PROJECT_ROOT / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

LOG_FORMAT = "%(asctime)s - %(levelname)s - %(message)s"
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Structured logging (JSON format) - set to True for production
STRUCTURED_LOGGING = os.getenv("STRUCTURED_LOGGING", "false").lower() == "true"

# =============================================================================
# DOWNLOAD DIRECTORIES
# =============================================================================

DOWNLOADS_DIR = PROJECT_ROOT.parent / "downloads"
DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)

SEDAR_DOWNLOAD_DIR = DOWNLOADS_DIR / "sedar"
FILINGS_DOWNLOAD_DIR = DOWNLOADS_DIR / "filings"
MANUAL_DOWNLOAD_DIR = DOWNLOADS_DIR / "manual"

# Create download subdirectories
for dir_path in [SEDAR_DOWNLOAD_DIR, FILINGS_DOWNLOAD_DIR, MANUAL_DOWNLOAD_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# =============================================================================
# RATE LIMITING
# =============================================================================

# Delays in seconds between API calls
YFINANCE_RATE_LIMIT = 0.3          # Yahoo Finance API
YFINANCE_FINANCIALS_RATE_LIMIT = 0.5  # Financials take longer
SEDAR_RATE_LIMIT = 1.0             # SEDAR+ requests
NEWS_API_RATE_LIMIT = 0.1          # News API requests
DEFAULT_RATE_LIMIT = 0.5           # Default delay between requests

# Maximum retries for failed requests
MAX_RETRIES = 3
RETRY_DELAY = 2.0  # Base delay for exponential backoff

# =============================================================================
# API TIMEOUTS
# =============================================================================

REQUEST_TIMEOUT = 30               # Default HTTP request timeout (seconds)
SELENIUM_TIMEOUT = 30              # Selenium wait timeout (seconds)
CAPTCHA_TIMEOUT = 300              # Time to wait for manual CAPTCHA (seconds)

# =============================================================================
# NEWS CONFIGURATION
# =============================================================================

# How far back to look for news articles (hours)
NEWS_LOOKBACK_HOURS = 6

# Maximum articles to fetch per source
NEWS_MAX_ARTICLES = 100

# RSS feed URLs
RSS_FEEDS = {
    "tmx_newsfile": "https://www.newsfilecorp.com/rss/Mining",
    "junior_mining_network": "https://www.juniorminingnetwork.com/feed.xml",
    "mining_com": "https://www.mining.com/feed/",
}

# =============================================================================
# EXTRACTION CONFIGURATION
# =============================================================================

# Keywords for detecting earnings/production reports
EARNINGS_KEYWORDS = [
    'production report', 'production results', 'production update',
    'quarterly production', 'annual production', 'monthly production',
    'q1 production', 'q2 production', 'q3 production', 'q4 production',
    'q1 results', 'q2 results', 'q3 results', 'q4 results',
    'operating results', 'operational results', 'operational update',
    'aisc', 'all-in sustaining cost', 'cash cost',
    'gold production', 'silver production', 'copper production',
    'gold equivalent', 'ounces produced', 'tonnes processed',
    'record production', 'production guidance',
    'quarterly earnings', 'annual earnings', 'financial results',
    'reports record', 'announces record'
]

# Keywords for detecting technical reports
TECHNICAL_KEYWORDS = [
    'ni 43-101', 'ni43-101', '43-101', 'national instrument 43-101',
    'technical report', 'technical study',
    'mineral resource', 'mineral reserve', 'resource estimate',
    'reserve estimate', 'resource update', 'updated resource',
    'measured and indicated', 'inferred resource',
    'proven and probable', 'reserve update',
    'feasibility study', 'prefeasibility', 'pre-feasibility',
    'preliminary economic assessment', 'pea',
    'definitive feasibility', 'bankable feasibility',
    'drill results', 'drilling results', 'assay results',
    'intersects', 'intercepts'
]

# Ticker extraction patterns
TICKER_PATTERNS = [
    r'\(TSX:\s*([A-Z]{2,5})\)',      # (TSX: ABC)
    r'\(TSXV:\s*([A-Z]{2,5})\)',     # (TSXV: XYZ)
    r'\(TSX-V:\s*([A-Z]{2,5})\)',    # (TSX-V: XYZ)
    r'\(CSE:\s*([A-Z]{2,5})\)',      # (CSE: DEF)
    r'\(NYSE:\s*([A-Z]{2,5})\)',     # (NYSE: GHI)
    r'TSX:\s*([A-Z]{2,5})',          # TSX: ABC (no parens)
    r'TSXV:\s*([A-Z]{2,5})',         # TSXV: XYZ
]

# =============================================================================
# SEDAR+ CONFIGURATION
# =============================================================================

SEDAR_BASE_URL = "https://www.sedarplus.ca"
SEDAR_RSS_TEMPLATE = "https://www.sedarplus.ca/csa-party/records/rss.xml?companyProfileId={profile_id}"

# Filing types we care about
RELEVANT_FILING_TYPES = [
    "NI 43-101",
    "Technical Report",
    "MD&A",
    "Management Discussion",
    "Annual Report",
    "Quarterly Report",
    "Financial Statements",
    "News Release",
    "Material Change",
    "Press Release",
]

# =============================================================================
# DATABASE DEFAULTS
# =============================================================================

DEFAULT_CURRENCY = "CAD"
DEFAULT_EXCHANGE = "TSX"

# Maximum results for list queries
DEFAULT_LIST_LIMIT = 50
MAX_LIST_LIMIT = 200

# =============================================================================
# SCHEDULER SETTINGS
# =============================================================================

# Check interval for scheduler loop (seconds)
SCHEDULER_CHECK_INTERVAL = 30

# Task intervals (minutes)
TASK_INTERVALS = {
    'stock_prices': 15,
    'metal_prices': 15,
    'news_fetch': 15,
    'extraction_trigger': 30,
    'extraction_worker': 60,
    'insider_transactions': 1440,  # Daily
}

# Task timeout (seconds)
TASK_TIMEOUT = 600  # 10 minutes

# =============================================================================
# PAGINATION DEFAULTS
# =============================================================================

# Default page size for frontend
DEFAULT_PAGE_SIZE = 25

# Maximum page size allowed
MAX_PAGE_SIZE = 100

# =============================================================================
# METAL CONFIGURATION
# =============================================================================

METAL_SYMBOLS = {
    'gold': {
        'symbol': 'GC=F',
        'name': 'Gold',
        'unit': 'oz',
        'currency': 'USD',
    },
    'silver': {
        'symbol': 'SI=F',
        'name': 'Silver',
        'unit': 'oz',
        'currency': 'USD',
    },
    'copper': {
        'symbol': 'HG=F',
        'name': 'Copper',
        'unit': 'lb',
        'currency': 'USD',
    },
    'platinum': {
        'symbol': 'PL=F',
        'name': 'Platinum',
        'unit': 'oz',
        'currency': 'USD',
    },
    'palladium': {
        'symbol': 'PA=F',
        'name': 'Palladium',
        'unit': 'oz',
        'currency': 'USD',
    },
    'nickel': {
        'symbol': 'NI=F',
        'name': 'Nickel',
        'unit': 'lb',
        'currency': 'USD',
        'fallback': '^SPGSNI',
    },
    'uranium': {
        'symbol': 'UX1=F',
        'name': 'Uranium',
        'unit': 'lb',
        'currency': 'USD',
        'fallback': 'URA',  # ETF proxy
    },
}

# =============================================================================
# MINING KEYWORDS (for news filtering)
# =============================================================================

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
# COMMODITY LIST (for frontend filters)
# =============================================================================

COMMODITIES = [
    'Gold', 'Silver', 'Copper', 'Lithium', 'Uranium', 'Nickel',
    'Zinc', 'Cobalt', 'Platinum', 'Palladium', 'REE', 'Iron Ore',
    'Coal', 'Diamonds', 'Potash',
]

# =============================================================================
# EXCHANGE MAPPINGS
# =============================================================================

EXCHANGE_SUFFIXES = {
    'TSX': '.TO',
    'Toronto Stock Exchange': '.TO',
    'TSX-V': '.V',
    'TSXV': '.V',
    'TSX Venture': '.V',
    'NYSE': '',
    'NASDAQ': '',
    'AMEX': '',
}

DEFAULT_EXCHANGE_SUFFIX = '.TO'

# =============================================================================
# DATA POPULATION
# =============================================================================

# Historical price data period
PRICE_HISTORY_YEARS = 5

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_db_path() -> str:
    """Get database path as string (for backward compatibility)."""
    return str(DB_PATH)


def get_yf_ticker(ticker: str, exchange: str) -> str:
    """Convert ticker to yfinance format."""
    if exchange in ["NYSE", "NASDAQ"]:
        return ticker
    elif exchange == "TSXV":
        return f"{ticker}.V"
    else:  # TSX
        return f"{ticker}.TO"


def setup_logging(name: str = None, log_file: str = None, json_format: bool = None):
    """
    Setup logging with standard or structured (JSON) format.

    Args:
        name: Logger name (defaults to __name__)
        log_file: Optional log file name (will be placed in LOG_DIR)
        json_format: Force JSON format (None = use STRUCTURED_LOGGING env var)

    Returns:
        Configured logger
    """
    use_json = json_format if json_format is not None else STRUCTURED_LOGGING

    if use_json:
        # Use structured logging module
        from processing.structured_logger import get_logger
        return get_logger(
            name=name or "resource_capital",
            log_file=log_file,
            json_format=True,
            level=LOG_LEVEL
        )

    # Standard text logging
    import logging

    handlers = [logging.StreamHandler()]

    if log_file:
        log_path = LOG_DIR / log_file
        handlers.append(logging.FileHandler(log_path))

    logging.basicConfig(
        level=getattr(logging, LOG_LEVEL),
        format=LOG_FORMAT,
        handlers=handlers
    )

    return logging.getLogger(name)
