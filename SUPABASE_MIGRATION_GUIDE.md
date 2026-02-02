# Supabase Migration Guide

This guide walks through migrating Resource Capital from SQLite to Supabase PostgreSQL.

## Overview

**What's changing:**
- Database: SQLite → PostgreSQL (Supabase)
- Frontend: `better-sqlite3` → `@supabase/supabase-js`
- Backend: `sqlite3` → `psycopg2`

**What stays the same:**
- All function names and return types
- API routes
- Frontend components

---

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in:
   - **Name:** `resource-capital` (or your preference)
   - **Database Password:** Generate a strong password (SAVE THIS!)
   - **Region:** Choose closest to your users
4. Wait for project to provision (~2 minutes)

---

## Step 2: Get Connection Details

From your Supabase Dashboard:

### For Frontend (API Keys)
1. Go to **Settings** → **API**
2. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### For Backend (Database Connection)
1. Go to **Settings** → **Database**
2. Under "Connection string", copy the **URI** format
3. Replace `[YOUR-PASSWORD]` with your database password
4. This becomes `SUPABASE_DB_URL`

---

## Step 3: Run Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New query**
3. Open `database/supabase_schema.sql` from this project
4. Copy the entire contents and paste into the SQL Editor
5. Click **Run** (or Cmd/Ctrl + Enter)
6. Verify: Go to **Table Editor** - you should see all tables created

---

## Step 4: Migrate Data

### Install Dependencies
```bash
cd data-pipeline
pip install psycopg2-binary python-dotenv
```

### Set Up Environment
```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your SUPABASE_DB_URL
# Example: postgresql://postgres:MyPassword123@db.abcdefgh.supabase.co:5432/postgres
```

### Run Migration
```bash
python migrate_to_supabase.py
```

Expected output:
```
============================================================
Resource Capital: SQLite to Supabase Migration
============================================================

Connecting to SQLite...
  Connected to: /path/to/database/mining.db

Connecting to PostgreSQL...
  Connected to Supabase

----------------------------------------
Migrating tables...
----------------------------------------
Migrating companies... (203 rows)
Migrating projects... (45 rows)
Migrating news... (1250 rows)
...

Resetting sequences...
Sequences reset.

Verifying migration...
  ✓ companies: SQLite=203, PostgreSQL=203
  ✓ projects: SQLite=45, PostgreSQL=45
  ...

============================================================
Migration complete! Total rows migrated: XXXX
All row counts match. Migration successful!
============================================================
```

---

## Step 5: Update Frontend

### Install Supabase Client
```bash
cd frontend
npm install @supabase/supabase-js
```

### Set Up Environment
```bash
# Copy example env file
cp .env.example .env.local

# Edit .env.local and add your Supabase keys
```

### Switch to Supabase Database Client
```bash
# Backup old db.ts
mv src/lib/db.ts src/lib/db-sqlite.ts.bak

# Use new Supabase version
mv src/lib/db-supabase.ts src/lib/db.ts
```

### Update Imports (if needed)

The new `db.ts` exports async functions. If you have Server Components using sync functions, update them:

**Before (sync):**
```typescript
const company = getCompany('AEM');
```

**After (async):**
```typescript
const company = await getCompany('AEM');
```

For Server Components in Next.js 16+, this should work automatically since they're async by default.

---

## Step 6: Update Backend (Data Pipeline)

### Switch to PostgreSQL Manager
```bash
cd data-pipeline/processing

# Backup old db_manager.py
mv db_manager.py db_manager_sqlite.py.bak

# Use new PostgreSQL version
mv db_manager_supabase.py db_manager.py
```

### Test Connection
```python
python -c "from processing.db_manager import init_db; init_db()"
```

Should print: `Database connection verified`

---

## Step 7: Verify Everything Works

### Test Frontend
```bash
cd frontend
npm run dev
```
- Visit http://localhost:3000
- Check that companies load
- Check that stock data appears
- Test search functionality

### Test Data Pipeline
```bash
cd data-pipeline

# Test metal prices update
python fetch_metal_prices.py

# Test stock prices update (small batch)
python -c "
from processing.db_manager import get_company_by_ticker, update_company_price
company = get_company_by_ticker('AEM')
print(f'Found company: {company}')
"
```

---

## Rollback Plan

If something goes wrong, you can rollback:

### Frontend
```bash
cd frontend/src/lib
mv db.ts db-supabase.ts
mv db-sqlite.ts.bak db.ts
```

### Backend
```bash
cd data-pipeline/processing
mv db_manager.py db_manager_supabase.py
mv db_manager_sqlite.py.bak db_manager.py
```

Your SQLite database is unchanged and still works.

---

## Common Issues

### "SUPABASE_DB_URL not set"
Make sure your `.env` file exists and has the correct connection string.

### "password authentication failed"
Double-check your database password in the connection string.

### "relation does not exist"
You haven't run the schema SQL. Go to Step 3.

### "TypeError: getCompany is not a function"
You might be mixing sync/async. The new db.ts uses async functions.

### Row counts don't match after migration
Check the migration output for specific errors. Some tables might have constraint violations.

---

## Next Steps After Migration

1. **Enable Row Level Security (RLS)** - Important for multi-user access
2. **Set up Supabase Auth** - For user accounts
3. **Configure Realtime** - For live price updates
4. **Set up backups** - Supabase does daily backups on Pro plan

---

## File Reference

| File | Purpose |
|------|---------|
| `database/supabase_schema.sql` | PostgreSQL schema |
| `data-pipeline/migrate_to_supabase.py` | Migration script |
| `frontend/src/lib/db-supabase.ts` | Frontend Supabase client |
| `data-pipeline/processing/db_manager_supabase.py` | Backend PostgreSQL manager |
| `frontend/.env.example` | Frontend env template |
| `data-pipeline/.env.example` | Backend env template |

---

## Support

If you run into issues:
1. Check Supabase Dashboard → Logs for database errors
2. Verify all environment variables are set correctly
3. Ensure the schema was fully executed without errors
