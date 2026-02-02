/**
 * Supabase Database Client for Resource Capital
 *
 * This replaces the SQLite-based db.ts with Supabase PostgreSQL
 * API surface is identical for easy migration
 *
 * Setup:
 * 1. npm install @supabase/supabase-js
 * 2. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local
 * 3. Rename this file to db.ts (backup the old one first)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables!');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// =============================================================================
// COMPANY FUNCTIONS
// =============================================================================

export async function getCompany(ticker: string) {
    const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .single();

    if (error) {
        console.error('Error fetching company:', error);
        return null;
    }
    return data;
}

export async function getCompanyByTicker(ticker: string) {
    return getCompany(ticker);
}

export async function getCompanies() {
    const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('market_cap', { ascending: false, nullsFirst: false });

    if (error) {
        console.error('Error fetching companies:', error);
        return [];
    }
    return data;
}

// =============================================================================
// PROJECT FUNCTIONS
// =============================================================================

export async function getProject(companyId: number) {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', companyId)
        .single();

    if (error) return null;
    return data;
}

export async function getAllProjects(companyId: number) {
    const { data, error } = await supabase
        .from('projects')
        .select(`
            *,
            extracted_metrics(count)
        `)
        .eq('company_id', companyId)
        .order('name');

    if (error) {
        console.error('Error fetching projects:', error);
        return [];
    }

    // Transform to match expected format
    return (data || []).map(p => ({
        ...p,
        metric_count: p.extracted_metrics?.[0]?.count || 0
    }));
}

export async function getProjectById(projectId: number) {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

    if (error) return null;
    return data;
}

export async function getProjectMetrics(projectId: number) {
    const { data, error } = await supabase
        .from('extracted_metrics')
        .select(`
            *,
            filings(filing_date)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching metrics:', error);
        return [];
    }

    return (data || []).map(m => ({
        ...m,
        filing_date: m.filings?.filing_date
    }));
}

export async function getCompanyByProjectId(projectId: number) {
    const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('company_id')
        .eq('id', projectId)
        .single();

    if (projectError || !project) return null;

    const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', project.company_id)
        .single();

    if (error) return null;
    return data;
}

// =============================================================================
// STOCK SCREENER FUNCTIONS
// =============================================================================

export interface StockFilters {
    commodity?: string;
    exchange?: string;
    minMarketCap?: number;
    maxMarketCap?: number;
    sortBy?: 'market_cap' | 'current_price' | 'day_change_percent' | 'name' | 'ticker';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

export async function getStocks(filters: StockFilters = {}) {
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

    let query = supabase
        .from('companies')
        .select(`
            id, ticker, name, exchange, commodity,
            current_price, prev_close, day_change, day_change_percent,
            day_open, day_high, day_low, day_volume,
            market_cap, high_52w, low_52w, avg_volume,
            currency, last_updated,
            projects(count)
        `);

    if (commodity) {
        query = query.ilike('commodity', `%${commodity}%`);
    }

    if (exchange) {
        query = query.eq('exchange', exchange);
    }

    if (minMarketCap) {
        query = query.gte('market_cap', minMarketCap);
    }

    if (maxMarketCap) {
        query = query.lte('market_cap', maxMarketCap);
    }

    // Sort
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending, nullsFirst: false });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching stocks:', error);
        return [];
    }

    // Transform to match expected format
    return (data || []).map(stock => ({
        ...stock,
        project_count: stock.projects?.[0]?.count || 0
    }));
}

export async function getStockDetail(ticker: string) {
    // Get company
    const { data: company, error: companyError } = await supabase
        .from('companies')
        .select(`
            *,
            projects(count),
            filings(count)
        `)
        .eq('ticker', ticker.toUpperCase())
        .single();

    if (companyError || !company) return null;

    // Get projects
    const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', company.id)
        .order('name');

    // Get financials
    const { data: financials } = await supabase
        .from('financials')
        .select('*')
        .eq('company_id', company.id)
        .order('period_end', { ascending: false })
        .limit(8);

    // Get price history
    const { data: priceHistory } = await supabase
        .from('price_history')
        .select('date, open, high, low, close, volume')
        .eq('company_id', company.id)
        .order('date', { ascending: false })
        .limit(365);

    return {
        company: {
            ...company,
            project_count: company.projects?.[0]?.count || 0,
            filing_count: company.filings?.[0]?.count || 0
        },
        projects: projects || [],
        financials: financials || [],
        priceHistory: (priceHistory || []).reverse()
    };
}

// =============================================================================
// PRICE HISTORY
// =============================================================================

export async function getPriceHistory(companyId: number, days: number = 365) {
    const { data, error } = await supabase
        .from('price_history')
        .select('date, open, high, low, close, volume')
        .eq('company_id', companyId)
        .order('date', { ascending: false })
        .limit(days);

    if (error) {
        console.error('Error fetching price history:', error);
        return [];
    }

    return (data || []).reverse();
}

// =============================================================================
// FINANCIALS
// =============================================================================

export async function getFinancials(companyId: number, limit: number = 8) {
    const { data, error } = await supabase
        .from('financials')
        .select('*')
        .eq('company_id', companyId)
        .order('period_end', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching financials:', error);
        return [];
    }

    return data || [];
}

// =============================================================================
// METAL PRICES
// =============================================================================

export async function getMetalPrices() {
    const { data, error } = await supabase
        .from('metal_prices')
        .select('*')
        .order('commodity');

    if (error) {
        console.error('Error fetching metal prices:', error);
        return [];
    }

    return data || [];
}

export async function getMetalPriceHistory(commodity: string, days: number = 365) {
    const { data, error } = await supabase
        .from('metal_prices_history')
        .select('fetched_at, price, currency')
        .eq('commodity', commodity.toLowerCase())
        .order('fetched_at', { ascending: false })
        .limit(days);

    if (error) {
        console.error('Error fetching metal price history:', error);
        return [];
    }

    // Transform to expected format
    return (data || []).reverse().map(d => ({
        date: d.fetched_at,
        price: d.price,
        currency: d.currency
    }));
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

export async function getNews(filters: NewsFilters = {}) {
    const { ticker, source, search, dateFrom, dateTo, limit = 20, offset = 0 } = filters;

    let query = supabase.from('news').select('*');

    if (ticker) {
        query = query.eq('ticker', ticker.toUpperCase());
    }

    if (source) {
        query = query.eq('source', source);
    }

    if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (dateFrom) {
        query = query.gte('published_at', dateFrom);
    }

    if (dateTo) {
        query = query.lte('published_at', dateTo);
    }

    query = query
        .order('published_at', { ascending: false })
        .range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching news:', error);
        return [];
    }

    return data || [];
}

export async function getNewsById(id: number) {
    const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return null;
    return data;
}

// =============================================================================
// EARNINGS & PRODUCTION
// =============================================================================

export async function getEarnings(companyId: number, limit: number = 10) {
    const { data, error } = await supabase
        .from('earnings')
        .select('*')
        .eq('company_id', companyId)
        .order('period_end', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching earnings:', error);
        return [];
    }

    return data || [];
}

export async function getEarningsByTicker(ticker: string, limit: number = 10) {
    const { data, error } = await supabase
        .from('earnings')
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .order('period_end', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching earnings:', error);
        return [];
    }

    return data || [];
}

export async function getTechnicalReports(companyId: number) {
    const { data, error } = await supabase
        .from('technical_reports')
        .select('*')
        .eq('company_id', companyId)
        .order('effective_date', { ascending: false });

    if (error) {
        console.error('Error fetching technical reports:', error);
        return [];
    }

    return data || [];
}

export async function getMineralEstimates(companyId: number) {
    const { data, error } = await supabase
        .from('mineral_estimates')
        .select('*')
        .eq('company_id', companyId)
        .order('category')
        .order('commodity');

    if (error) {
        console.error('Error fetching mineral estimates:', error);
        return [];
    }

    return data || [];
}

// =============================================================================
// MINE PRODUCTION
// =============================================================================

export async function getProjectProduction(projectId: number, quarters: number = 8) {
    const { data, error } = await supabase
        .from('mine_production')
        .select('*')
        .eq('project_id', projectId)
        .order('period_end', { ascending: false })
        .limit(quarters);

    if (error) {
        console.error('Error fetching production:', error);
        return [];
    }

    return data || [];
}

export async function getCompanyProduction(companyId: number, quarters: number = 8) {
    const { data, error } = await supabase
        .from('mine_production')
        .select(`
            *,
            projects!inner(name, company_id)
        `)
        .eq('projects.company_id', companyId)
        .order('period_end', { ascending: false })
        .limit(quarters * 10);

    if (error) {
        console.error('Error fetching company production:', error);
        return [];
    }

    return (data || []).map(mp => ({
        ...mp,
        project_name: mp.projects?.name
    }));
}

// =============================================================================
// RESERVES & RESOURCES
// =============================================================================

export async function getProjectReserves(projectId: number) {
    const { data, error } = await supabase
        .from('reserves_resources')
        .select('*')
        .eq('project_id', projectId)
        .order('category')
        .order('report_date', { ascending: false });

    if (error) {
        console.error('Error fetching reserves:', error);
        return [];
    }

    return data || [];
}

export async function getLatestReserves(projectId: number) {
    // Get latest report date
    const { data: latestData } = await supabase
        .from('reserves_resources')
        .select('report_date')
        .eq('project_id', projectId)
        .order('report_date', { ascending: false })
        .limit(1)
        .single();

    if (!latestData?.report_date) return null;

    const { data } = await supabase
        .from('reserves_resources')
        .select('category, is_reserve, tonnes, grade, grade_unit, contained_metal, contained_metal_unit')
        .eq('project_id', projectId)
        .eq('report_date', latestData.report_date);

    return {
        report_date: latestData.report_date,
        classifications: data || []
    };
}

// =============================================================================
// PROJECT ECONOMICS
// =============================================================================

export async function getProjectEconomics(projectId: number) {
    const { data, error } = await supabase
        .from('project_economics')
        .select('*')
        .eq('project_id', projectId)
        .order('study_date', { ascending: false });

    if (error) {
        console.error('Error fetching economics:', error);
        return [];
    }

    return data || [];
}

export async function getLatestEconomics(projectId: number) {
    const economics = await getProjectEconomics(projectId);
    return economics.length > 0 ? economics[0] : null;
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

export async function getInsiderTransactions(companyId: number, limit: number = 20): Promise<InsiderTransaction[]> {
    const { data, error } = await supabase
        .from('insider_transactions')
        .select('*')
        .eq('company_id', companyId)
        .order('transaction_date', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching insider transactions:', error);
        return [];
    }

    return (data || []) as InsiderTransaction[];
}

export async function getInsiderSummary(companyId: number, days: number = 90): Promise<InsiderSummary> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await supabase
        .from('insider_transactions')
        .select('transaction_type, shares, total_value')
        .eq('company_id', companyId)
        .gte('transaction_date', cutoffDate.toISOString().split('T')[0]);

    if (error || !data) {
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

    const buyTypes = ['Buy', 'Purchase', 'Acquisition'];
    const sellTypes = ['Sell', 'Sale', 'Disposition'];

    let buyCount = 0, sellCount = 0, totalBought = 0, totalSold = 0, valueBought = 0, valueSold = 0;

    for (const txn of data) {
        if (buyTypes.includes(txn.transaction_type)) {
            buyCount++;
            totalBought += txn.shares || 0;
            valueBought += txn.total_value || 0;
        } else if (sellTypes.includes(txn.transaction_type)) {
            sellCount++;
            totalSold += txn.shares || 0;
            valueSold += txn.total_value || 0;
        }
    }

    const netShares = totalBought - totalSold;
    const netValue = valueBought - valueSold;

    return {
        net_shares: netShares,
        net_value: netValue,
        buy_count: buyCount,
        sell_count: sellCount,
        total_bought: totalBought,
        total_sold: totalSold,
        value_bought: valueBought,
        value_sold: valueSold,
        sentiment: netShares > 0 ? 'bullish' : (netShares < 0 ? 'bearish' : 'neutral'),
        period_days: days
    };
}

// =============================================================================
// DASHBOARD STATS
// =============================================================================

export async function getDashboardStats() {
    const [
        { count: totalCompanies },
        { data: marketCapData },
        { count: totalProjects },
        { count: totalNews }
    ] = await Promise.all([
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('companies').select('market_cap'),
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('news').select('*', { count: 'exact', head: true })
    ]);

    const totalMarketCap = (marketCapData || []).reduce(
        (sum, c) => sum + (c.market_cap || 0), 0
    );

    return {
        totalCompanies: totalCompanies || 0,
        totalMarketCap,
        totalProjects: totalProjects || 0,
        totalNews: totalNews || 0
    };
}

// =============================================================================
// REPORTS
// =============================================================================

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

export async function getReports(ticker?: string): Promise<Report[]> {
    let query = supabase.from('reports').select('*');

    if (ticker) {
        query = query.eq('ticker', ticker.toUpperCase());
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching reports:', error);
        return [];
    }

    return (data || []) as Report[];
}

export async function getReportById(id: number): Promise<Report | undefined> {
    const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return undefined;
    return data as Report;
}

export async function createReport(data: ReportInput): Promise<Report> {
    const { data: result, error } = await supabase
        .from('reports')
        .insert({
            title: data.title,
            ticker: data.ticker?.toUpperCase() || null,
            filename: data.filename,
            file_path: data.file_path,
            file_size: data.file_size || null
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to create report: ${error.message}`);
    }

    return result as Report;
}

export async function deleteReport(id: number): Promise<boolean> {
    const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', id);

    return !error;
}

// =============================================================================
// NI 43-101 RESERVES & ECONOMICS (Company-Level Aggregation)
// =============================================================================

export interface CompanyReserveSummary {
    category: string;
    is_reserve: number;
    total_tonnes: number | null;
    avg_grade: number | null;
    grade_unit: string | null;
    total_contained: number | null;
    contained_unit: string | null;
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
    sustaining_capex_million: number | null;
    aisc_per_oz: number | null;
    mine_life_years: number | null;
    gold_price_assumption: number | null;
}

/**
 * Get aggregated reserves/resources for a company across all projects
 */
