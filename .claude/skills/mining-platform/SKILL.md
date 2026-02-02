---
name: mining-platform
description: Resource Capital mining intelligence platform. Use when working with stock prices, metal prices, company data, news, or the data pipeline. Knows the architecture, database schema, and key files.
---

# Resource Capital - Mining Intelligence Platform

## Architecture Overview

```
frontend/                    - Next.js 16 + React 19 (port 3000)
  src/app/                   - Pages (stocks, news, companies, map, etc.)
  src/lib/db.ts              - Direct SQLite queries for SSR
  src/app/api/               - Next.js API routes

data-pipeline/               - Python backend
  fetch_stock_prices.py      - Stock price cron (15 min)
  fetch_metal_prices.py      - Metal price cron (15 min)
  run_scheduler.py           - Windows scheduler
  ingestion/                 - Data fetchers (yfinance, RSS)
  processing/db_manager.py   - Database schema & functions

database/mining.db           - SQLite database
```

## Key Commands

```bash
# Start frontend
cd frontend && npm run dev

# Update prices manually
cd data-pipeline && python fetch_stock_prices.py
cd data-pipeline && python fetch_metal_prices.py

# Run continuous scheduler (Windows)
cd data-pipeline && python run_scheduler.py --market
```

## Database Schema

### companies table
```sql
id, ticker, name, exchange, commodity,
current_price, prev_close, day_change, day_change_percent,
day_open, day_high, day_low, day_volume,
market_cap, high_52w, low_52w, avg_volume,
currency, last_updated
```

### metal_prices table
```sql
id, commodity, symbol, price, currency,
change_percent, day_high, day_low, prev_close,
source, fetched_at
```

### news table
```sql
id, title, description, url, source, ticker,
published_at, fetched_at
```

## Key Files Reference

| Purpose | File |
|---------|------|
| Frontend DB queries | `frontend/src/lib/db.ts` |
| Stock price fetcher | `data-pipeline/fetch_stock_prices.py` |
| Metal price fetcher | `data-pipeline/fetch_metal_prices.py` |
| Windows scheduler | `data-pipeline/run_scheduler.py` |
| DB schema/functions | `data-pipeline/processing/db_manager.py` |
| News RSS client | `data-pipeline/ingestion/news_client.py` |
| Stock screener UI | `frontend/src/app/stocks/StocksClient.tsx` |
| Landing page | `frontend/src/app/LandingClient.tsx` |
| Navbar + Search | `frontend/src/components/Navbar.tsx` |

## API Endpoints

### Next.js API (frontend/src/app/api/)
- `GET /api/metals` - Current metal prices
- `GET /api/search?q=query` - Global search
- `GET /api/companies` - Company list
- `GET /api/news` - News articles

### FastAPI (data-pipeline/api/main.py) - Optional
- `GET /api/companies/{ticker}` - Company details
- `GET /api/metals/{commodity}` - Metal with history

## Data Sources

| Source | Usage | Rate Limit |
|--------|-------|------------|
| yfinance | Stock prices, metals | 0.3s delay |
| TMX Newsfile RSS | TSX/TSXV news | No limit |
| Mining.com RSS | Industry news | No limit |

## Common Tasks

### Add a new company
1. Insert into `companies` table via `db_manager.py`
2. Run `fetch_stock_prices.py` to get price data

### Fix ticker not found
- Check if delisted/renamed
- Try alternate suffix (.V instead of .TO)
- Update ticker in database

### Check data freshness
- Look at `last_updated` in companies table
- Check `data-pipeline/logs/` for errors
