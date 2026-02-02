"""
Metal Prices Client - Fetches commodity/metal prices from multiple sources.

Primary: yfinance (unlimited, real-time)
Fallback: Metals-API (if configured, 50 calls/month free tier)

Supports: Gold, Silver, Platinum, Palladium, Nickel, Copper, Uranium
Updates every ~15 minutes via cron job.
"""

import logging
import os
import sys
from datetime import datetime
from typing import Dict, List, Optional

import requests
import yfinance as yf
from dotenv import load_dotenv

# Load .env file
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Add processing dir to path for db_manager
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'processing'))

from db_manager import get_metal_prices, init_db, update_metal_price

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# =============================================================================
# CONFIGURATION
# =============================================================================

# Metals-API (optional fallback) - https://metals-api.com
# Free tier: 50 calls/month, 1-hour updates
METALS_API_KEY = os.getenv("METALS_API_KEY", "")

# yfinance symbols with multiple fallback options per commodity
# Primary symbols are COMEX/NYMEX futures, fallbacks are ETFs or spot proxies
METAL_CONFIG = {
    'gold': {
        'symbols': ['GC=F', 'GLD', 'IAU'],  # Gold futures, SPDR Gold, iShares Gold
        'unit': 'USD/oz',
        'description': 'Gold (COMEX Futures)',
        'metals_api_symbol': 'XAU'
    },
    'silver': {
        'symbols': ['SI=F', 'SLV', 'SIVR'],  # Silver futures, iShares Silver
        'unit': 'USD/oz',
        'description': 'Silver (COMEX Futures)',
        'metals_api_symbol': 'XAG'
    },
    'platinum': {
        'symbols': ['PL=F', 'PPLT'],  # Platinum futures, abrdn Platinum ETF
        'unit': 'USD/oz',
        'description': 'Platinum (NYMEX Futures)',
        'metals_api_symbol': 'XPT'
    },
    'palladium': {
        'symbols': ['PA=F', 'PALL'],  # Palladium futures, abrdn Palladium ETF
        'unit': 'USD/oz',
        'description': 'Palladium (NYMEX Futures)',
        'metals_api_symbol': 'XPD'
    },
    'copper': {
        'symbols': ['HG=F', 'CPER', 'COPX'],  # Copper futures, United States Copper, Copper Miners ETF
        'unit': 'USD/lb',
        'description': 'Copper (COMEX Futures)',
        'metals_api_symbol': 'XCU'
    },
    'nickel': {
        'symbols': ['NI=F', 'JJN', 'NINI.L'],  # Nickel futures, iPath Nickel ETN
        'unit': 'USD/lb',
        'description': 'Nickel (LME)',
        'metals_api_symbol': 'NI'
    },
    'uranium': {
        'symbols': ['URA', 'URNM', 'UEC'],  # Global X Uranium ETF, Sprott Uranium Miners, Uranium Energy Corp
        'unit': 'USD/lb',
        'description': 'Uranium (ETF proxy)',
        'metals_api_symbol': 'URANIUM'
    },
}


# =============================================================================
# YFINANCE FETCHING (PRIMARY SOURCE)
# =============================================================================

def fetch_from_yfinance(commodity: str) -> Optional[Dict]:
    """
    Fetch price from yfinance with fallback symbols.
    Tries each symbol until one succeeds.
    """
    config = METAL_CONFIG.get(commodity.lower())
    if not config:
        logger.warning(f"Unknown commodity: {commodity}")
        return None

    symbols = config['symbols']

    for symbol in symbols:
        try:
            ticker = yf.Ticker(symbol)

            # Try fast_info first (faster, more reliable)
            try:
                fast_info = ticker.fast_info
                price = getattr(fast_info, 'last_price', None) or getattr(fast_info, 'regular_market_price', None)
                prev_close = getattr(fast_info, 'previous_close', None) or getattr(fast_info, 'regular_market_previous_close', None)
                day_high = getattr(fast_info, 'day_high', None) or getattr(fast_info, 'regular_market_day_high', None)
                day_low = getattr(fast_info, 'day_low', None) or getattr(fast_info, 'regular_market_day_low', None)
            except Exception:
                price = None
                prev_close = None
                day_high = None
                day_low = None

            # Fallback to info dict if fast_info didn't work
            if not price:
                info = ticker.info
                price = info.get('regularMarketPrice') or info.get('currentPrice') or info.get('previousClose')
                prev_close = info.get('previousClose') or info.get('regularMarketPreviousClose')
                day_high = info.get('dayHigh') or info.get('regularMarketDayHigh')
                day_low = info.get('dayLow') or info.get('regularMarketDayLow')

            if not price:
                logger.debug(f"No price from {symbol}, trying next...")
                continue

            # Calculate change percent
            change_percent = None
            if prev_close and price and prev_close > 0:
                change_percent = round(((price - prev_close) / prev_close) * 100, 2)

            logger.info(f"  {commodity.upper()}: ${price:.2f} from {symbol}")

            return {
                'commodity': commodity.lower(),
                'symbol': symbol,
                'price': round(float(price), 4),
                'currency': 'USD',
                'change_percent': change_percent,
                'day_high': round(float(day_high), 4) if day_high else None,
                'day_low': round(float(day_low), 4) if day_low else None,
                'prev_close': round(float(prev_close), 4) if prev_close else None,
                'unit': config['unit'],
                'description': config['description'],
                'source': 'yfinance',
                'fetched_at': datetime.now().isoformat()
            }

        except Exception as e:
            logger.debug(f"Error fetching {symbol}: {e}")
            continue

    logger.warning(f"All yfinance symbols failed for {commodity}")
    return None


