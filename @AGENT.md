# Agent Build Instructions - Resource Capital

## Project Setup

### Frontend (Next.js)
```bash
cd frontend
npm install
```

### Backend (Python)
```bash
cd data-pipeline
pip install -r requirements.txt
```

## Running the Application

### Development Mode
```bash
# Terminal 1: Frontend
cd frontend
npm run dev
# Runs on http://localhost:3000

# Terminal 2: Backend API (optional - frontend uses direct DB)
cd data-pipeline
uvicorn api.main:app --reload --port 8000
```

### Data Pipeline
```bash
cd data-pipeline

# Update stock prices
python fetch_stock_prices.py

# Update metal prices
python fetch_metal_prices.py

# Fetch news
python fetch_news.py

# Run scheduler (all updates every 15 min)
python run_scheduler.py --market
```

## Running Tests
```bash
# Frontend
cd frontend
npm test

# Backend
cd data-pipeline
pytest
```

## Build Commands
```bash
# Frontend production build
cd frontend
npm run build

# Type checking
npm run lint
```

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Backend (.env)
```
SUPABASE_DB_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres
```

## Database

### Current: SQLite (being migrated)
- Location: database/mining.db
- Schema: data-pipeline/processing/db_manager.py

### Target: Supabase PostgreSQL
- Schema: database/supabase_schema.sql
- Migration: data-pipeline/migrate_to_supabase.py
- Guide: SUPABASE_MIGRATION_GUIDE.md

## Key Files

| File | Purpose |
|------|---------|
| frontend/src/lib/db.ts | Database queries (SQLite) |
| frontend/src/lib/db-supabase.ts | Database queries (Supabase) |
| data-pipeline/processing/db_manager.py | Backend DB (SQLite) |
| data-pipeline/processing/db_manager_supabase.py | Backend DB (Supabase) |
| data-pipeline/fetch_stock_prices.py | Stock price updater |
| data-pipeline/run_scheduler.py | Cron scheduler |

## Key Learnings
- Next.js 16 requires Node.js 20+ (use nvm)
- yfinance is for development only - need licensed data for production
- Frontend can query SQLite directly via better-sqlite3 for SSR
- Supabase provides PostgreSQL + Auth + Realtime in one platform

## Node Version
```bash
# Install and use Node 20
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 20
```

## Feature Completion Checklist

Before marking ANY feature as complete, verify:

- [ ] All tests pass
- [ ] Code formatted according to project standards
- [ ] All changes committed with descriptive messages
- [ ] @fix_plan.md task marked as complete
- [ ] Documentation updated if needed
- [ ] Frontend and backend both work
