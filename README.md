# Resource Capital

Mining industry intelligence platform providing real-time market data, news, and analytics for TSX/TSXV mining companies.

## Features

- **Live Stock Data**: 203 TSX/TSXV mining companies with 15-minute price updates
- **Metal Prices**: Gold, Silver, Copper, Platinum, Palladium, Nickel, Uranium
- **News Aggregation**: Mining-focused RSS from TMX Newsfile, Mining.com, etc.
- **Company Profiles**: Detailed pages with projects, financials, and charts
- **Interactive Map**: Geographic view of mining projects
- **Comparison Tool**: Side-by-side company analysis

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + TailwindCSS + Framer Motion
- **Database**: Supabase (PostgreSQL)
- **Data Pipeline**: Python (yfinance, RSS feeds, PDF extraction)

## Prerequisites

- Node.js 18+
- Python 3.10+
- [Supabase](https://supabase.com) account (free tier works)

## Quick Start

### 1. Clone the repo

```bash
git clone git@github.com:LafreniereJ/Resource_Capital.git
cd Resource_Capital
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `database/supabase_schema.sql`
3. Copy your project credentials from **Settings > API**

### 3. Configure environment variables

**Frontend** (`frontend/.env.local`):
```bash
cp frontend/.env.example frontend/.env.local
# Edit with your Supabase credentials:
# NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**Data Pipeline** (`data-pipeline/.env`):
```bash
cp data-pipeline/.env.example data-pipeline/.env
# Edit with your Supabase DB URL:
# SUPABASE_DB_URL=postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres
```

### 4. Install dependencies

```bash
# Frontend
cd frontend
npm install

# Data Pipeline
cd ../data-pipeline
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 5. Seed the database

```bash
cd data-pipeline
python sync_companies.py  # Import 203 mining companies
python fetch_stock_prices.py  # Fetch current prices (~3 min)
python fetch_metal_prices.py  # Fetch metal prices
```

### 6. Start development

```bash
# Terminal 1: Frontend
cd frontend
npm run dev
# Open http://localhost:3000

# Terminal 2 (optional): Keep prices updating
cd data-pipeline
python run_scheduler.py --market
```

## Project Structure

```
frontend/                    # Next.js dashboard
  src/app/                   # Pages (stocks, news, companies, map, etc.)
  src/components/            # Shared components
  src/lib/db.ts              # Supabase client

data-pipeline/               # Python backend
  ingestion/                 # Data fetchers (yfinance, RSS, PDF)
  processing/                # DB manager, extractors
  fetch_stock_prices.py      # Stock price updater
  fetch_metal_prices.py      # Metal price updater
  fetch_news.py              # News fetcher
  run_scheduler.py           # Scheduled updates

database/
  schema.sql                 # Full database schema
  migrations/                # Incremental migrations
```

## Environment Variables

### Required for Frontend
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |

### Required for Data Pipeline
| Variable | Description |
|----------|-------------|
| `SUPABASE_DB_URL` | PostgreSQL connection string |

### Optional
| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | For PDF extraction |
| `STRIPE_*` | For payment processing |
| `SENTRY_*` | For error tracking |

## Manual Data Updates

```bash
cd data-pipeline

# Update stock prices (~3 min for 203 companies)
python fetch_stock_prices.py

# Update metal prices
python fetch_metal_prices.py

# Fetch news
python fetch_news.py

# Run all once
python run_scheduler.py --once
```

## API Routes

| Route | Description |
|-------|-------------|
| `GET /api/companies` | List all companies |
| `GET /api/companies/[ticker]` | Company details |
| `GET /api/metals` | Current metal prices |
| `GET /api/stocks` | Stock screener data |
| `GET /api/news` | Recent news |
| `GET /api/search?q=query` | Global search |

## Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Commit: `git commit -m "Add my feature"`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

## License

Private repository - all rights reserved.
