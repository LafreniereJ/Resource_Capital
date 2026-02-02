import { getCompanyByTicker, getAllProjects, getProjectMetrics, getPriceHistory, getFinancials, getInsiderTransactions, getInsiderSummary, getCompanyReserves, getCompanyEconomics, getPeerCompanies, getMetalPriceHistory } from '@/lib/db';
import { PriceChart } from '@/components/PriceChart';
import NI43101Section from '@/components/NI43101Section';
import PeerComparison from '@/components/PeerComparison';
import CommodityCorrelation from '@/components/CommodityCorrelation';
import Link from 'next/link';
import { generateCompanyMetadata } from '@/lib/metadata';
import { Clock, Info } from 'lucide-react';
import { DataSourceFooter } from '@/components/ui/DataSource';
import { DataQualityBadge } from '@/components/ui/DataQuality';
import { calculateCompleteness, REQUIRED_FIELDS } from '@/lib/data-quality';
import { BackgroundEffects } from '@/components/ui/BackgroundEffects';

// Map company commodity to relevant metal for correlation
const COMMODITY_TO_METAL: Record<string, { commodity: string; name: string }> = {
    'Gold': { commodity: 'gold', name: 'Gold' },
    'Silver': { commodity: 'silver', name: 'Silver' },
    'Copper': { commodity: 'copper', name: 'Copper' },
    'Precious Metals': { commodity: 'gold', name: 'Gold' },
    'Base Metals': { commodity: 'copper', name: 'Copper' },
    'Uranium': { commodity: 'uranium', name: 'Uranium' },
    'Lithium': { commodity: 'lithium', name: 'Lithium' },
    'Nickel': { commodity: 'nickel', name: 'Nickel' },
    'Platinum': { commodity: 'platinum', name: 'Platinum' },
    'Palladium': { commodity: 'palladium', name: 'Palladium' },
};

interface CompanyPageProps {
    params: Promise<{ ticker: string }>;
}

export async function generateMetadata({ params }: CompanyPageProps) {
    const { ticker } = await params;
    const company = await getCompanyByTicker(ticker.toUpperCase()) as { name: string; ticker: string; commodity?: string } | null;

    if (!company) {
        return { title: 'Company Not Found | Resource Capital' };
    }

    return generateCompanyMetadata(company.ticker, company.name, company.commodity);
}