# =============================================================================
# METALS-API FETCHING (FALLBACK SOURCE)
# =============================================================================

def fetch_from_metals_api(commodities: List[str] = None) -> Dict[str, Dict]:
    """
    Fetch prices from Metals-API (fallback).
    Free tier: 50 calls/month, use sparingly.

    Returns dict mapping commodity name to price data.
    """
    if not METALS_API_KEY:
        return {}

    if commodities is None:
        commodities = list(METAL_CONFIG.keys())

    # Build symbols list for API
    symbols = []
    symbol_to_commodity = {}
    for commodity in commodities:
        config = METAL_CONFIG.get(commodity.lower())
        if config and config.get('metals_api_symbol'):
            api_symbol = config['metals_api_symbol']
            symbols.append(api_symbol)
            symbol_to_commodity[api_symbol] = commodity.lower()

    if not symbols:
        return {}

    try:
        url = f"https://metals-api.com/api/latest"
        params = {
            'access_key': METALS_API_KEY,
            'base': 'USD',
            'symbols': ','.join(symbols)
        }

        logger.info(f"Fetching from Metals-API: {symbols}")
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()

        if not data.get('success'):
            logger.error(f"Metals-API error: {data.get('error', {}).get('info', 'Unknown error')}")
            return {}

        results = {}
        rates = data.get('rates', {})

        for api_symbol, rate in rates.items():
            commodity = symbol_to_commodity.get(api_symbol)
            if commodity and rate:
                # Metals-API returns rates as 1/price (how many units per 1 USD)
                # So we need to invert: price = 1/rate
                price = 1.0 / rate if rate > 0 else 0

                config = METAL_CONFIG.get(commodity)
                results[commodity] = {
                    'commodity': commodity,
                    'symbol': api_symbol,
                    'price': round(price, 4),
                    'currency': 'USD',
                    'change_percent': None,  # Not provided by this endpoint
                    'day_high': None,
                    'day_low': None,
                    'prev_close': None,
                    'unit': config['unit'] if config else 'USD',
                    'description': config['description'] if config else '',
                    'source': 'metals-api',
                    'fetched_at': datetime.now().isoformat()
                }
                logger.info(f"  {commodity.upper()}: ${price:.2f} from Metals-API")

        return results

    except Exception as e:
        logger.error(f"Metals-API request failed: {e}")
        return {}


# =============================================================================
# MAIN FETCH FUNCTIONS
# =============================================================================

def fetch_single_metal(commodity: str, use_fallback: bool = True) -> Optional[Dict]:
    """
    Fetch price for a single metal with fallback support.

    1. Try yfinance (primary, unlimited)
    2. Fall back to Metals-API if configured and yfinance fails
    """
    # Try yfinance first
    result = fetch_from_yfinance(commodity)

    if result:
        return result

    # Try Metals-API fallback
    if use_fallback and METALS_API_KEY:
        logger.info(f"Trying Metals-API fallback for {commodity}...")
        fallback_results = fetch_from_metals_api([commodity])
        if commodity.lower() in fallback_results:
            return fallback_results[commodity.lower()]

    logger.error(f"Failed to fetch {commodity} from all sources")
    return None


def fetch_all_metal_prices(use_fallback: bool = True) -> List[Dict]:
    """
    Fetch current prices for all tracked metals.
    Returns list of price dicts.
    """
    results = []
    failed_commodities = []

    # Try yfinance for each commodity
    for commodity in METAL_CONFIG.keys():
        logger.info(f"Fetching {commodity}...")
        data = fetch_from_yfinance(commodity)
        if data:
            results.append(data)
        else:
            failed_commodities.append(commodity)

    # Use Metals-API fallback for any failures
    if failed_commodities and use_fallback and METALS_API_KEY:
        logger.info(f"Using Metals-API fallback for: {failed_commodities}")
        fallback_results = fetch_from_metals_api(failed_commodities)
        for commodity, data in fallback_results.items():
            results.append(data)
            failed_commodities.remove(commodity)

    if failed_commodities:
        logger.warning(f"Failed to fetch: {failed_commodities}")

    logger.info(f"Fetched prices for {len(results)}/{len(METAL_CONFIG)} metals")
    return results


