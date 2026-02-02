// Path to the SQLite DB created by the python pipeline
import path from 'path';
import fs from 'fs';

let dbInstance: any;

// Detect Vercel environment - check IMMEDIATELY before any requires
const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL === 'true' || !!process.env.NEXT_PUBLIC_VERCEL_URL;

// Mock database for Vercel
const mockDb = {
    prepare: () => ({
        get: () => null,
        all: () => [],
        run: () => ({ changes: 0, lastInsertRowid: 0 }),
        exec: () => { }
    }),
    exec: () => { }
};

if (IS_VERCEL) {
    console.log('Running on Vercel: Using Mock DB');
    dbInstance = mockDb;
} else {
    // Only import better-sqlite3 when NOT on Vercel
    try {
        const BetterSqlite3 = require('better-sqlite3');
        // Handle ESM default exports - the module might be { default: Database } or Database directly
        const Database = BetterSqlite3.default || BetterSqlite3;

        const potentialPaths = [
            path.join(process.cwd(), 'mining.db'),
            path.join(process.cwd(), '../database/mining.db'),
            path.join(process.cwd(), 'database/mining.db'),
        ];

        let dbPath = potentialPaths.find(p => fs.existsSync(p));

        if (!dbPath) {
            dbPath = path.join(process.cwd(), '../database/mining.db');
        }

        console.log(`Loading database from: ${dbPath}`);
        dbInstance = new Database(dbPath, { verbose: console.log });
    } catch (error) {
        console.error('Failed to load local database:', error);
        dbInstance = mockDb;
    }
}

export const db = dbInstance;

export function getCompany(ticker: string) {
    const stmt = db.prepare('SELECT * FROM companies WHERE ticker = ?');
    return stmt.get(ticker);
}

export function getCompanyByTicker(ticker: string) {
    return getCompany(ticker);
}

export function getProject(companyId: number) {
    const stmt = db.prepare('SELECT * FROM projects WHERE company_id = ?');
    return stmt.get(companyId);
}

export function getAllProjects(companyId: number) {
    const stmt = db.prepare(`
        SELECT 
            p.*,
            (SELECT COUNT(*) FROM extracted_metrics WHERE project_id = p.id) as metric_count
        FROM projects p
        WHERE p.company_id = ?
        ORDER BY p.name
    `);
    return stmt.all(companyId);
}

export function getProjectById(projectId: number) {
    const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
    return stmt.get(projectId);
}

export function getProjectMetrics(projectId: number) {
    const stmt = db.prepare(`
        SELECT em.*, f.filing_date 
        FROM extracted_metrics em
        LEFT JOIN filings f ON em.filing_id = f.id
        WHERE em.project_id = ?
        ORDER BY f.filing_date DESC, em.metric_name
    `);
    return stmt.all(projectId);
}

export function getCompanyByProjectId(projectId: number) {
    const stmt = db.prepare(`
        SELECT c.* FROM companies c
        INNER JOIN projects p ON p.company_id = c.id
        WHERE p.id = ?
    `);
    return stmt.get(projectId);
}

export function getMetrics(projectId: number) {
    const stmt = db.prepare(`
        SELECT em.*, f.filing_date 
        FROM extracted_metrics em
        LEFT JOIN filings f ON em.filing_id = f.id
        WHERE em.project_id = ? OR f.company_id = (SELECT company_id FROM projects WHERE id = ?)
        ORDER BY f.filing_date DESC
    `);
    return stmt.all(projectId, projectId);
}


export function getCompanies() {
    const stmt = db.prepare('SELECT * FROM companies ORDER BY market_cap DESC');
    return stmt.all();
}

export function getPriceHistory(companyId: number, days: number = 365) {
    const stmt = db.prepare(`
        SELECT date, open, high, low, close, volume 
        FROM price_history 
        WHERE company_id = ?
        ORDER BY date DESC
        LIMIT ?
    `);
    return stmt.all(companyId, days).reverse(); // Reverse to get chronological order
}