export async function getCompanyReserves(companyId: number): Promise<CompanyReserveSummary[]> {
    // First get all projects for this company
    const { data: projects, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('company_id', companyId);

    if (projectError || !projects || projects.length === 0) {
        return [];
    }

    const projectIds = projects.map(p => p.id);

    // Get reserves/resources for all projects
    const { data, error } = await supabase
        .from('reserves_resources')
        .select('*')
        .in('project_id', projectIds)
        .order('category');

    if (error || !data) {
        console.error('Error fetching company reserves:', error);
        return [];
    }

    // Aggregate by category and is_reserve
    const aggregated: { [key: string]: CompanyReserveSummary } = {};

    for (const row of data) {
        const key = `${row.category}-${row.is_reserve ? 1 : 0}`;
        if (!aggregated[key]) {
            aggregated[key] = {
                category: row.category,
                is_reserve: row.is_reserve ? 1 : 0,
                total_tonnes: 0,
                avg_grade: null,
                grade_unit: row.grade_unit,
                total_contained: 0,
                contained_unit: row.contained_metal_unit,
                latest_report_date: row.report_date
            };
        }

        aggregated[key].total_tonnes = (aggregated[key].total_tonnes || 0) + (row.tonnes || 0);
        aggregated[key].total_contained = (aggregated[key].total_contained || 0) + (row.contained_metal || 0);

        // Track latest report date
        if (row.report_date && (!aggregated[key].latest_report_date ||
            row.report_date > aggregated[key].latest_report_date)) {
            aggregated[key].latest_report_date = row.report_date;
        }

        // Calculate weighted average grade if we have tonnage
        if (row.grade && row.tonnes) {
            const currentWeightedGrade = (aggregated[key].avg_grade || 0) *
                ((aggregated[key].total_tonnes || 0) - (row.tonnes || 0));
            const newWeightedGrade = row.grade * row.tonnes;
            aggregated[key].avg_grade = (currentWeightedGrade + newWeightedGrade) /
                (aggregated[key].total_tonnes || 1);
        }
    }

    return Object.values(aggregated);
}

/**
 * Get economics summaries for all projects of a company
 */
export async function getCompanyEconomics(companyId: number): Promise<CompanyEconomicsSummary[]> {
    const { data, error } = await supabase
        .from('project_economics')
        .select(`
            *,
            projects!inner(name, company_id)
        `)
        .eq('projects.company_id', companyId)
        .order('study_date', { ascending: false });

    if (error || !data) {
        console.error('Error fetching company economics:', error);
        return [];
    }

    return data.map(row => ({
        project_id: row.project_id,
        project_name: row.projects?.name || 'Unknown Project',
        study_type: row.study_type,
        study_date: row.study_date,
        npv_million: row.npv_million,
        npv_discount_rate: row.npv_discount_rate,
        irr_percent: row.irr_percent,
        payback_years: row.payback_years,
        initial_capex_million: row.initial_capex_million,
        sustaining_capex_million: row.sustaining_capex_million,
        aisc_per_oz: row.aisc_per_oz,
        mine_life_years: row.mine_life_years,
        gold_price_assumption: row.gold_price_assumption
    }));
}

/**
 * Get combined NI 43-101 summary for a company
 */
export async function getCompanyNI43101Summary(companyId: number) {
    const [reserves, economics] = await Promise.all([
        getCompanyReserves(companyId),
        getCompanyEconomics(companyId)
    ]);

    return {
        reserves,
        economics,
        hasData: reserves.length > 0 || economics.length > 0
    };
}

// =============================================================================
// METRICS (Project-level extracted metrics)
// =============================================================================

export async function getMetrics(projectId: number) {
    return getProjectMetrics(projectId);
}

// =============================================================================
// LEGACY COMPATIBILITY - Sync wrappers for gradual migration
// =============================================================================

/**
 * For components that haven't been converted to async yet,
 * these wrappers throw errors to help identify what needs updating.
 *
 * During migration, you can use these patterns:
 *
 * 1. For Server Components (recommended):
 *    const company = await getCompany('AEM');
 *
 * 2. For Client Components:
 *    Use React Query or SWR for data fetching
 */

// Export the Supabase client for direct use if needed
export { supabase as db };