export default async function CompanyPage({ params }: CompanyPageProps) {
    const { ticker } = await params;
    const company = await getCompanyByTicker(ticker.toUpperCase()) as any;

    if (!company) {
        return (
            <div className="min-h-screen bg-[var(--color-bg-base)] flex flex-col items-center justify-center text-gray-400">
                <h1 className="text-2xl font-bold text-white mb-2">Company Not Found</h1>
                <p>Could not find ticker: {ticker}</p>
                <Link href="/stocks" className="mt-4 text-[var(--color-accent)] hover:underline">Return to Screener</Link>
            </div>
        );
    }

    const projects = await getAllProjects(company.id) as any[];
    const primaryProject = projects[0];
    const metrics = primaryProject ? await getProjectMetrics(primaryProject.id) as any[] : [];
    const financials = await getFinancials(company.id, 8) as any[];

    // Insider transactions data
    const insiderTransactions = await getInsiderTransactions(company.id, 10);
    const insiderSummary = await getInsiderSummary(company.id, 90);

    // NI 43-101 data (reserves, resources, economics)
    const companyReserves = await getCompanyReserves(company.id);
    const companyEconomics = await getCompanyEconomics(company.id);

    // Peer companies (same commodity)
    const peerCompanies = await getPeerCompanies(company.commodity, company.ticker, 5);

    // Metal price history for correlation
    const metalMapping = COMMODITY_TO_METAL[company.commodity];
    const metalPriceHistory = metalMapping
        ? await getMetalPriceHistory(metalMapping.commodity, 365)
        : [];

    const priceHistoryRaw = await getPriceHistory(company.id, 365) as any[];
    const priceData = priceHistoryRaw.map(p => ({
        time: p.date.split('T')[0],
        value: p.close,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close
    }));

    const formatCurrency = (value: number | null) => {
        if (value === null || value === undefined) return '—';
        if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
        if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
        if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
        return `$${value.toFixed(2)}`;
    };

    const latestFinancial = financials[0];
    const prevFinancial = financials[1];

    const calcChange = (current: number | null, previous: number | null) => {
        if (!current || !previous || previous === 0) return null;
        return ((current - previous) / Math.abs(previous)) * 100;
    };

    const operatingMargin = latestFinancial?.revenue && latestFinancial?.operating_income
        ? (latestFinancial.operating_income / latestFinancial.revenue) * 100
        : null;

    const kpis = [
        { name: 'Revenue', value: formatCurrency(latestFinancial?.revenue), change: calcChange(latestFinancial?.revenue, prevFinancial?.revenue) },
        { name: 'Operating Income', value: formatCurrency(latestFinancial?.operating_income), change: calcChange(latestFinancial?.operating_income, prevFinancial?.operating_income) },
        { name: 'Op. Margin', value: operatingMargin ? `${operatingMargin.toFixed(1)}%` : '—', change: null },
        { name: 'Net Income', value: formatCurrency(latestFinancial?.net_income), change: calcChange(latestFinancial?.net_income, prevFinancial?.net_income) },
        { name: 'Free Cash Flow', value: formatCurrency(latestFinancial?.free_cash_flow), change: calcChange(latestFinancial?.free_cash_flow, prevFinancial?.free_cash_flow) },
    ];

    const miningMetrics = [
        { name: 'AISC', value: metrics.find(m => m.metric_name?.includes('AISC'))?.metric_value, unit: '$/oz' },
        { name: 'Mining Cost/Tonne', value: metrics.find(m => m.metric_name?.includes('Mining Cost') || m.metric_name?.includes('Cost per'))?.metric_value, unit: '$/t' },
        { name: 'Gold Production', value: metrics.find(m => m.metric_name?.includes('Gold') && m.metric_name?.includes('Production'))?.metric_value, unit: 'oz' },
    ].filter(m => m.value !== undefined);

    return (
        <main className="min-h-screen bg-[var(--color-bg-base)] text-gray-200 font-sans overflow-x-hidden selection:bg-[var(--color-accent-muted)]">
            {/* Premium Background Effects */}
            <BackgroundEffects />

            <div className="relative z-10 px-6 md:px-12 py-8 max-w-7xl mx-auto">
                {/* Back Link */}
                <Link href="/stocks" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[var(--color-accent)] mb-8 transition">
                    ← Back to Stock Screener
                </Link>

                {/* Company Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-10">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gradient-mid)] blur-xl opacity-30"></div>
                            <div className="relative w-16 h-16 bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gradient-mid)] rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                                {company.ticker[0]}
                            </div>
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-600">
                                {company.name}
                            </h1>
                            <div className="flex items-center gap-4 text-sm">
                                <span className="text-[var(--color-accent)] bg-[var(--color-accent-muted)] px-3 py-1 rounded-lg border border-[var(--color-accent)]/20 font-mono font-bold">
                                    {company.ticker}.{company.exchange}
                                </span>
                                <span className="text-gray-500">{company.commodity || 'Diversified Mining'}</span>
                                <DataQualityBadge percentage={calculateCompleteness(company, REQUIRED_FIELDS.company)} />
                            </div>
                        </div>
                    </div>

                    {/* Price Badge */}
                    <div className="bg-[var(--color-bg-surface)]/80 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                        <div className="flex gap-10 mb-3">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Price</p>
                                <p className="text-3xl font-mono font-bold text-white">
                                    ${company.current_price?.toFixed(2) || '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Market Cap</p>
                                <p className="text-3xl font-mono font-bold text-white">
                                    {formatCurrency(company.market_cap)}
                                </p>
                            </div>
                            <div className="hidden md:block">
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">52W Range</p>
                                <p className="text-lg font-mono">
                                    <span className="text-rose-400">${company.low_52w?.toFixed(2) || '—'}</span>
                                    <span className="text-gray-600 mx-2">—</span>
                                    <span className="text-emerald-400">${company.high_52w?.toFixed(2) || '—'}</span>
                                </p>
                            </div>
                        </div>
                        {company.last_updated && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 border-t border-white/5 pt-3">
                                <Clock className="w-3 h-3" />
                                <span>Updated: {new Date(company.last_updated).toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="mb-10">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
                        <span className="w-1 h-6 bg-[var(--color-accent)] rounded-full"></span>
                        Key Financials
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {kpis.map((kpi, idx) => (
                            <div key={idx} className="bg-[var(--color-bg-surface)]/60 border border-white/5 rounded-xl p-4 hover:border-[var(--color-accent)]/20 transition-all">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{kpi.name}</p>
                                <p className="text-xl font-bold text-white font-mono">{kpi.value}</p>
                                {kpi.change !== null && (
                                    <p className={`text-xs font-bold mt-1 ${kpi.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {kpi.change >= 0 ? '↑' : '↓'} {Math.abs(kpi.change).toFixed(1)}%
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Mining Metrics */}
                {miningMetrics.length > 0 && (
                    <div className="mb-10">
                        <h2 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
                            <span className="w-1 h-6 bg-amber-500 rounded-full"></span>
                            Mining Metrics
                        </h2>
                        <div className="grid grid-cols-3 gap-4">
                            {miningMetrics.map((metric, idx) => (
                                <div key={idx} className="bg-gradient-to-br from-amber-900/20 to-amber-900/5 border border-amber-500/20 rounded-xl p-4">
                                    <p className="text-xs font-bold text-amber-400/70 uppercase tracking-wider mb-2">{metric.name}</p>
                                    <p className="text-2xl font-bold text-white font-mono">
                                        {metric.value?.toLocaleString()}
                                        <span className="text-sm text-gray-500 ml-1">{metric.unit}</span>
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* NI 43-101 Technical Data Section */}
                <NI43101Section
                    companyId={company.id}
                    ticker={ticker}
                    reserves={companyReserves}
                    economics={companyEconomics}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Column */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Price Chart */}
                        <div className="bg-[var(--color-bg-surface)]/60 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                            <h3 className="flex items-center gap-2 font-bold text-white mb-4">
                                <span className="w-1 h-5 bg-[var(--color-gradient-mid)] rounded-full"></span>
                                Price History
                            </h3>
                            {priceData.length > 0 ? (
                                <PriceChart data={priceData} type="candlestick" />
                            ) : (
                                <div className="h-[300px] flex items-center justify-center text-gray-600">
                                    No price data available.
                                </div>
                            )}
                        </div>

                        {/* Peer Comparison */}
                        {peerCompanies.length > 0 && (
                            <PeerComparison
                                currentCompany={{
                                    ticker: company.ticker,
                                    name: company.name,
                                    commodity: company.commodity,
                                    current_price: company.current_price,
                                    day_change_percent: company.day_change_percent,
                                    market_cap: company.market_cap,
                                }}
                                peers={peerCompanies}
                            />
                        )}

                        {/* Commodity Correlation */}
                        {metalMapping && metalPriceHistory.length > 0 && priceHistoryRaw.length > 0 && (
                            <CommodityCorrelation
                                stockPrices={priceHistoryRaw.map(p => ({
                                    date: p.date,
                                    close: p.close
                                }))}
                                metalPrices={metalPriceHistory.map(p => ({
                                    date: p.date,
                                    price: p.price
                                }))}
                                stockTicker={company.ticker}
                                metalName={metalMapping.name}
                            />
                        )}

                        {/* Financial Statements */}
                        <div className="bg-[var(--color-bg-surface)]/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
                            <div className="p-6 border-b border-white/5">
                                <h3 className="flex items-center gap-2 font-bold text-white">
                                    <span className="w-1 h-5 bg-[var(--color-accent)] rounded-full"></span>
                                    Financial Statements
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    {financials.length} periods • {latestFinancial?.period_type || 'Annual'}
                                </p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-white/[0.02]">
                                        <tr className="border-b border-white/5">
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Period</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Revenue</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Operating</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Net Income</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">FCF</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {financials.map((f, idx) => (
                                            <tr key={idx} className="hover:bg-white/[0.02] transition">
                                                <td className="px-6 py-4 text-gray-400 whitespace-nowrap font-mono text-xs">
                                                    {f.period_end?.split('T')[0]}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-white">
                                                    {formatCurrency(f.revenue)}
                                                </td>
                                                <td className={`px-6 py-4 text-right font-mono ${f.operating_income >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {formatCurrency(f.operating_income)}
                                                </td>
                                                <td className={`px-6 py-4 text-right font-mono ${f.net_income >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {formatCurrency(f.net_income)}
                                                </td>
                                                <td className={`px-6 py-4 text-right font-mono ${f.free_cash_flow >= 0 ? 'text-[var(--color-accent)]' : 'text-rose-400'}`}>
                                                    {formatCurrency(f.free_cash_flow)}
                                                </td>
                                            </tr>
                                        ))}
                                        {financials.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-gray-600">
                                                    No financial data available.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Projects & Assets */}
                        <div className="bg-[var(--color-bg-surface)]/60 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-white">Projects & Assets</h3>
                                <span className="text-xs text-gray-500 font-mono">{projects.length} total</span>
                            </div>
                            {projects.length > 0 ? (
                                <div className="space-y-3">
                                    {projects.map((proj: any, idx: number) => (
                                        <Link
                                            key={proj.id}
                                            href={`/companies/${ticker}/projects/${proj.id}`}
                                            className="block p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all group"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-white font-medium group-hover:text-cyan-400 transition">{proj.name}</span>
                                                <span className="text-xs text-gray-600 group-hover:text-cyan-400">→</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                {proj.commodity && (
                                                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                        {proj.commodity}
                                                    </span>
                                                )}
                                                {proj.stage && (
                                                    <span className="px-2 py-0.5 rounded bg-[var(--color-accent-muted)] text-[var(--color-accent-light)] border border-[var(--color-accent)]/20">
                                                        {proj.stage}
                                                    </span>
                                                )}
                                            </div>
                                            {proj.location && (
                                                <p className="text-xs text-gray-600 mt-2">{proj.location}</p>
                                            )}
                                            {proj.metric_count > 0 && (
                                                <p className="text-xs text-gray-500 mt-1">{proj.metric_count} extracted metrics</p>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-600 text-sm">No project data available.</p>
                            )}
                        </div>


                        {/* Balance Sheet */}
                        {latestFinancial && (
                            <div className="bg-[var(--color-bg-surface)]/60 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                                <h3 className="font-bold text-white mb-4">Balance Sheet</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 text-sm">Total Assets</span>
                                        <span className="font-mono text-white font-bold">{formatCurrency(latestFinancial.total_assets)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 text-sm">Total Liabilities</span>
                                        <span className="font-mono text-rose-400">{formatCurrency(latestFinancial.total_liabilities)}</span>
                                    </div>
                                    <div className="border-t border-white/5 pt-3 flex justify-between items-center">
                                        <span className="text-gray-400 text-sm font-bold">Total Equity</span>
                                        <span className="font-mono text-emerald-400 font-bold">{formatCurrency(latestFinancial.total_equity)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Insider Activity */}
                        <div className={`bg-gradient-to-br ${insiderSummary.sentiment === 'bullish'
                            ? 'from-emerald-900/20 to-transparent border-emerald-500/20'
                            : insiderSummary.sentiment === 'bearish'
                                ? 'from-rose-900/20 to-transparent border-rose-500/20'
                                : 'from-gray-800/20 to-transparent border-white/10'
                            } border rounded-2xl p-6`}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className={`font-bold ${insiderSummary.sentiment === 'bullish'
                                    ? 'text-emerald-400'
                                    : insiderSummary.sentiment === 'bearish'
                                        ? 'text-rose-400'
                                        : 'text-gray-400'
                                    }`}>Insider Activity</h3>
                                <span className="text-xs text-gray-500">{insiderSummary.period_days}D</span>
                            </div>

                            {/* Summary Indicator */}
                            {(insiderSummary.buy_count > 0 || insiderSummary.sell_count > 0) ? (
                                <>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${insiderSummary.sentiment === 'bullish'
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : insiderSummary.sentiment === 'bearish'
                                                ? 'bg-rose-500/20 text-rose-400'
                                                : 'bg-gray-500/20 text-gray-400'
                                            }`}>
                                            {insiderSummary.sentiment === 'bullish' ? '↑' : insiderSummary.sentiment === 'bearish' ? '↓' : '–'}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">
                                                Net {insiderSummary.net_shares >= 0 ? 'Buying' : 'Selling'}
                                            </p>
                                            <p className={`text-lg font-bold font-mono ${insiderSummary.net_shares >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                                }`}>
                                                {insiderSummary.net_shares >= 0 ? '+' : ''}{(insiderSummary.net_shares / 1000).toFixed(0)}K shares
                                            </p>
                                        </div>
                                    </div>

                                    {/* Buy/Sell Stats */}
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
                                            <p className="text-xs text-emerald-400 font-bold mb-1">Buys</p>
                                            <p className="text-lg font-bold text-white">{insiderSummary.buy_count}</p>
                                        </div>
                                        <div className="bg-rose-500/10 rounded-lg p-3 text-center">
                                            <p className="text-xs text-rose-400 font-bold mb-1">Sells</p>
                                            <p className="text-lg font-bold text-white">{insiderSummary.sell_count}</p>
                                        </div>
                                    </div>

                                    {/* Recent Transactions */}
                                    {insiderTransactions.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs text-gray-500 uppercase font-bold">Recent</p>
                                            {insiderTransactions.slice(0, 3).map((txn: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center text-xs py-1.5 border-b border-white/5 last:border-0">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white truncate">{txn.insider_name}</p>
                                                        <p className="text-gray-600 text-[10px]">{txn.insider_role}</p>
                                                    </div>
                                                    <div className={`text-right ${txn.transaction_type === 'Buy' || txn.transaction_type === 'Purchase'
                                                        ? 'text-emerald-400'
                                                        : 'text-rose-400'
                                                        }`}>
                                                        <p className="font-mono font-bold">
                                                            {txn.transaction_type === 'Buy' || txn.transaction_type === 'Purchase' ? '+' : '-'}
                                                            {((txn.shares || 0) / 1000).toFixed(0)}K
                                                        </p>
                                                        <p className="text-gray-600 text-[10px]">
                                                            {txn.transaction_date?.split('T')[0]}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-gray-600 text-sm">No recent insider activity.</p>
                            )}
                        </div>

                        {/* Quick Stats */}
                        <div className="bg-gradient-to-br from-[var(--color-accent)]/20 to-transparent border border-[var(--color-accent)]/20 rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-[var(--color-accent-light)] mb-4">Quick Stats</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Avg Volume</span>
                                    <span className="text-white font-mono">
                                        {company.avg_volume ? (company.avg_volume / 1e6).toFixed(1) + 'M' : '—'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Currency</span>
                                    <span className="text-white">{company.currency || 'CAD'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Exchange</span>
                                    <span className="text-white">{company.exchange}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data Source Attribution */}
                <DataSourceFooter
                    sources={['yfinance', 'sedar', 'internal']}
                    className="mt-12 mb-8"
                />
            </div>
        </main>
    );
}