// =============================================================================
// STOCK SCREENER FUNCTIONS
// =============================================================================

export interface StockFilters {
    commodity?: string;
    exchange?: string;
    minMarketCap?: number;
    maxMarketCap?: number;
    sortBy?: 'market_cap' | 'current_price' | 'name' | 'ticker';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

export function getStocks(filters: StockFilters = {}) {
    const {
        commodity,
        exchange,
        minMarketCap,
        maxMarketCap,
        sortBy = 'market_cap',
        sortOrder = 'desc',
        limit = 50,
        offset = 0
    } = filters;

    let query = `
        SELECT
            c.id,
            c.ticker,
            c.name,
            c.exchange,
            c.commodity,
            c.current_price,
            c.prev_close,
            c.day_change,
            c.day_change_percent,
            c.day_open,
            c.day_high,
            c.day_low,
            c.day_volume,
            c.market_cap,
            c.high_52w,
            c.low_52w,
            c.avg_volume,
            c.currency,
            c.last_updated,
            (SELECT COUNT(*) FROM projects WHERE company_id = c.id) as project_count
        FROM companies c
        WHERE 1=1
    `;
    const params: any[] = [];

    if (commodity) {
        query += ' AND c.commodity LIKE ?';
        params.push(`%${commodity}%`);
    }

    if (exchange) {
        query += ' AND c.exchange = ?';
        params.push(exchange);
    }

    if (minMarketCap) {
        query += ' AND c.market_cap >= ?';
        params.push(minMarketCap);
    }

    if (maxMarketCap) {
        query += ' AND c.market_cap <= ?';
        params.push(maxMarketCap);
    }

    // Sort - SQLite doesn't support NULLS LAST, use COALESCE workaround
    const validSortColumns = ['market_cap', 'current_price', 'day_change_percent', 'name', 'ticker'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'market_cap';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    // For numeric columns, use COALESCE to handle NULLs; for text columns, order normally
    const numericColumns = ['market_cap', 'current_price', 'day_change_percent'];
    if (numericColumns.includes(sortColumn)) {
        query += ` ORDER BY COALESCE(c.${sortColumn}, 0) ${order}`;
    } else {
        query += ` ORDER BY c.${sortColumn} ${order}`;
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(query);
    return stmt.all(...params);
}

export function getStockDetail(ticker: string) {
    // Get company with all details
    const companyStmt = db.prepare(`
        SELECT 
            c.*,
            (SELECT COUNT(*) FROM projects WHERE company_id = c.id) as project_count,
            (SELECT COUNT(*) FROM filings WHERE company_id = c.id) as filing_count
        FROM companies c
        WHERE c.ticker = ?
    `);
    const company = companyStmt.get(ticker);
    if (!company) return null;

    // Get projects
    const projectsStmt = db.prepare(`
        SELECT * FROM projects WHERE company_id = ? ORDER BY name
    `);
    const projects = projectsStmt.all((company as any).id);

    // Get latest financials
    const financialsStmt = db.prepare(`
        SELECT * FROM financials 
        WHERE company_id = ? 
        ORDER BY period_end DESC 
        LIMIT 8
    `);
    const financials = financialsStmt.all((company as any).id);

    // Get price history (1 year)
    const priceStmt = db.prepare(`
        SELECT date, open, high, low, close, volume 
        FROM price_history 
        WHERE company_id = ?
        ORDER BY date DESC
        LIMIT 365
    `);
    const priceHistory = priceStmt.all((company as any).id).reverse();

    return {
        company,
        projects,
        financials,
        priceHistory
    };
}

export function getFinancials(companyId: number, limit: number = 8) {
    // Consolidate income, balance, and cashflow statements for each period
    const stmt = db.prepare(`
        SELECT
            period_end,
            period_type,
            MAX(currency) as currency,
            -- Income Statement
            MAX(total_revenue) as revenue,
            MAX(cost_of_revenue) as cost_of_revenue,
            MAX(gross_profit) as gross_profit,
            MAX(operating_expenses) as operating_expenses,
            MAX(operating_income) as operating_income,
            MAX(net_income) as net_income,
            MAX(ebitda) as ebitda,
            MAX(eps_basic) as eps_basic,
            MAX(eps_diluted) as eps_diluted,
            -- Balance Sheet
            MAX(total_assets) as total_assets,
            MAX(total_liabilities) as total_liabilities,
            MAX(total_equity) as total_equity,
            MAX(cash_and_equivalents) as cash_and_equivalents,
            MAX(total_debt) as total_debt,
            MAX(current_assets) as current_assets,
            MAX(current_liabilities) as current_liabilities,
            -- Cash Flow
            MAX(operating_cash_flow) as operating_cash_flow,
            MAX(investing_cash_flow) as investing_cash_flow,
            MAX(financing_cash_flow) as financing_cash_flow,
            MAX(free_cash_flow) as free_cash_flow,
            MAX(capital_expenditures) as capital_expenditures,
            -- Mining Specific
            MAX(production_oz) as production_oz,
            MAX(aisc_per_oz) as aisc_per_oz,
            MAX(cash_cost_per_oz) as cash_cost_per_oz,
            MAX(reserves_oz) as reserves_oz,
            MAX(resources_oz) as resources_oz
        FROM financials
        WHERE company_id = ?
        GROUP BY period_end, period_type
        ORDER BY period_end DESC
        LIMIT ?
    `);
    return stmt.all(companyId, limit);
}

// =============================================================================
// METAL PRICES
// =============================================================================

export function getMetalPrices() {
    const stmt = db.prepare(`
        SELECT * FROM metal_prices ORDER BY commodity
    `);
    return stmt.all();
}

export function getMetalPriceHistory(commodity: string, days: number = 365) {
    // Note: metal_prices_history uses 'commodity' column, not 'symbol'
    // and uses 'fetched_at' for timestamp, not 'date'
    const stmt = db.prepare(`
        SELECT fetched_at as date, price, currency
        FROM metal_prices_history
        WHERE commodity = ?
        ORDER BY fetched_at DESC
        LIMIT ?
    `);
    return stmt.all(commodity.toLowerCase(), days).reverse();
}

// =============================================================================
// NEWS
// =============================================================================

export interface NewsFilters {
    ticker?: string;
    source?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
}

export function getNews(filters: NewsFilters = {}) {
    const { ticker, source, search, dateFrom, dateTo, limit = 20, offset = 0 } = filters;

    let query = 'SELECT * FROM news WHERE 1=1';
    const params: any[] = [];

    if (ticker) {
        query += ' AND ticker = ?';
        params.push(ticker);
    }

    if (source) {
        query += ' AND source = ?';
        params.push(source);
    }

    if (search) {
        query += ' AND (title LIKE ? OR description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    if (dateFrom) {
        query += ' AND published_at >= ?';
        params.push(dateFrom);
    }

    if (dateTo) {
        query += ' AND published_at <= ?';
        params.push(dateTo);
    }

    query += ' ORDER BY published_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(query);
    return stmt.all(...params);
}

export function getNewsById(id: number) {
    const stmt = db.prepare('SELECT * FROM news WHERE id = ?');
    return stmt.get(id);
}

// =============================================================================
// EARNINGS & PRODUCTION
// =============================================================================

export function getEarnings(companyId: number, limit: number = 10) {
    const stmt = db.prepare(`
        SELECT
            id,
            company_id,
            ticker,
            period,
            period_end,
            mine_name,
            gold_oz,
            silver_oz,
            copper_lbs,
            gold_equivalent_oz,
            ore_processed_tonnes,
            head_grade,
            recovery_rate,
            aisc_per_oz,
            cash_cost_per_oz,
            source_url,
            extraction_method,
            confidence,
            created_at
        FROM earnings
        WHERE company_id = ?
        ORDER BY period_end DESC
        LIMIT ?
    `);
    return stmt.all(companyId, limit);
}

export function getEarningsByTicker(ticker: string, limit: number = 10) {
    const stmt = db.prepare(`
        SELECT
            id,
            company_id,
            ticker,
            period,
            period_end,
            mine_name,
            gold_oz,
            silver_oz,
            copper_lbs,
            gold_equivalent_oz,
            ore_processed_tonnes,
            head_grade,
            recovery_rate,
            aisc_per_oz,
            cash_cost_per_oz,
            source_url,
            extraction_method,
            confidence,
            created_at
        FROM earnings
        WHERE ticker = ?
        ORDER BY period_end DESC
        LIMIT ?
    `);
    return stmt.all(ticker.toUpperCase(), limit);
}

export function getTechnicalReports(companyId: number) {
    const stmt = db.prepare(`
        SELECT * FROM technical_reports
        WHERE company_id = ?
        ORDER BY effective_date DESC
    `);
    return stmt.all(companyId);
}

export function getMineralEstimates(companyId: number) {
    const stmt = db.prepare(`
        SELECT * FROM mineral_estimates
        WHERE company_id = ?
        ORDER BY category, commodity
    `);
    return stmt.all(companyId);
}

// =============================================================================
// MINE PRODUCTION (Enhanced)
// =============================================================================

export function getProjectProduction(projectId: number, quarters: number = 8) {
    const stmt = db.prepare(`
        SELECT 
            id, project_id, period_type, period_end,
            ore_mined_tonnes, ore_processed_tonnes, throughput_tpd,
            head_grade, head_grade_unit, recovery_rate,
            gold_produced_oz, silver_produced_oz, copper_produced_lbs,
            nickel_produced_lbs, uranium_produced_lbs,
            platinum_produced_oz, palladium_produced_oz,
            gold_equivalent_oz, copper_equivalent_lbs,
            aisc_per_oz, cash_cost_per_oz, aisc_per_lb, cash_cost_per_lb,
            mining_cost_per_tonne, processing_cost_per_tonne,
            source_url, source_type, source_priority, confidence_score,
            created_at
        FROM mine_production
        WHERE project_id = ?
        ORDER BY period_end DESC
        LIMIT ?
    `);
    return stmt.all(projectId, quarters);
}

export function getCompanyProduction(companyId: number, quarters: number = 8) {
    const stmt = db.prepare(`
        SELECT 
            mp.*,
            p.name as project_name
        FROM mine_production mp
        JOIN projects p ON mp.project_id = p.id
        WHERE p.company_id = ?
        ORDER BY mp.period_end DESC
        LIMIT ?
    `);
    return stmt.all(companyId, quarters * 10); // Allow multiple projects
}

// =============================================================================
// RESERVES & RESOURCES (Enhanced)
// =============================================================================

export function getProjectReserves(projectId: number) {
    const stmt = db.prepare(`
        SELECT 
            id, project_id, report_date, category, is_reserve,
            deposit_name, tonnes, grade, grade_unit,
            contained_metal, contained_metal_unit,
            secondary_grade, secondary_grade_unit,
            secondary_contained, secondary_contained_unit,
            cutoff_grade, cutoff_grade_unit,
            metal_price_assumption, metal_price_currency,
            technical_report_title, qualified_person,
            created_at
        FROM reserves_resources
        WHERE project_id = ?
        ORDER BY 
            CASE category
                WHEN 'proven' THEN 1
                WHEN 'probable' THEN 2
                WHEN 'measured' THEN 3
                WHEN 'indicated' THEN 4
                WHEN 'inferred' THEN 5
                ELSE 6
            END,
            report_date DESC
    `);
    return stmt.all(projectId);
}

export function getLatestReserves(projectId: number) {
    // Get latest report date
    const latestStmt = db.prepare(`
        SELECT MAX(report_date) as latest_date FROM reserves_resources
        WHERE project_id = ?
    `);
    const latest = latestStmt.get(projectId) as any;

    if (!latest?.latest_date) return null;

    // Get summarized reserves/resources for that date
    const stmt = db.prepare(`
        SELECT 
            category, is_reserve,
            SUM(tonnes) as total_tonnes,
            AVG(grade) as avg_grade,
            MAX(grade_unit) as grade_unit,
            SUM(contained_metal) as total_contained,
            MAX(contained_metal_unit) as contained_unit
        FROM reserves_resources
        WHERE project_id = ? AND report_date = ?
        GROUP BY category, is_reserve
    `);

    return {
        report_date: latest.latest_date,
        classifications: stmt.all(projectId, latest.latest_date)
    };
}

// =============================================================================
// PROJECT ECONOMICS (NPV, IRR, Payback)
// =============================================================================

export function getProjectEconomics(projectId: number) {
    const stmt = db.prepare(`
        SELECT 
            id, project_id, study_type, study_date,
            npv_million, npv_discount_rate, irr_percent, payback_years,
            initial_capex_million, sustaining_capex_million, opex_per_tonne,
            mine_life_years, annual_production_target, production_unit,
            gold_price_assumption, copper_price_assumption, 
            silver_price_assumption, uranium_price_assumption,
            source_url, source_type, source_priority, confidence_score,
            created_at
        FROM project_economics
        WHERE project_id = ?
        ORDER BY 
            CASE study_type
                WHEN 'dfs' THEN 1
                WHEN 'pfs' THEN 2
                WHEN 'pea' THEN 3
                ELSE 4
            END,
            study_date DESC
    `);
    return stmt.all(projectId);
}

export function getLatestEconomics(projectId: number) {
    const economics = getProjectEconomics(projectId) as any[];
    return economics.length > 0 ? economics[0] : null;
}

// =============================================================================
// COMPANY-LEVEL RESERVES & ECONOMICS (Aggregated from all projects)
// =============================================================================

export interface CompanyReserveSummary {
    category: string;
    is_reserve: number;
    total_tonnes: number | null;
    avg_grade: number | null;
    grade_unit: string | null;
    total_contained: number | null;
    contained_unit: string | null;
    project_count: number;
    latest_report_date: string | null;
}

export interface CompanyEconomicsSummary {
    project_id: number;
    project_name: string;
    study_type: string | null;
    study_date: string | null;
    npv_million: number | null;
    npv_discount_rate: number | null;
    irr_percent: number | null;
    payback_years: number | null;
    initial_capex_million: number | null;
    mine_life_years: number | null;
    gold_price_assumption: number | null;
}

/**
 * Get aggregated reserves/resources for all projects belonging to a company.
 * Groups by category and returns totals.
 */
export function getCompanyReserves(companyId: number): CompanyReserveSummary[] {
    try {
        const stmt = db.prepare(`
            SELECT
                rr.category,
                rr.is_reserve,
                SUM(rr.tonnes) as total_tonnes,
                AVG(rr.grade) as avg_grade,
                MAX(rr.grade_unit) as grade_unit,
                SUM(rr.contained_metal) as total_contained,
                MAX(rr.contained_metal_unit) as contained_unit,
                COUNT(DISTINCT rr.project_id) as project_count,
                MAX(rr.report_date) as latest_report_date
            FROM reserves_resources rr
            INNER JOIN projects p ON rr.project_id = p.id
            WHERE p.company_id = ?
            GROUP BY rr.category, rr.is_reserve
            ORDER BY
                rr.is_reserve DESC,
                CASE LOWER(rr.category)
                    WHEN 'proven' THEN 1
                    WHEN 'probable' THEN 2
                    WHEN 'p+p' THEN 3
                    WHEN 'measured' THEN 4
                    WHEN 'indicated' THEN 5
                    WHEN 'm+i' THEN 6
                    WHEN 'measured+indicated' THEN 6
                    WHEN 'inferred' THEN 7
                    ELSE 8
                END
        `);
        return stmt.all(companyId) as CompanyReserveSummary[];
    } catch (error) {
        console.error('Error fetching company reserves:', error);
        return [];
    }
}

/**
 * Get economics studies for all projects belonging to a company.
 * Returns individual project economics, sorted by study confidence.
 */
export function getCompanyEconomics(companyId: number): CompanyEconomicsSummary[] {
    try {
        const stmt = db.prepare(`
            SELECT
                pe.project_id,
                p.name as project_name,
                pe.study_type,
                pe.study_date,
                pe.npv_million,
                pe.npv_discount_rate,
                pe.irr_percent,
                pe.payback_years,
                pe.initial_capex_million,
                pe.mine_life_years,
                pe.gold_price_assumption
            FROM project_economics pe
            INNER JOIN projects p ON pe.project_id = p.id
            WHERE p.company_id = ?
            ORDER BY
                CASE LOWER(pe.study_type)
                    WHEN 'dfs' THEN 1
                    WHEN 'fs' THEN 1
                    WHEN 'pfs' THEN 2
                    WHEN 'pea' THEN 3
                    ELSE 4
                END,
                pe.study_date DESC
        `);
        return stmt.all(companyId) as CompanyEconomicsSummary[];
    } catch (error) {
        console.error('Error fetching company economics:', error);
        return [];
    }
}

/**
 * Get a summary of NI 43-101 data for a company.
 * Returns key metrics for quick display.
 */
export function getCompanyNI43101Summary(companyId: number) {
    const reserves = getCompanyReserves(companyId);
    const economics = getCompanyEconomics(companyId);

    // Calculate totals
    const totalReserveOz = reserves
        .filter(r => r.is_reserve === 1)
        .reduce((sum, r) => sum + (r.total_contained || 0), 0);

    const totalResourceOz = reserves
        .filter(r => r.is_reserve === 0)
        .reduce((sum, r) => sum + (r.total_contained || 0), 0);

    // Get best economics (highest confidence study)
    const bestEconomics = economics.length > 0 ? economics[0] : null;

    return {
        has_data: reserves.length > 0 || economics.length > 0,
        reserves: {
            total_contained_moz: totalReserveOz,
            categories: reserves.filter(r => r.is_reserve === 1),
        },
        resources: {
            total_contained_moz: totalResourceOz,
            categories: reserves.filter(r => r.is_reserve === 0),
        },
        economics: bestEconomics,
        all_economics: economics,
        project_count: new Set([...reserves.map(r => r.project_count), ...economics.map(e => e.project_id)]).size,
    };
}

// =============================================================================
// INSIDER TRANSACTIONS
// =============================================================================

export interface InsiderTransaction {
    id: number;
    company_id: number;
    ticker: string;
    insider_name: string;
    insider_role: string | null;
    transaction_type: string | null;
    transaction_date: string | null;
    shares: number | null;
    price_per_share: number | null;
    total_value: number | null;
    shares_held_after: number | null;
    source_url: string | null;
    fetched_at: string;
}

export interface InsiderSummary {
    net_shares: number;
    net_value: number;
    buy_count: number;
    sell_count: number;
    total_bought: number;
    total_sold: number;
    value_bought: number;
    value_sold: number;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    period_days: number;
}

export function getInsiderTransactions(companyId: number, limit: number = 20): InsiderTransaction[] {
    try {
        const stmt = db.prepare(`
            SELECT * FROM insider_transactions
            WHERE company_id = ?
            ORDER BY transaction_date DESC
            LIMIT ?
        `);
        return stmt.all(companyId, limit) as InsiderTransaction[];
    } catch (error) {
        // Table may not exist yet
        return [];
    }
}

export function getInsiderSummary(companyId: number, days: number = 90): InsiderSummary {
    try {
        const stmt = db.prepare(`
            SELECT 
                COUNT(*) as total_transactions,
                SUM(CASE WHEN transaction_type IN ('Buy', 'Purchase', 'Acquisition') THEN 1 ELSE 0 END) as buy_count,
                SUM(CASE WHEN transaction_type IN ('Sell', 'Sale', 'Disposition') THEN 1 ELSE 0 END) as sell_count,
                SUM(CASE WHEN transaction_type IN ('Buy', 'Purchase', 'Acquisition') THEN shares ELSE 0 END) as total_bought,
                SUM(CASE WHEN transaction_type IN ('Sell', 'Sale', 'Disposition') THEN shares ELSE 0 END) as total_sold,
                SUM(CASE WHEN transaction_type IN ('Buy', 'Purchase', 'Acquisition') THEN total_value ELSE 0 END) as value_bought,
                SUM(CASE WHEN transaction_type IN ('Sell', 'Sale', 'Disposition') THEN total_value ELSE 0 END) as value_sold
            FROM insider_transactions
            WHERE company_id = ? AND transaction_date >= date('now', ?)
        `);

        const result = stmt.get(companyId, `-${days} days`) as any;

        const netShares = (result?.total_bought || 0) - (result?.total_sold || 0);
        const netValue = (result?.value_bought || 0) - (result?.value_sold || 0);

        return {
            net_shares: netShares,
            net_value: netValue,
            buy_count: result?.buy_count || 0,
            sell_count: result?.sell_count || 0,
            total_bought: result?.total_bought || 0,
            total_sold: result?.total_sold || 0,
            value_bought: result?.value_bought || 0,
            value_sold: result?.value_sold || 0,
            sentiment: netShares > 0 ? 'bullish' : (netShares < 0 ? 'bearish' : 'neutral'),
            period_days: days
        };
    } catch (error) {
        // Table may not exist yet
        return {
            net_shares: 0,
            net_value: 0,
            buy_count: 0,
            sell_count: 0,
            total_bought: 0,
            total_sold: 0,
            value_bought: 0,
            value_sold: 0,
            sentiment: 'neutral',
            period_days: days
        };
    }
}

// =============================================================================
// STATS
// =============================================================================

export function getDashboardStats() {
    const stats: any = {};

    const companyCount = db.prepare('SELECT COUNT(*) as count FROM companies').get() as any;
    stats.totalCompanies = companyCount?.count || 0;

    const marketCapSum = db.prepare('SELECT SUM(market_cap) as total FROM companies').get() as any;
    stats.totalMarketCap = marketCapSum?.total || 0;

    const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get() as any;
    stats.totalProjects = projectCount?.count || 0;

    const newsCount = db.prepare('SELECT COUNT(*) as count FROM news').get() as any;
    stats.totalNews = newsCount?.count || 0;

    return stats;
}

// =============================================================================
// REPORTS (Custom Research Reports)
// =============================================================================

// Initialize reports table
db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        ticker TEXT,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_reports_ticker ON reports(ticker);
    CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);
`);

export interface Report {
    id: number;
    title: string;
    ticker: string | null;
    filename: string;
    file_path: string;
    file_size: number | null;
    created_at: string;
}

export interface ReportInput {
    title: string;
    ticker?: string | null;
    filename: string;
    file_path: string;
    file_size?: number | null;
}

export function getReports(ticker?: string): Report[] {
    if (ticker) {
        const stmt = db.prepare(`
            SELECT * FROM reports
            WHERE ticker = ?
            ORDER BY created_at DESC
        `);
        return stmt.all(ticker.toUpperCase()) as Report[];
    }

    const stmt = db.prepare('SELECT * FROM reports ORDER BY created_at DESC');
    return stmt.all() as Report[];
}

export function getReportById(id: number): Report | undefined {
    const stmt = db.prepare('SELECT * FROM reports WHERE id = ?');
    return stmt.get(id) as Report | undefined;
}

export function createReport(data: ReportInput): Report {
    const stmt = db.prepare(`
        INSERT INTO reports (title, ticker, filename, file_path, file_size)
        VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
        data.title,
        data.ticker?.toUpperCase() || null,
        data.filename,
        data.file_path,
        data.file_size || null
    );
    return getReportById(result.lastInsertRowid as number) as Report;
}

export function deleteReport(id: number): boolean {
    const stmt = db.prepare('DELETE FROM reports WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
}
