-- Migration: 01_critical_items.sql
-- Purpose: Add support for Deep Mining Intelligence (Reserves, Economics)

-- 1. Mineral Estimates (The "Inventory")
-- Tracks Resources and Reserves with specific grades and tonnage.
CREATE TABLE IF NOT EXISTS mineral_estimates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id),
    filing_id INTEGER REFERENCES filings(id), -- Source document
    -- Classification
    category TEXT NOT NULL, -- e.g. "Proven", "Probable", "Measured", "Indicated", "Inferred"
    zone VARCHAR(100), -- Specific deposit zone e.g. "Main Zone"
    -- The Numbers
    tonnage_mt REAL, -- Millions of Tonnes
    grade REAL, -- Primary grade (e.g. g/t Au or % Cu)
    grade_unit VARCHAR(20), -- "g/t", "%", "ppm"
    contained_metal REAL, -- Total metal content
    contained_metal_unit VARCHAR(20), -- "Moz", "Mlbs", "koz"
    -- Metadata
    cutoff_grade REAL, -- The economic cutoff used
    commodity VARCHAR(50), -- "Gold", "Copper" (for polymetallic deposits)
    confidence_score REAL, -- Extraction confidence
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Project Economics (The "Value")
-- Captures the results of PEA / PFS / DFS studies.
CREATE TABLE IF NOT EXISTS project_economics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id),
    filing_id INTEGER REFERENCES filings(id),
    study_type VARCHAR(50), -- "PEA", "PFS", "DFS", "Feasibility"
    
    -- Valuation Metrics
    post_tax_npv_5pct REAL, -- Net Present Value @ 5% Discount ($M)
    post_tax_irr REAL, -- Internal Rate of Return (%)
    payback_period_years REAL, -- Years to recover capital
    
    -- Capital & Operating Costs
    initial_capex REAL, -- Initial Capital ($M)
    sustaining_capex REAL, -- LOM Sustaining Capital ($M)
    lom_years REAL, -- Life of Mine (Years)
    
    -- Operating Costs (User Requested)
    aisc_per_oz REAL, -- All-In Sustaining Cost ($/oz or $/lb based on commodity)
    cash_cost_per_oz REAL, -- C1 Cash Cost ($/oz)
    recovery_rate REAL, -- Metal Recovery (%)
    strip_ratio REAL, -- Waste:Ore Ratio
    
    -- Price Assumptions (Crucial context)
    price_assumption_gold REAL, -- $/oz used
    price_assumption_copper REAL, -- $/lb used
    
    currency VARCHAR(10) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_estimates_project ON mineral_estimates(project_id);
CREATE INDEX idx_economics_project ON project_economics(project_id);
