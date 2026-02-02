import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "../database/mining.db")

def init_tables():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Companies (Already likely exists, but ensuring columns)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        ticker TEXT NOT NULL UNIQUE,
        exchange TEXT DEFAULT 'TSX',
        website TEXT,
        currency TEXT DEFAULT 'CAD',
        current_price REAL,
        market_cap REAL,
        high_52w REAL,
        low_52w REAL,
        avg_volume INTEGER,
        last_updated TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # 2. Projects
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER REFERENCES companies(id),
        name TEXT NOT NULL,
        location TEXT,
        latitude REAL,
        longitude REAL,
        stage TEXT,
        commodity TEXT,
        ownership_percentage REAL DEFAULT 100.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # 3. Filings (The missing one!)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS filings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER REFERENCES companies(id),
        filing_type TEXT,
        filing_date DATE,
        sedar_url TEXT UNIQUE,
        local_path TEXT,
        is_processed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # 4. Extracted Metrics
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS extracted_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filing_id INTEGER REFERENCES filings(id),
        project_id INTEGER REFERENCES projects(id),
        metric_name TEXT NOT NULL,
        metric_value REAL,
        unit TEXT,
        period_start DATE,
        period_end DATE,
        confidence_score REAL,
        raw_text_snippet TEXT,
        hole_id TEXT,
        interval_length REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # 5. Financial Statements (Income Statement, Balance Sheet, Cash Flow)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS financials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER REFERENCES companies(id),
        statement_type TEXT NOT NULL,  -- 'income', 'balance', 'cashflow'
        period_type TEXT NOT NULL,     -- 'annual', 'quarterly'
        period_end DATE NOT NULL,
        currency TEXT DEFAULT 'USD',

        -- Income Statement Items
        total_revenue REAL,
        cost_of_revenue REAL,
        gross_profit REAL,
        operating_expenses REAL,
        operating_income REAL,
        net_income REAL,
        ebitda REAL,
        eps_basic REAL,
        eps_diluted REAL,

        -- Balance Sheet Items
        total_assets REAL,
        total_liabilities REAL,
        total_equity REAL,
        cash_and_equivalents REAL,
        total_debt REAL,
        current_assets REAL,
        current_liabilities REAL,

        -- Cash Flow Items
        operating_cash_flow REAL,
        investing_cash_flow REAL,
        financing_cash_flow REAL,
        free_cash_flow REAL,
        capital_expenditures REAL,

        -- Mining-Specific Metrics
        production_oz REAL,           -- Gold/silver production in oz
        aisc_per_oz REAL,             -- All-in sustaining cost per oz
        cash_cost_per_oz REAL,
        reserves_oz REAL,
        resources_oz REAL,

        -- Metadata
        source TEXT DEFAULT 'yfinance',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(company_id, statement_type, period_type, period_end)
    )
    ''')

    # 6. Price History (for charts and analytics)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER REFERENCES companies(id),
        date DATE NOT NULL,
        open REAL,
        high REAL,
        low REAL,
        close REAL,
        adj_close REAL,
        volume INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(company_id, date)
    )
    ''')

    # 7. Mine Production (project-level operational data)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS mine_production (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER REFERENCES projects(id),
        period_type TEXT NOT NULL,          -- 'quarterly', 'annual'
        period_end DATE NOT NULL,

        -- Production Metrics
        ore_mined_tonnes REAL,              -- Tonnes of ore mined
        ore_processed_tonnes REAL,          -- Tonnes of ore processed/milled
        head_grade REAL,                    -- Grade of ore processed (g/t or %)
        head_grade_unit TEXT,               -- 'g/t', '%', 'oz/t'
        recovery_rate REAL,                 -- Mill recovery percentage

        -- Metal Production (can have multiple metals per mine)
        gold_produced_oz REAL,
        silver_produced_oz REAL,
        copper_produced_lbs REAL,
        zinc_produced_lbs REAL,
        lead_produced_lbs REAL,
        nickel_produced_lbs REAL,

        -- Equivalent Production (for polymetallic mines)
        gold_equivalent_oz REAL,
        copper_equivalent_lbs REAL,

        -- Cost Metrics
        cash_cost_per_oz REAL,              -- C1 cash cost
        aisc_per_oz REAL,                   -- All-in sustaining cost
        cash_cost_per_lb REAL,              -- For base metals
        aisc_per_lb REAL,

        -- Operating Metrics
        mining_cost_per_tonne REAL,
        processing_cost_per_tonne REAL,
        g_and_a_cost_per_tonne REAL,

        -- Source tracking
        filing_id INTEGER REFERENCES filings(id),
        source_url TEXT,
        confidence_score REAL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, period_type, period_end)
    )
    ''')

    # 8. Reserves and Resources (NI 43-101 compliant)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS reserves_resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER REFERENCES projects(id),
        report_date DATE NOT NULL,          -- Date of the technical report

        -- Classification (NI 43-101 categories)
        category TEXT NOT NULL,             -- 'proven', 'probable', 'measured', 'indicated', 'inferred'
        is_reserve BOOLEAN,                 -- TRUE for reserves, FALSE for resources

        -- Deposit/Zone info
        deposit_name TEXT,                  -- Specific deposit or zone within project

        -- Tonnage and Grade
        tonnes REAL,                        -- Million tonnes (Mt)
        grade REAL,                         -- Primary metal grade
        grade_unit TEXT,                    -- 'g/t Au', '% Cu', etc.
        secondary_contained REAL,
        secondary_contained_unit TEXT,

        -- Cut-off and assumptions
        cutoff_grade REAL,
        cutoff_grade_unit TEXT,
        metal_price_assumption REAL,        -- Price used in calculation
        metal_price_currency TEXT,

        -- Source
        filing_id INTEGER REFERENCES filings(id),
        technical_report_title TEXT,
        qualified_person TEXT,              -- QP name for NI 43-101

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, report_date, category, deposit_name)
    )
    ''')

    # =============================================================================
    # INGESTION QUEUE (Automated Pipeline)
    # =============================================================================
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS ingestion_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_url TEXT UNIQUE NOT NULL,
        source_type TEXT NOT NULL,         -- 'sedar', 'press_release', 'newsfile'
        document_type TEXT,                -- 'technical_report', 'production_report', 'financials'
        company_id INTEGER REFERENCES companies(id),
        status TEXT DEFAULT 'PENDING',     -- 'PENDING', 'DOWNLOADED', 'PROCESSING', 'COMPLETED', 'FAILED'
        priority INTEGER DEFAULT 0,        -- Higher number = higher priority
        
        -- Processing Metadata
        local_path TEXT,
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        
        -- Timestamps
        discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP,
        
        -- For optimistic locking / duplicate prevention
        content_hash TEXT
    )
    ''')
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_queue_status ON ingestion_queue(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_queue_company ON ingestion_queue(company_id)")

    # 9. Project Economics (NPV, IRR from technical studies)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS project_economics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER REFERENCES projects(id),
        
        -- Study info
        study_type TEXT,                 -- 'pea', 'pfs', 'dfs'
        study_date DATE,
        
        -- Key metrics
        npv_million REAL,
        npv_discount_rate REAL,
        irr_percent REAL,
        payback_years REAL,
        
        -- Assumptions used
        gold_price_assumption REAL,
        copper_price_assumption REAL,
        silver_price_assumption REAL,
        uranium_price_assumption REAL,
        
        -- CapEx/OpEx
        initial_capex_million REAL,
        sustaining_capex_million REAL,
        opex_per_tonne REAL,
        
        -- Life of Mine
        mine_life_years REAL,
        annual_production_target REAL,
        production_unit TEXT,            -- 'oz', 'lbs', 'tonnes'
        
        -- Source tracking
        source_url TEXT,
        source_type TEXT,                -- 'press_release', 'ni_43_101', 'quarterly'
        source_priority INTEGER DEFAULT 2,  -- 1=SEDAR, 2=Press Release, 3=Presentation
        confidence_score REAL,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, study_type, study_date)
    )
    ''')

    # 10. Project NAV Cache (for storing computed NAV values)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS project_nav_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER REFERENCES projects(id),
        company_id INTEGER REFERENCES companies(id),
        
        -- NAV components
        nav_million REAL,               -- Computed NAV at current metal prices
        nav_per_share REAL,             -- NAV / shares outstanding
        
        -- Inputs used (for cache invalidation)
        gold_price_used REAL,
        copper_price_used REAL,
        silver_price_used REAL,
        discount_rate REAL DEFAULT 5.0,
        
        -- Metadata
        calculation_method TEXT,        -- 'dcf', 'in_situ', 'comparable'
        last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(project_id)
    )
    ''')

    # 10. M&A Transactions (for tracking mining sector deals)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS ma_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        
        -- Deal parties
        acquirer_name TEXT NOT NULL,
        acquirer_ticker TEXT,
        target_name TEXT NOT NULL,
        target_ticker TEXT,
        
        -- Deal details
        transaction_type TEXT,          -- 'acquisition', 'merger', 'asset_sale', 'jv'
        deal_value_million REAL,
        currency TEXT DEFAULT 'USD',
        announcement_date DATE,
        completion_date DATE,
        deal_status TEXT DEFAULT 'announced', -- 'announced', 'completed', 'terminated'
        
        -- Asset details
        asset_name TEXT,                -- Specific project/mine name if asset sale
        commodity TEXT,
        stage TEXT,                     -- 'producing', 'development', 'exploration'
        location TEXT,
        
        -- Valuation metrics
        contained_gold_moz REAL,
        contained_copper_mlbs REAL,
        price_per_oz REAL,              -- Deal value per oz of resource
        price_per_lb REAL,
        ev_resource_multiple REAL,
        
        -- Source
        source_url TEXT,
        notes TEXT,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Indexes - use IF NOT EXISTS so these don't fail if already created
    index_statements = [
        "CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker)",
        "CREATE INDEX IF NOT EXISTS idx_financials_company ON financials(company_id)",
        "CREATE INDEX IF NOT EXISTS idx_financials_period ON financials(period_end)",
        "CREATE INDEX IF NOT EXISTS idx_price_history_company ON price_history(company_id)",
        "CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(date)",
        "CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id)",
        "CREATE INDEX IF NOT EXISTS idx_mine_production_project ON mine_production(project_id)",
        "CREATE INDEX IF NOT EXISTS idx_mine_production_period ON mine_production(period_end)",
        "CREATE INDEX IF NOT EXISTS idx_reserves_project ON reserves_resources(project_id)",
        "CREATE INDEX IF NOT EXISTS idx_filings_company ON filings(company_id)",
        # New indexes for NAV and M&A tables
        "CREATE INDEX IF NOT EXISTS idx_nav_cache_project ON project_nav_cache(project_id)",
        "CREATE INDEX IF NOT EXISTS idx_nav_cache_company ON project_nav_cache(company_id)",
        "CREATE INDEX IF NOT EXISTS idx_ma_commodity ON ma_transactions(commodity)",
        "CREATE INDEX IF NOT EXISTS idx_ma_stage ON ma_transactions(stage)",
        "CREATE INDEX IF NOT EXISTS idx_ma_date ON ma_transactions(announcement_date)",
    ]
    for stmt in index_statements:
        try:
            cursor.execute(stmt)
        except sqlite3.OperationalError:
            pass  # Table may not exist yet

    # Schema Migration (Fix for missing columns in older tables)
    # Check if filings table has filing_id (it should, but checking extracted_metrics)
    cursor.execute("PRAGMA table_info(extracted_metrics)")
    columns = [info[1] for info in cursor.fetchall()]
    if 'filing_id' not in columns:
        print("Migrating extracted_metrics: Adding filing_id column...")
        try:
            cursor.execute("ALTER TABLE extracted_metrics ADD COLUMN filing_id INTEGER REFERENCES filings(id)")
        except Exception as e:
            print(f"Migration failed for filing_id: {e}")
            
    if 'confidence_score' not in columns:
        print("Migrating extracted_metrics: Adding confidence_score column...")
        try:
            cursor.execute("ALTER TABLE extracted_metrics ADD COLUMN confidence_score REAL")
        except Exception as e:
            print(f"Migration failed for confidence_score: {e}")

    if 'raw_text_snippet' not in columns:
        print("Migrating extracted_metrics: Adding raw_text_snippet column...")
        try:
            cursor.execute("ALTER TABLE extracted_metrics ADD COLUMN raw_text_snippet TEXT")
        except Exception as e:
            print(f"Migration failed for raw_text_snippet: {e}")

    # Check for commodity in companies
    cursor.execute("PRAGMA table_info(companies)")
    comp_columns = [info[1] for info in cursor.fetchall()]
    if 'commodity' not in comp_columns:
        print("Migrating companies: Adding commodity column...")
        try:
            cursor.execute("ALTER TABLE companies ADD COLUMN commodity TEXT")
        except Exception as e:
            print(f"Migration failed for commodity: {e}")

    # Migrate projects table - add throughput columns
    cursor.execute("PRAGMA table_info(projects)")
    proj_columns = [info[1] for info in cursor.fetchall()]
    projects_migrations = [
        ('throughput_tpd', 'REAL'),       # Tonnes per day capacity
        ('throughput_tpy', 'REAL'),       # Tonnes per year capacity
        ('mine_type', 'TEXT'),            # 'open_pit', 'underground', 'both'
        ('primary_commodity', 'TEXT'),    # Main commodity for sorting
    ]
    for col_name, col_type in projects_migrations:
        if col_name not in proj_columns:
            print(f"Migrating projects: Adding {col_name} column...")
            try:
                cursor.execute(f"ALTER TABLE projects ADD COLUMN {col_name} {col_type}")
            except Exception as e:
                print(f"Migration failed for {col_name}: {e}")

    # Migrate mine_production table - add uranium, PGMs, throughput
    cursor.execute("PRAGMA table_info(mine_production)")
    prod_columns = [info[1] for info in cursor.fetchall()]
    production_migrations = [
        ('uranium_produced_lbs', 'REAL'),   # Uranium (lbs U3O8)
        ('platinum_produced_oz', 'REAL'),   # Platinum
        ('palladium_produced_oz', 'REAL'),  # Palladium
        ('throughput_tpd', 'REAL'),         # Tonnes per day (actual)
        ('source_type', 'TEXT'),            # 'press_release', 'quarterly', 'ni_43_101'
        ('source_priority', 'INTEGER'),     # 1=SEDAR, 2=Press Release, 3=Presentation
    ]
    for col_name, col_type in production_migrations:
        if col_name not in prod_columns:
            print(f"Migrating mine_production: Adding {col_name} column...")
            try:
                cursor.execute(f"ALTER TABLE mine_production ADD COLUMN {col_name} {col_type}")
            except Exception as e:
                print(f"Migration failed for {col_name}: {e}")

    conn.commit()
    conn.close()
    print("Tables initialized successfully.")

if __name__ == "__main__":
    if not os.path.exists("../database"):
        os.makedirs("../database")
    init_tables()
