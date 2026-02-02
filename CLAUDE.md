# Resource Capital - Project Context

## Project Overview
Mining industry intelligence platform providing real-time market data, news, and analytics for TSX/TSXV mining companies.

**Tech Stack:**
- **Frontend**: Next.js 16 + React 19 + TailwindCSS + Framer Motion
- **Backend**: FastAPI + SQLite
- **Data Pipeline**: Python (yfinance, RSS feeds, PDF extraction)

## Architecture
```
frontend/                    - Next.js dashboard (port 3000)
  src/app/                   - Pages (stocks, news, companies, map, compare, etc.)
  src/components/            - Shared components (Navbar, etc.)
  src/lib/db.ts              - Direct SQLite access for SSR
  src/app/api/               - Next.js API routes

data-pipeline/               - Python backend
  api/main.py                - FastAPI server (port 8000)
  ingestion/                 - Data fetchers
    market_data.py           - Stock price fetcher (yfinance)
    metal_prices.py          - Commodity prices (yfinance)
    news_client.py           - Mining news RSS aggregator
    financials.py            - Financial statements
  processing/                - PDF extraction, classifiers
    db_manager.py            - SQLite schema & functions
  fetch_stock_prices.py      - Cron job: stock prices (every 15 min)
  fetch_metal_prices.py      - Cron job: metal prices (every 15 min)
  fetch_news.py              - Cron job: news (every 15 min)
  run_scheduler.py           - Windows-compatible scheduler

database/mining.db           - SQLite database
```

## Current Features (as of Jan 2026)

### Live Market Data (15-min updates)
- **Stock Prices**: 203 TSX/TSXV mining companies with daily % change
- **Metal Prices**: Gold, Silver, Copper, Platinum, Palladium, Nickel, Uranium
- **News**: Mining-focused RSS aggregation from TMX Newsfile, Mining.com, etc.

### Frontend Pages
| Route | Description | Status |
|-------|-------------|--------|
| `/` | Landing page with metal ticker, company cards | Working |
| `/stocks` | Stock screener with pagination, sorting, daily % change | Working |
| `/news` | Mining news feed | Working |
| `/companies` | Companies directory | Working |
| `/companies/[ticker]` | Company detail page | Working |
| `/companies/[ticker]/projects/[id]` | Project detail | Working |
| `/map` | Interactive project map | Working |
| `/compare` | Company comparison tool | Working |
| `/transactions` | M&A activity tracker | Working |
| `/reports` | Research reports list | Working |
| `/reports/[id]` | Report detail | Working |

### API Endpoints
```
# Companies
GET /api/companies              - List all companies
GET /api/companies/{ticker}     - Company details

# Market Data
GET /api/metals                 - Current metal prices
GET /api/metals/{commodity}     - Single metal with history
GET /api/stocks                 - Stock screener data

# News
GET /api/news                   - Recent news
GET /api/news/{id}              - Article detail

# Search
GET /api/search?q=query         - Global search (companies + news)
```

## Commands

### Start Development
```bash
# Frontend (Next.js)
cd frontend && npm run dev

# Backend API (FastAPI) - optional, frontend uses direct DB
cd data-pipeline && uvicorn api.main:app --reload --port 8000

# Run data scheduler (Windows) - keeps prices updating
cd data-pipeline && python run_scheduler.py --market
```

### Manual Data Updates
```bash
cd data-pipeline

# Update all stock prices (~2.5 min for 203 companies)
python fetch_stock_prices.py

# Update metal prices
python fetch_metal_prices.py

# Fetch news
python fetch_news.py

# Run all once
python run_scheduler.py --once
```

### Database
```bash
# Initialize/migrate database
cd data-pipeline
python -c "from processing.db_manager import init_db; init_db()"

# Database location
database/mining.db
```

## Database Schema (Key Tables)

### companies
```sql
id, ticker, name, exchange, commodity, description,
current_price, prev_close, day_change, day_change_percent,
day_open, day_high, day_low, day_volume,
market_cap, high_52w, low_52w, avg_volume,
currency, last_updated
```

### metal_prices
```sql
id, commodity, symbol, price, currency,
change_percent, day_high, day_low, prev_close,
source, fetched_at
```

### news
```sql
id, title, description, url, source, ticker,
published_at, fetched_at
```

## Recent Development History

### Session: Jan 2026 - Live Market Data
1. Created `fetch_stock_prices.py` - 15-min stock price updates
2. Created `run_scheduler.py` - Windows-compatible task scheduler
3. Added daily % change tracking to companies table
4. Updated stock screener with Change column and pagination
5. Connected metal prices to frontend (was hardcoded)
6. Implemented global search (Navbar → /api/search)

### Previous Sessions
- PDF extraction pipeline built
- News sources updated to mining-only
- Metal prices feature added (7 commodities)
- Backend cleanup and optimization

## Known Issues / TODOs

### High Priority
- [ ] TECK ticker not found (possibly renamed/delisted)
- [ ] Some TSXV stocks need .V suffix instead of .TO

### Future Enhancements (from plan)
1. **AI-Powered Company Analysis** - LLM summaries, alerts
2. **Interactive Portfolio/Watchlist** - User accounts, tracking
3. **Production Analytics Dashboard** - Charts, comparisons

### Quick Wins Completed
- [x] Live metal prices on frontend
- [x] Stock screener pagination
- [x] Global search functional
- [x] Last updated timestamps

## Data Sources

| Source | Usage | Rate Limit |
|--------|-------|------------|
| yfinance | Stock prices, financials, metals | 0.3s between calls |
| TMX Newsfile RSS | TSX/TSXV press releases | No limit |
| Mining.com RSS | Industry news | No limit |
| SEDAR+ | Canadian filings (optional) | 1s between calls |

## File Reference

### Key Files to Know
- `frontend/src/lib/db.ts` - All database queries for frontend
- `frontend/src/app/api/` - Next.js API routes
- `data-pipeline/fetch_stock_prices.py` - Stock price cron job
- `data-pipeline/run_scheduler.py` - Windows scheduler
- `data-pipeline/processing/db_manager.py` - DB schema & functions
- `data-pipeline/setup_cron.sh` - Linux/Mac cron setup

### Configuration
- Frontend port: 3000
- Backend API port: 8000
- Database: `database/mining.db`
- Logs: `data-pipeline/logs/`