def update_metal_prices_in_db() -> int:
    """
    Fetch all metal prices and save to database.
    Returns count of successfully updated metals.
    """
    # Ensure tables exist
    init_db()

    prices = fetch_all_metal_prices()
    updated = 0

    for price_data in prices:
        try:
            update_metal_price(
                commodity=price_data['commodity'],
                symbol=price_data['symbol'],
                price=price_data['price'],
                currency=price_data['currency'],
                change_percent=price_data.get('change_percent'),
                day_high=price_data.get('day_high'),
                day_low=price_data.get('day_low'),
                prev_close=price_data.get('prev_close'),
                source=price_data.get('source', 'yfinance')
            )
            updated += 1
            change = price_data.get('change_percent')
            change_str = f"{change:+.2f}%" if change is not None else "N/A"
            logger.info(f"  Saved {price_data['commodity'].upper()}: ${price_data['price']:.2f} ({change_str})")
        except Exception as e:
            logger.error(f"Failed to save {price_data['commodity']}: {e}")

    return updated


def get_current_prices() -> List[Dict]:
    """
    Get current metal prices from database.
    Wrapper around db_manager.get_metal_prices().
    """
    return get_metal_prices()


# =============================================================================
# CLI
# =============================================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Metal Prices Client")
    parser.add_argument("--fetch", action="store_true", help="Fetch and display current prices")
    parser.add_argument("--update", action="store_true", help="Fetch and save to database")
    parser.add_argument("--metal", type=str, help="Fetch specific metal (e.g., gold, silver)")
    parser.add_argument("--test-api", action="store_true", help="Test Metals-API connection")

    args = parser.parse_args()

    if args.metal:
        data = fetch_single_metal(args.metal)
        if data:
            print(f"\n{data['commodity'].upper()} ({data['symbol']})")
            print(f"  Price: ${data['price']:.2f} {data['unit']}")
            change = data.get('change_percent')
            if change is not None:
                print(f"  Change: {change:+.2f}%")
            if data.get('day_low') and data.get('day_high'):
                print(f"  Day Range: ${data['day_low']:.2f} - ${data['day_high']:.2f}")
            print(f"  Source: {data.get('source', 'unknown')}")
        else:
            print(f"Failed to fetch {args.metal}")

    elif args.test_api:
        if not METALS_API_KEY:
            print("METALS_API_KEY not configured in .env")
            print("Get a free API key at: https://metals-api.com")
        else:
            print("Testing Metals-API connection...")
            results = fetch_from_metals_api(['gold', 'silver'])
            if results:
                print(f"Success! Got prices for: {list(results.keys())}")
                for commodity, data in results.items():
                    print(f"  {commodity.upper()}: ${data['price']:.2f}")
            else:
                print("Failed to fetch from Metals-API")

    elif args.update:
        print("Updating metal prices in database...")
        count = update_metal_prices_in_db()
        print(f"\nUpdated {count} metal prices")

    elif args.fetch:
        print("\nFetching current metal prices...")
        print("=" * 60)
        print(f"{'Metal':<12} {'Price':>12} {'Change':>10} {'Source':<12}")
        print("-" * 60)
        prices = fetch_all_metal_prices()
        for p in prices:
            change = p.get('change_percent')
            change_str = f"{change:+.2f}%" if change is not None else "N/A"
            print(f"{p['commodity'].upper():<12} ${p['price']:>10.2f} {change_str:>10} {p.get('source', 'unknown'):<12}")
        print("=" * 60)

    else:
        print("Metal Prices Client")
        print("=" * 60)
        print("\nUsage:")
        print("  python metal_prices.py --fetch       # Display current prices")
        print("  python metal_prices.py --update      # Fetch and save to DB")
        print("  python metal_prices.py --metal gold  # Fetch single metal")
        print("  python metal_prices.py --test-api    # Test Metals-API fallback")
        print("\nTracked metals:")
        for name, config in METAL_CONFIG.items():
            print(f"  {name:12} {config['symbols'][0]:8} {config['description']}")
        print(f"\nMetals-API Key: {'Configured' if METALS_API_KEY else 'Not configured (optional fallback)'}")
        print("  Get free key at: https://metals-api.com")
