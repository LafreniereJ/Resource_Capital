-- =============================================================================
-- Database Schema for Resource Capital Mining Intelligence Platform
-- SQLite-compatible schema matching db_manager.py init_db()
-- Last updated: 2026-01-18
-- =============================================================================

PRAGMA foreign_keys = ON;

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Documents table - track uploaded PDF files
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_hash TEXT UNIQUE,
    file_size INTEGER,
    page_count INTEGER,
    document_type TEXT,
    document_subtype TEXT,
    classification_confidence REAL,
    company_id INTEGER REFERENCES companies(id),
    ticker TEXT,
    status TEXT DEFAULT 'pending',
    upload_source TEXT,
    storage_path TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    last_error TEXT,
    retry_count INTEGER DEFAULT 0
);

-- Extraction results table - flexible JSON storage for extractions
CREATE TABLE IF NOT EXISTS extraction_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER REFERENCES documents(id),
    extraction_type TEXT,
    extraction_method TEXT,
    extracted_data TEXT,
    confidence_score REAL,
    source_page INTEGER,
    source_section TEXT,
    raw_text_snippet TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Companies table - with market data columns
CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ticker TEXT NOT NULL UNIQUE,
    exchange TEXT DEFAULT 'TSX',
    website TEXT,
    commodity TEXT,
    -- Market Data (yfinance integration)
    currency TEXT DEFAULT 'CAD',
    current_price REAL,
    market_cap REAL,
    high_52w REAL,
    low_52w REAL,
    avg_volume INTEGER,
    -- Daily price tracking (for stock screener)
    prev_close REAL,
    day_change REAL,
    day_change_percent REAL,
    day_open REAL,
    day_high REAL,
    day_low REAL,
    day_volume INTEGER,
    -- Timestamps
    last_updated TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table - mining assets owned by companies
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    name TEXT NOT NULL,
    location TEXT,
    latitude REAL,
    longitude REAL,
    stage TEXT,
    commodity TEXT,
    ownership_percentage REAL DEFAULT 100.00 CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Filings table - track source documents from SEDAR/EDGAR
CREATE TABLE IF NOT EXISTS filings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    filing_type TEXT NOT NULL,
    filing_date DATE NOT NULL,
    sedar_url TEXT UNIQUE,
    local_path TEXT,
    is_processed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Extracted Metrics table - structured data pulled from PDFs
CREATE TABLE IF NOT EXISTS extracted_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filing_id INTEGER REFERENCES filings(id),
    project_id INTEGER REFERENCES projects(id),
    metric_name TEXT NOT NULL,
    metric_value REAL,
    unit TEXT,
    period_start DATE,
    period_end DATE,
    confidence_score REAL CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
    raw_text_snippet TEXT,
    hole_id TEXT,
    interval_length REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- NEWS & EXTRACTION QUEUE
-- =============================================================================

-- News table - cached news articles
CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id TEXT UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    source TEXT,
    published_at TIMESTAMP,
    company_id INTEGER REFERENCES companies(id),
    ticker TEXT,
    category TEXT,
    is_press_release INTEGER DEFAULT 0,
    image_url TEXT,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Extraction queue - pending extraction jobs
CREATE TABLE IF NOT EXISTS extraction_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER REFERENCES companies(id),
    url TEXT,
    extraction_type TEXT,
    source TEXT,
    news_id INTEGER REFERENCES news(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    attempts INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- =============================================================================
-- PRODUCTION & FINANCIAL DATA
-- =============================================================================

-- Earnings/production data
CREATE TABLE IF NOT EXISTS earnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    period TEXT NOT NULL,
    period_end DATE,
    mine_name TEXT DEFAULT 'Consolidated',
    gold_oz REAL,
    silver_oz REAL,
    copper_lbs REAL,
    gold_equivalent_oz REAL,
    ore_processed_tonnes REAL,
    head_grade REAL,
    recovery_rate REAL CHECK (recovery_rate IS NULL OR (recovery_rate >= 0 AND recovery_rate <= 1)),
    aisc_per_oz REAL,
    cash_cost_per_oz REAL,
    source_url TEXT,
    news_id INTEGER REFERENCES news(id),
    extraction_method TEXT,
    confidence REAL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, period, mine_name)
);

