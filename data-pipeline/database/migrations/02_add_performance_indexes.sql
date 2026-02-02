-- Migration: 02_add_performance_indexes.sql
-- Purpose: Add indexes for frequently queried columns to improve performance
-- Run with: psql $SUPABASE_DB_URL -f 02_add_performance_indexes.sql

-- =============================================================================
-- COMPANIES TABLE
-- =============================================================================

-- Primary lookup by ticker (most common query)
CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker);

-- Filtering by exchange
CREATE INDEX IF NOT EXISTS idx_companies_exchange ON companies(exchange);

-- Filtering by commodity
CREATE INDEX IF NOT EXISTS idx_companies_commodity ON companies(commodity);

-- Sorting by market cap (common in list views)
CREATE INDEX IF NOT EXISTS idx_companies_market_cap ON companies(market_cap DESC NULLS LAST);

-- Last updated for freshness queries
CREATE INDEX IF NOT EXISTS idx_companies_last_updated ON companies(last_updated);


-- =============================================================================
-- PROJECTS TABLE
-- =============================================================================

-- Lookup by company
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);

-- Filtering by stage
CREATE INDEX IF NOT EXISTS idx_projects_stage ON projects(stage);

-- Geographic queries (for map)
CREATE INDEX IF NOT EXISTS idx_projects_coordinates ON projects(latitude, longitude)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;


-- =============================================================================
-- PRICE HISTORY TABLE
-- =============================================================================

-- Primary composite index for time-series queries
CREATE INDEX IF NOT EXISTS idx_price_history_company_date ON price_history(company_id, date DESC);

-- Date range queries
CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(date);


-- =============================================================================
-- NEWS TABLE
-- =============================================================================

-- Lookup by ticker
CREATE INDEX IF NOT EXISTS idx_news_ticker ON news(ticker);

-- Lookup by company ID
CREATE INDEX IF NOT EXISTS idx_news_company_id ON news(company_id);

-- Recent news queries (most common)
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at DESC NULLS LAST);

-- Source filtering
CREATE INDEX IF NOT EXISTS idx_news_source ON news(source);

-- External ID for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_news_external_id ON news(external_id)
    WHERE external_id IS NOT NULL;


-- =============================================================================
-- METAL PRICES TABLE
-- =============================================================================

-- Lookup by commodity
CREATE INDEX IF NOT EXISTS idx_metal_prices_commodity ON metal_prices(commodity);


-- =============================================================================
-- METAL PRICES HISTORY TABLE
-- =============================================================================

-- Time-series queries
CREATE INDEX IF NOT EXISTS idx_metal_prices_history_commodity_time ON metal_prices_history(commodity, fetched_at DESC);


-- =============================================================================
-- EARNINGS TABLE
-- =============================================================================

-- Lookup by company
CREATE INDEX IF NOT EXISTS idx_earnings_company_id ON earnings(company_id);

-- Period queries
CREATE INDEX IF NOT EXISTS idx_earnings_period ON earnings(period);


-- =============================================================================
-- INSIDER TRANSACTIONS TABLE
-- =============================================================================

-- Lookup by company
CREATE INDEX IF NOT EXISTS idx_insider_transactions_company_id ON insider_transactions(company_id);

-- Date queries
CREATE INDEX IF NOT EXISTS idx_insider_transactions_date ON insider_transactions(transaction_date DESC);


-- =============================================================================
-- REPORTS TABLE
-- =============================================================================

-- Lookup by ticker
CREATE INDEX IF NOT EXISTS idx_reports_ticker ON reports(ticker);

-- Recent reports
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);


-- =============================================================================
-- RESERVES/RESOURCES TABLE
-- =============================================================================

-- Lookup by project
CREATE INDEX IF NOT EXISTS idx_reserves_resources_project_id ON reserves_resources(project_id);


-- =============================================================================
-- MINE PRODUCTION TABLE
-- =============================================================================

-- Lookup by project
CREATE INDEX IF NOT EXISTS idx_mine_production_project_id ON mine_production(project_id);

-- Time-series queries
CREATE INDEX IF NOT EXISTS idx_mine_production_period ON mine_production(project_id, period_end DESC);


-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- List all indexes (useful for verification)
-- SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename;
