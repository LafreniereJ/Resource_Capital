-- =============================================================================
-- Resource Capital - PostgreSQL Schema for Supabase
-- =============================================================================
-- Run this in Supabase SQL Editor to create the database schema
-- This is a direct port from SQLite with PostgreSQL-specific types
-- =============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Companies table - with market data columns
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    ticker TEXT NOT NULL UNIQUE,
    exchange TEXT DEFAULT 'TSX',
    website TEXT,
    commodity TEXT,
    description TEXT,

    -- Market Data
    currency TEXT DEFAULT 'CAD',
    current_price DECIMAL(12,4),
    market_cap DECIMAL(18,2),
    high_52w DECIMAL(12,4),
    low_52w DECIMAL(12,4),
    avg_volume BIGINT,

    -- Daily price tracking
    prev_close DECIMAL(12,4),
    day_change DECIMAL(12,4),
    day_change_percent DECIMAL(8,4),
    day_open DECIMAL(12,4),
    day_high DECIMAL(12,4),
    day_low DECIMAL(12,4),
    day_volume BIGINT,

    last_updated TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_companies_ticker ON companies(ticker);
CREATE INDEX idx_companies_commodity ON companies(commodity);
CREATE INDEX idx_companies_exchange ON companies(exchange);
CREATE INDEX idx_companies_market_cap ON companies(market_cap DESC NULLS LAST);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    latitude DECIMAL(10,6),
    longitude DECIMAL(10,6),
    stage TEXT,
    commodity TEXT,
    ownership_percentage DECIMAL(5,2) DEFAULT 100.00
        CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_projects_stage ON projects(stage);

