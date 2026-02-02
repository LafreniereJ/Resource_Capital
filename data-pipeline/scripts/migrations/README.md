# Migration Scripts

One-time migration and setup scripts. These are kept for reference but typically only need to be run once.

## Scripts

### `init_tables.py`
**Purpose:** Initialize database tables and schema.
**When to run:** Initial setup or schema changes.
```bash
python scripts/migrations/init_tables.py
```

### `add_project_coordinates.py`
**Purpose:** Add latitude/longitude coordinates to projects for map display.
**When to run:** After adding new projects that need geocoding.
```bash
python scripts/migrations/add_project_coordinates.py
```

### `migrate_price_history_batch.py`
**Purpose:** Batch migrate price_history data to Supabase (handles 84k+ rows).
**When to run:** One-time migration from SQLite to Supabase.
```bash
python scripts/migrations/migrate_price_history_batch.py
```

### `populate_historical.py`
**Purpose:** Backfill historical price data for companies.
**When to run:** Initial data load or filling gaps in historical data.
```bash
python scripts/migrations/populate_historical.py
```

## Notes
- Always backup data before running migration scripts
- Check logs in `../logs/` for any errors
- Most scripts are idempotent (safe to run multiple times)
