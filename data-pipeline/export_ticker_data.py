"""
Export ticker data to JSON for the landing page carousel.

This script reads stock prices from the database and exports them
to a JSON file that the Vercel landing page can consume.

Usage:
    python export_ticker_data.py
"""

import json
import sqlite3
from datetime import datetime
from pathlib import Path

from config import DB_PATH, setup_logging

logger = setup_logging(__name__, "export_ticker.log")

# Output path for the JSON file - place it in landing-page/data folder
OUTPUT_DIR = Path(__file__).parent.parent / "landing-page" / "data"
OUTPUT_FILE = OUTPUT_DIR / "ticker.json"

# Map database tickers to display names for the carousel
# These match the company names used in the landing page HTML
CAROUSEL_TICKERS = {
    'AEM': 'Agnico Eagle',
    'ABX': 'Barrick Gold',
    'WPM': 'Wheaton PM',
    'CCO': 'Cameco',
    'FNV': 'Franco-Nevada',
    'K': 'Kinross',
    'NTR': 'Nutrien',
    'FM': 'First Quantum',
    'PAAS': 'Pan American',
    'LUN': 'Lundin Mining',
    'LUG': 'Lundin Gold',
    'TECK-B': 'Teck',
    'AGI': 'Alamos',
    'IVN': 'Ivanhoe',
    'EDV': 'Endeavour',
    'EQX': 'Equinox',
    'IMG': 'IAMGold',
    'AG': 'First Majestic',
    'NXE': 'NexGen',
    'BTO': 'B2Gold',
    'CS': 'Capstone',
    'EFR': 'Energy Fuels',
    'TXG': 'Torex',
    'HBM': 'Hudbay',
    'ELD': 'Eldorado',
}


def export_ticker_data():
    """Export ticker data from database to JSON file."""
    logger.info("Starting ticker data export...")

    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Get tickers to query
    tickers = list(CAROUSEL_TICKERS.keys())

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Build query with placeholders
        placeholders = ','.join(['?' for _ in tickers])
        query = f"""
            SELECT
                ticker,
                name,
                current_price,
                day_change,
                day_change_percent,
                last_updated
            FROM companies
            WHERE ticker IN ({placeholders})
        """

        cursor.execute(query, tickers)
        rows = cursor.fetchall()
        conn.close()

        # Build the JSON output
        ticker_data = []
        found_tickers = set()

        for row in rows:
            ticker = row['ticker']
            found_tickers.add(ticker)

            # Get display name from our mapping
            display_name = CAROUSEL_TICKERS.get(ticker, row['name'])

            # Handle None values
            price = row['current_price'] or 0
            change = row['day_change'] or 0
            change_percent = row['day_change_percent'] or 0

            ticker_data.append({
                'symbol': f"{ticker}.TO",
                'name': display_name,
                'price': round(price, 2),
                'change': round(change, 4),
                'changePercent': round(change_percent, 2),
            })

        # Log any missing tickers
        missing = set(tickers) - found_tickers
        if missing:
            logger.warning(f"Missing tickers in database: {missing}")

        # Add metadata
        output = {
            'data': ticker_data,
            'updated_at': datetime.now().isoformat(),
            'count': len(ticker_data),
        }

        # Write to file
        with open(OUTPUT_FILE, 'w') as f:
            json.dump(output, f, indent=2)

        logger.info(f"Exported {len(ticker_data)} tickers to {OUTPUT_FILE}")
        return True

    except Exception as e:
        logger.error(f"Failed to export ticker data: {e}")
        return False


if __name__ == "__main__":
    success = export_ticker_data()
    exit(0 if success else 1)
