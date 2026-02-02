#!/usr/bin/env python3
"""
Cron Job: Fetch Metal Prices

Run every 15 minutes to update metal/commodity prices.
Add to cron:
    */15 * * * * cd /path/to/data-pipeline && python fetch_metal_prices.py >> logs/metal_prices.log 2>&1
"""

import os
import sys
import logging
from datetime import datetime

# Setup logging
log_dir = os.path.join(os.path.dirname(__file__), 'logs')
os.makedirs(log_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(log_dir, 'metal_prices.log'))
    ]
)
logger = logging.getLogger(__name__)

# Add ingestion dir to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ingestion'))

from metal_prices import update_metal_prices_in_db, get_current_prices


def main():
    """Main entry point for cron job."""
    logger.info("=" * 60)
    logger.info(f"Metal prices update started at {datetime.now().isoformat()}")
    logger.info("=" * 60)

    try:
        # Fetch and save prices
        updated_count = update_metal_prices_in_db()

        if updated_count > 0:
            logger.info(f"Successfully updated {updated_count} metal prices")

            # Log current prices
            prices = get_current_prices()
            logger.info("Current prices:")
            for p in prices:
                change = p.get('change_percent', 0) or 0
                logger.info(f"  {p['commodity'].upper():12} ${p['price']:>10.2f}  {change:>+6.2f}%")
        else:
            logger.warning("No metal prices were updated")

    except Exception as e:
        logger.error(f"Metal price update failed: {e}", exc_info=True)
        sys.exit(1)

    logger.info("Metal prices update completed")


if __name__ == "__main__":
    main()