-- Technical report tracking
CREATE TABLE IF NOT EXISTS technical_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    report_type TEXT NOT NULL,
    effective_date DATE,
    project_name TEXT,
    pdf_url TEXT,
    local_path TEXT,
    is_extracted INTEGER DEFAULT 0,
    extraction_date TIMESTAMP,
    news_id INTEGER REFERENCES news(id),
    source TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, effective_date, report_type)
);

-- Mineral estimates (from technical reports)
CREATE TABLE IF NOT EXISTS mineral_estimates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL REFERENCES technical_reports(id),
    project_name TEXT,
    category TEXT NOT NULL,
    commodity TEXT NOT NULL,
    tonnage_mt REAL,
    grade REAL,
    grade_unit TEXT,
    contained_metal REAL,
    contained_unit TEXT,
    cutoff_grade REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project economics (from feasibility studies)
CREATE TABLE IF NOT EXISTS project_economics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL REFERENCES technical_reports(id),
    project_name TEXT,
    study_type TEXT NOT NULL,
    npv_million REAL,
    npv_discount_rate REAL CHECK (npv_discount_rate IS NULL OR (npv_discount_rate >= 0 AND npv_discount_rate <= 1)),
    irr_percent REAL,
    payback_years REAL,
    initial_capex_million REAL,
    sustaining_capex_million REAL,
    aisc_per_oz REAL,
    gold_price_assumption REAL,
    mine_life_years REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- MARKET DATA
-- =============================================================================

-- Metal prices table - current prices for commodities
CREATE TABLE IF NOT EXISTS metal_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commodity TEXT NOT NULL UNIQUE,
    symbol TEXT NOT NULL,
    price REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    change_percent REAL,
    day_high REAL,
    day_low REAL,
    prev_close REAL,
    source TEXT DEFAULT 'yfinance',
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Metal prices history - for charting
CREATE TABLE IF NOT EXISTS metal_prices_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commodity TEXT NOT NULL,
    price REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insider transactions table - tracks insider buying/selling activity
CREATE TABLE IF NOT EXISTS insider_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    insider_name TEXT NOT NULL,
    insider_role TEXT,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('Buy', 'Sell', 'Exercise', 'Grant', 'Other')),
    transaction_date DATE NOT NULL,
    shares INTEGER,
    price_per_share REAL,
    total_value REAL,
    shares_held_after INTEGER,
    source_url TEXT,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, insider_name, transaction_date, transaction_type, shares)
);

-- Mine production table - quarterly/annual production data
CREATE TABLE IF NOT EXISTS mine_production (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    period_type TEXT DEFAULT 'quarterly' CHECK (period_type IN ('quarterly', 'annual', 'monthly')),
    period_end DATE NOT NULL,
    ore_mined_tonnes REAL,
    ore_processed_tonnes REAL,
    throughput_tpd REAL,
    head_grade REAL,
    head_grade_unit TEXT,
    recovery_rate REAL CHECK (recovery_rate IS NULL OR (recovery_rate >= 0 AND recovery_rate <= 1)),
    gold_produced_oz REAL,
    silver_produced_oz REAL,
    copper_produced_lbs REAL,
    nickel_produced_lbs REAL,
    uranium_produced_lbs REAL,
    platinum_produced_oz REAL,
    palladium_produced_oz REAL,
    gold_equivalent_oz REAL,
    copper_equivalent_lbs REAL,
    aisc_per_oz REAL,
    cash_cost_per_oz REAL,
    aisc_per_lb REAL,
    cash_cost_per_lb REAL,
    mining_cost_per_tonne REAL,
    processing_cost_per_tonne REAL,
    source_url TEXT,
    source_type TEXT,
    source_priority INTEGER DEFAULT 2 CHECK (source_priority >= 1 AND source_priority <= 5),
    confidence_score REAL CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, period_type, period_end)
);

-- Reserves and resources table - mineral inventory
CREATE TABLE IF NOT EXISTS reserves_resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    report_date DATE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Measured', 'Indicated', 'Inferred', 'Proven', 'Probable', 'M&I', 'P&P')),
    is_reserve INTEGER DEFAULT 0 CHECK (is_reserve IN (0, 1)),
    deposit_name TEXT DEFAULT 'Main',
    tonnes REAL,
    grade REAL,
    grade_unit TEXT,
    contained_metal REAL,
    contained_metal_unit TEXT,
    secondary_grade REAL,
    secondary_grade_unit TEXT,
    secondary_contained REAL,
    secondary_contained_unit TEXT,
    cutoff_grade REAL,
    cutoff_grade_unit TEXT,
    metal_price_assumption REAL,
    metal_price_currency TEXT,
    technical_report_title TEXT,
    qualified_person TEXT,
    filing_id INTEGER REFERENCES filings(id),
    source_url TEXT,
    confidence_score REAL CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Price history table - daily stock prices
CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    date DATE NOT NULL,
    open REAL,
    high REAL,
    low REAL,
    close REAL,
    volume INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, date)
);

-- Financials table - financial statements
CREATE TABLE IF NOT EXISTS financials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    statement_type TEXT NOT NULL CHECK (statement_type IN ('income', 'balance', 'cashflow', 'combined')),
    period_type TEXT DEFAULT 'annual' CHECK (period_type IN ('annual', 'quarterly')),
    period_end DATE NOT NULL,
    currency TEXT DEFAULT 'CAD',
    total_revenue REAL,
    cost_of_revenue REAL,
    gross_profit REAL,
    operating_expenses REAL,
    operating_income REAL,
    net_income REAL,
    ebitda REAL,
    eps_basic REAL,
    eps_diluted REAL,
    total_assets REAL,
    total_liabilities REAL,
    total_equity REAL,
    cash_and_equivalents REAL,
    total_debt REAL,
    current_assets REAL,
    current_liabilities REAL,
    operating_cash_flow REAL,
    investing_cash_flow REAL,
    financing_cash_flow REAL,
    free_cash_flow REAL,
    capital_expenditures REAL,
    production_oz REAL,
    aisc_per_oz REAL,
    cash_cost_per_oz REAL,
    reserves_oz REAL,
    resources_oz REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, statement_type, period_type, period_end)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Companies
CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker);

-- Projects & Filings
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_filings_company ON filings(company_id);
CREATE INDEX IF NOT EXISTS idx_metrics_project ON extracted_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_metrics_filing ON extracted_metrics(filing_id);

-- News
CREATE INDEX IF NOT EXISTS idx_news_published ON news(published_at);
CREATE INDEX IF NOT EXISTS idx_news_ticker ON news(ticker);
CREATE INDEX IF NOT EXISTS idx_news_source ON news(source);
CREATE INDEX IF NOT EXISTS idx_news_company ON news(company_id);

-- Extraction Queue
CREATE INDEX IF NOT EXISTS idx_queue_status ON extraction_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_company ON extraction_queue(company_id);

-- Earnings & Technical Reports
CREATE INDEX IF NOT EXISTS idx_earnings_company ON earnings(company_id);
CREATE INDEX IF NOT EXISTS idx_earnings_period ON earnings(period);
CREATE INDEX IF NOT EXISTS idx_tech_reports_company ON technical_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_mineral_est_report ON mineral_estimates(report_id);
CREATE INDEX IF NOT EXISTS idx_economics_report ON project_economics(report_id);

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_hash ON documents(file_hash);
CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_extraction_results_doc ON extraction_results(document_id);

-- Market Data
CREATE INDEX IF NOT EXISTS idx_metal_prices_commodity ON metal_prices(commodity);
CREATE INDEX IF NOT EXISTS idx_metal_history_commodity ON metal_prices_history(commodity);
CREATE INDEX IF NOT EXISTS idx_metal_history_date ON metal_prices_history(fetched_at);
CREATE INDEX IF NOT EXISTS idx_price_history_company ON price_history(company_id);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(date);

-- Production & Resources
CREATE INDEX IF NOT EXISTS idx_mine_prod_project ON mine_production(project_id);
CREATE INDEX IF NOT EXISTS idx_mine_prod_date ON mine_production(period_end);
CREATE INDEX IF NOT EXISTS idx_reserves_project ON reserves_resources(project_id);
CREATE INDEX IF NOT EXISTS idx_reserves_date ON reserves_resources(report_date);

-- Financials
CREATE INDEX IF NOT EXISTS idx_financials_company ON financials(company_id);
CREATE INDEX IF NOT EXISTS idx_financials_period ON financials(period_end);

-- Insider Transactions
CREATE INDEX IF NOT EXISTS idx_insider_company ON insider_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_insider_date ON insider_transactions(transaction_date);