-- Filings table - track source documents
CREATE TABLE IF NOT EXISTS filings (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    filing_type TEXT NOT NULL,
    filing_date DATE NOT NULL,
    sedar_url TEXT UNIQUE,
    local_path TEXT,
    is_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_filings_company ON filings(company_id);
CREATE INDEX idx_filings_type ON filings(filing_type);
CREATE INDEX idx_filings_date ON filings(filing_date DESC);

-- =============================================================================
-- DOCUMENT PROCESSING TABLES
-- =============================================================================

-- Documents table - uploaded PDFs
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_hash TEXT UNIQUE,
    file_size INTEGER,
    page_count INTEGER,
    document_type TEXT,
    document_subtype TEXT,
    classification_confidence DECIMAL(5,4),
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    ticker TEXT,
    status TEXT DEFAULT 'pending',
    upload_source TEXT,
    storage_path TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_documents_company ON documents(company_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_type ON documents(document_type);

-- Extraction results
CREATE TABLE IF NOT EXISTS extraction_results (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    extraction_type TEXT,
    extraction_method TEXT,
    extracted_data JSONB,
    confidence_score DECIMAL(5,4),
    source_page INTEGER,
    source_section TEXT,
    raw_text_snippet TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_extraction_document ON extraction_results(document_id);
CREATE INDEX idx_extraction_type ON extraction_results(extraction_type);

-- Extracted Metrics table - the core data
CREATE TABLE IF NOT EXISTS extracted_metrics (
    id SERIAL PRIMARY KEY,
    filing_id INTEGER REFERENCES filings(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(18,6),
    unit TEXT,
    period_start DATE,
    period_end DATE,
    confidence_score DECIMAL(5,4)
        CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
    raw_text_snippet TEXT,
    hole_id TEXT,
    interval_length DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_metrics_filing ON extracted_metrics(filing_id);
CREATE INDEX idx_metrics_project ON extracted_metrics(project_id);
CREATE INDEX idx_metrics_name ON extracted_metrics(metric_name);

-- =============================================================================
-- NEWS & QUEUE TABLES
-- =============================================================================

-- News table
CREATE TABLE IF NOT EXISTS news (
    id SERIAL PRIMARY KEY,
    external_id TEXT UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    source TEXT,
    published_at TIMESTAMPTZ,
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    ticker TEXT,
    category TEXT,
    is_press_release BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_news_ticker ON news(ticker);
CREATE INDEX idx_news_published ON news(published_at DESC);
CREATE INDEX idx_news_source ON news(source);
CREATE INDEX idx_news_company ON news(company_id);

-- Extraction queue
CREATE TABLE IF NOT EXISTS extraction_queue (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    url TEXT,
    extraction_type TEXT,
    source TEXT,
    news_id INTEGER REFERENCES news(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    attempts INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_queue_status ON extraction_queue(status, priority DESC);
CREATE INDEX idx_queue_company ON extraction_queue(company_id);

-- =============================================================================
-- FINANCIAL & PRODUCTION TABLES
-- =============================================================================

-- Earnings table
CREATE TABLE IF NOT EXISTS earnings (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    ticker TEXT,
    period TEXT NOT NULL,
    period_end DATE,
    mine_name TEXT DEFAULT 'Consolidated',
    gold_oz DECIMAL(12,2),
    silver_oz DECIMAL(12,2),
    copper_lbs DECIMAL(14,2),
    gold_equivalent_oz DECIMAL(12,2),
    ore_processed_tonnes DECIMAL(14,2),
    head_grade DECIMAL(10,4),
    recovery_rate DECIMAL(5,4)
        CHECK (recovery_rate IS NULL OR (recovery_rate >= 0 AND recovery_rate <= 1)),
    aisc_per_oz DECIMAL(10,2),
    cash_cost_per_oz DECIMAL(10,2),
    source_url TEXT,
    extraction_method TEXT,
    confidence DECIMAL(5,4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, period, mine_name)
);

CREATE INDEX idx_earnings_company ON earnings(company_id);
CREATE INDEX idx_earnings_period ON earnings(period_end DESC);

-- Technical reports
CREATE TABLE IF NOT EXISTS technical_reports (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL,
    effective_date DATE,
    project_name TEXT,
    pdf_url TEXT,
    local_path TEXT,
    is_extracted BOOLEAN DEFAULT FALSE,
    extraction_date TIMESTAMPTZ,
    news_id INTEGER REFERENCES news(id) ON DELETE SET NULL,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, effective_date, report_type)
);

CREATE INDEX idx_reports_company ON technical_reports(company_id);
CREATE INDEX idx_reports_date ON technical_reports(effective_date DESC);

-- Mineral estimates
CREATE TABLE IF NOT EXISTS mineral_estimates (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES technical_reports(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    project_name TEXT,
    category TEXT NOT NULL,
    commodity TEXT NOT NULL,
    tonnage_mt DECIMAL(14,4),
    grade DECIMAL(12,6),
    grade_unit TEXT,
    contained_metal DECIMAL(14,4),
    contained_unit TEXT,
    cutoff_grade DECIMAL(10,4),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_estimates_report ON mineral_estimates(report_id);
CREATE INDEX idx_estimates_company ON mineral_estimates(company_id);

-- Project economics (PEA, PFS, DFS results)
CREATE TABLE IF NOT EXISTS project_economics (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    report_id INTEGER REFERENCES technical_reports(id) ON DELETE SET NULL,
    project_name TEXT,
    study_type TEXT NOT NULL,
    study_date DATE,
    npv_million DECIMAL(14,2),
    npv_discount_rate DECIMAL(5,4)
        CHECK (npv_discount_rate IS NULL OR (npv_discount_rate >= 0 AND npv_discount_rate <= 1)),
    irr_percent DECIMAL(6,2),
    payback_years DECIMAL(4,1),
    initial_capex_million DECIMAL(14,2),
    sustaining_capex_million DECIMAL(14,2),
    opex_per_tonne DECIMAL(10,2),
    aisc_per_oz DECIMAL(10,2),
    gold_price_assumption DECIMAL(10,2),
    copper_price_assumption DECIMAL(10,4),
    silver_price_assumption DECIMAL(10,2),
    uranium_price_assumption DECIMAL(10,2),
    mine_life_years DECIMAL(4,1),
    annual_production_target DECIMAL(14,2),
    production_unit TEXT,
    source_url TEXT,
    source_type TEXT,
    source_priority INTEGER,
    confidence_score DECIMAL(5,4),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_economics_project ON project_economics(project_id);
CREATE INDEX idx_economics_study ON project_economics(study_type);

-- Mine production
CREATE TABLE IF NOT EXISTS mine_production (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    period_type TEXT DEFAULT 'quarterly'
        CHECK (period_type IN ('quarterly', 'annual', 'monthly')),
    period_end DATE NOT NULL,
    ore_mined_tonnes DECIMAL(14,2),
    ore_processed_tonnes DECIMAL(14,2),
    throughput_tpd DECIMAL(12,2),
    head_grade DECIMAL(10,4),
    head_grade_unit TEXT,
    recovery_rate DECIMAL(5,4)
        CHECK (recovery_rate IS NULL OR (recovery_rate >= 0 AND recovery_rate <= 1)),
    gold_produced_oz DECIMAL(12,2),
    silver_produced_oz DECIMAL(12,2),
    copper_produced_lbs DECIMAL(14,2),
    nickel_produced_lbs DECIMAL(14,2),
    uranium_produced_lbs DECIMAL(14,2),
    platinum_produced_oz DECIMAL(12,2),
    palladium_produced_oz DECIMAL(12,2),
    gold_equivalent_oz DECIMAL(12,2),
    copper_equivalent_lbs DECIMAL(14,2),
    aisc_per_oz DECIMAL(10,2),
    cash_cost_per_oz DECIMAL(10,2),
    aisc_per_lb DECIMAL(10,4),
    cash_cost_per_lb DECIMAL(10,4),
    mining_cost_per_tonne DECIMAL(10,2),
    processing_cost_per_tonne DECIMAL(10,2),
    source_url TEXT,
    source_type TEXT,
    source_priority INTEGER,
    confidence_score DECIMAL(5,4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, period_type, period_end)
);

CREATE INDEX idx_production_project ON mine_production(project_id);
CREATE INDEX idx_production_period ON mine_production(period_end DESC);

-- Reserves and resources
CREATE TABLE IF NOT EXISTS reserves_resources (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    category TEXT NOT NULL
        CHECK (category IN ('Measured', 'Indicated', 'Inferred', 'Proven', 'Probable', 'M&I', 'P&P')),
    is_reserve BOOLEAN DEFAULT FALSE,
    deposit_name TEXT DEFAULT 'Main',
    tonnes DECIMAL(18,2),
    grade DECIMAL(12,6),
    grade_unit TEXT,
    contained_metal DECIMAL(14,4),
    contained_metal_unit TEXT,
    secondary_grade DECIMAL(12,6),
    secondary_grade_unit TEXT,
    secondary_contained DECIMAL(14,4),
    secondary_contained_unit TEXT,
    cutoff_grade DECIMAL(10,4),
    cutoff_grade_unit TEXT,
    metal_price_assumption DECIMAL(10,2),
    metal_price_currency TEXT DEFAULT 'USD',
    technical_report_title TEXT,
    qualified_person TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, report_date, category, deposit_name)
);

CREATE INDEX idx_reserves_project ON reserves_resources(project_id);
CREATE INDEX idx_reserves_date ON reserves_resources(report_date DESC);
CREATE INDEX idx_reserves_category ON reserves_resources(category);

-- =============================================================================
-- MARKET DATA TABLES
-- =============================================================================

-- Price history (stock prices)
CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    open DECIMAL(12,4),
    high DECIMAL(12,4),
    low DECIMAL(12,4),
    close DECIMAL(12,4),
    volume BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, date)
);

CREATE INDEX idx_price_company ON price_history(company_id);
CREATE INDEX idx_price_date ON price_history(date DESC);

-- Metal prices (current)
CREATE TABLE IF NOT EXISTS metal_prices (
    id SERIAL PRIMARY KEY,
    commodity TEXT NOT NULL UNIQUE,
    symbol TEXT NOT NULL,
    price DECIMAL(12,4) NOT NULL,
    currency TEXT DEFAULT 'USD',
    change_percent DECIMAL(8,4),
    day_high DECIMAL(12,4),
    day_low DECIMAL(12,4),
    prev_close DECIMAL(12,4),
    source TEXT DEFAULT 'yfinance',
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metal prices history
CREATE TABLE IF NOT EXISTS metal_prices_history (
    id SERIAL PRIMARY KEY,
    commodity TEXT NOT NULL,
    price DECIMAL(12,4) NOT NULL,
    currency TEXT DEFAULT 'USD',
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_metal_history_commodity ON metal_prices_history(commodity);
CREATE INDEX idx_metal_history_date ON metal_prices_history(fetched_at DESC);

-- Financials table - financial statements
CREATE TABLE IF NOT EXISTS financials (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    statement_type TEXT NOT NULL
        CHECK (statement_type IN ('income', 'balance', 'cashflow', 'combined')),
    period_type TEXT DEFAULT 'annual' CHECK (period_type IN ('annual', 'quarterly')),
    period_end DATE NOT NULL,
    currency TEXT DEFAULT 'CAD',

    -- Income Statement
    total_revenue DECIMAL(18,2),
    cost_of_revenue DECIMAL(18,2),
    gross_profit DECIMAL(18,2),
    operating_expenses DECIMAL(18,2),
    operating_income DECIMAL(18,2),
    net_income DECIMAL(18,2),
    ebitda DECIMAL(18,2),
    eps_basic DECIMAL(10,4),
    eps_diluted DECIMAL(10,4),

    -- Balance Sheet
    total_assets DECIMAL(18,2),
    total_liabilities DECIMAL(18,2),
    total_equity DECIMAL(18,2),
    cash_and_equivalents DECIMAL(18,2),
    total_debt DECIMAL(18,2),
    current_assets DECIMAL(18,2),
    current_liabilities DECIMAL(18,2),

    -- Cash Flow
    operating_cash_flow DECIMAL(18,2),
    investing_cash_flow DECIMAL(18,2),
    financing_cash_flow DECIMAL(18,2),
    free_cash_flow DECIMAL(18,2),
    capital_expenditures DECIMAL(18,2),

    -- Mining Specific
    production_oz DECIMAL(14,2),
    aisc_per_oz DECIMAL(10,2),
    cash_cost_per_oz DECIMAL(10,2),
    reserves_oz DECIMAL(14,2),
    resources_oz DECIMAL(14,2),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, statement_type, period_type, period_end)
);

CREATE INDEX idx_financials_company ON financials(company_id);
CREATE INDEX idx_financials_period ON financials(period_end DESC);

-- Insider transactions
CREATE TABLE IF NOT EXISTS insider_transactions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    ticker TEXT,
    insider_name TEXT NOT NULL,
    insider_role TEXT,
    transaction_type TEXT NOT NULL
        CHECK (transaction_type IN ('Buy', 'Sell', 'Exercise', 'Grant', 'Other')),
    transaction_date DATE NOT NULL,
    shares BIGINT,
    price_per_share DECIMAL(12,4),
    total_value DECIMAL(18,2),
    shares_held_after BIGINT,
    source_url TEXT,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, insider_name, transaction_date, transaction_type, shares)
);

CREATE INDEX idx_insider_company ON insider_transactions(company_id);
CREATE INDEX idx_insider_date ON insider_transactions(transaction_date DESC);

-- =============================================================================
-- REPORTS TABLE (Custom Research Reports)
-- =============================================================================

CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    ticker TEXT,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_ticker ON reports(ticker);
CREATE INDEX idx_reports_created ON reports(created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (Enable after setting up auth)
-- =============================================================================

-- For now, all tables are publicly readable
-- Uncomment and customize when adding authentication

-- ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public read access" ON companies FOR SELECT USING (true);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_filings_updated_at BEFORE UPDATE ON filings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_technical_reports_updated_at BEFORE UPDATE ON technical_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- VIEWS (Useful aggregations)
-- =============================================================================

-- Company summary view
CREATE OR REPLACE VIEW company_summary AS
SELECT
    c.*,
    COUNT(DISTINCT p.id) as project_count,
    COUNT(DISTINCT f.id) as filing_count,
    COUNT(DISTINCT n.id) as news_count
FROM companies c
LEFT JOIN projects p ON p.company_id = c.id
LEFT JOIN filings f ON f.company_id = c.id
LEFT JOIN news n ON n.company_id = c.id
GROUP BY c.id;

-- Latest metal prices view
CREATE OR REPLACE VIEW latest_metal_prices AS
SELECT DISTINCT ON (commodity)
    commodity,
    symbol,
    price,
    currency,
    change_percent,
    day_high,
    day_low,
    prev_close,
    fetched_at
FROM metal_prices
ORDER BY commodity, fetched_at DESC;
