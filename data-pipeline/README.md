# Data Pipeline - Resource Capital

Python-based data ingestion and processing for the Resource Capital mining intelligence platform.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run the scheduler (keeps data updating every 15 min)
python run_scheduler.py --market

# Or run individual scripts
python fetch_stock_prices.py    # Update stock prices
python fetch_metal_prices.py    # Update metal prices
python fetch_news.py            # Fetch news
```

## Directory Structure

```
data-pipeline/
├── api/                        # FastAPI server
│   └── main.py                 # API endpoints
├── ingestion/                  # Data fetching modules
│   ├── market_data.py          # Stock prices (yfinance)
│   ├── metal_prices.py         # Commodity prices
│   ├── news_client.py          # RSS news aggregation
│   ├── financials.py           # Financial statements
│   └── sedar_scraper.py        # SEDAR+ filings
├── processing/                 # Data processing
│   ├── db_manager.py           # Database schema & functions
│   ├── pdf_extractor.py        # PDF text extraction
│   └── classifiers.py          # Document classification
├── fetch_stock_prices.py       # Cron: stock prices (15 min)
├── fetch_metal_prices.py       # Cron: metal prices (15 min)
├── fetch_news.py               # Cron: news (15 min)
├── run_scheduler.py            # Windows-compatible scheduler
├── setup_cron.sh               # Linux/Mac cron setup
└── logs/                       # Log files
```

## Scheduler (run_scheduler.py)

The scheduler runs continuously and executes tasks at configured intervals.

```bash
# Run all tasks (stocks, metals, news, extraction)
python run_scheduler.py

# Run only market data tasks
python run_scheduler.py --market

# Run stock prices only
python run_scheduler.py --stocks

# Run all tasks once and exit
python run_scheduler.py --once

# Show task status
python run_scheduler.py --status
```

### Task Schedule
| Task | Interval | Script |
|------|----------|--------|
| Stock Prices | 15 min | fetch_stock_prices.py |
| Metal Prices | 15 min | fetch_metal_prices.py |
| News Fetch | 15 min | fetch_news.py |
| Extraction Trigger | 30 min | extraction_trigger.py |
| Extraction Worker | 60 min | run_extraction.py |

## Stock Price Fetcher (fetch_stock_prices.py)

Updates stock prices for all companies in the database.

**Data collected per stock:**
- `current_price` - Latest trading price
- `prev_close` - Previous day's close
- `day_change` - Dollar change from prev_close
- `day_change_percent` - Percentage change
- `day_open`, `day_high`, `day_low` - Intraday stats
- `day_volume` - Trading volume
- `market_cap`, `high_52w`, `low_52w` - Fundamentals

**Exchange handling:**
- TSX stocks → `.TO` suffix (e.g., `ABX.TO`)
- TSXV stocks → `.V` suffix (e.g., `ARTG.V`)
- Automatic fallback if first suffix fails

```bash
# Manual run
python fetch_stock_prices.py

# Check logs
tail -f logs/stock_prices.log
```

## Metal Prices (fetch_metal_prices.py)

Fetches commodity prices from yfinance with fallback symbols.

**Tracked metals:**
| Metal | Primary Symbol | Fallbacks |
|-------|----------------|-----------|
| Gold | GC=F | GLD, IAU |
| Silver | SI=F | SLV |
| Copper | HG=F | CPER |
| Platinum | PL=F | PPLT |
| Palladium | PA=F | PALL |
| Nickel | NI=F | JJN |
| Uranium | URA | URNM |

## News Client (ingestion/news_client.py)

Aggregates mining news from RSS feeds.

**Sources:**
- TMX Newsfile (newsfilecorp.com)
- Mining.com
- Junior Mining Network
- Northern Miner
- Mining Weekly

**Filtering:**
- Requires 2+ mining keywords to include article
- Keywords: gold, silver, copper, mining, exploration, etc.

## Database (processing/db_manager.py)

SQLite database at `../database/mining.db`

**Key functions:**
```python
from processing.db_manager import (
    init_db,              # Initialize/migrate schema
    get_all_companies,    # List companies
    upsert_company,       # Add/update company
    upsert_metal_price,   # Update metal price
    get_metal_prices,     # Get current metal prices
)
```

## API Server (api/main.py)

FastAPI server for mobile apps or external access.

```bash
# Start server
uvicorn api.main:app --reload --port 8000

# Endpoints
GET /api/companies
GET /api/companies/{ticker}
GET /api/metals
GET /api/metals/{commodity}
GET /api/news
```

Note: The Next.js frontend uses direct SQLite access (`frontend/src/lib/db.ts`) for better performance, so the API server is optional for web use.

## Logs

All scripts log to `logs/` directory:
- `stock_prices.log` - Stock price updates
- `metal_prices.log` - Metal price updates
- `news_fetch.log` - News fetching
- `scheduler.log` - Scheduler activity

```bash
# Monitor logs
tail -f logs/stock_prices.log
tail -f logs/scheduler.log
```

## Linux/Mac Cron Setup

```bash
# View cron setup instructions
./setup_cron.sh

# Add to crontab manually
crontab -e
# Add: */15 * * * * cd /path/to/data-pipeline && python fetch_stock_prices.py
```

## Troubleshooting

### Stock not found (404 error)
- Check if ticker is delisted or renamed
- Try alternate suffix (.V instead of .TO)
- Company may have been acquired

### Rate limiting
- yfinance has no official limit but be respectful
- Current delay: 0.3s between requests
- Increase `RATE_LIMIT_DELAY` if getting errors

### Database locked
- Only one process should write at a time
- Check for hung scheduler processes
- Restart if needed
