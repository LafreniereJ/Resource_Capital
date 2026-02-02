'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
    TrendingUp, TrendingDown, Search, ChevronUp, ChevronDown,
    Building2, DollarSign, BarChart3, ArrowUpRight, Gem, Sparkles,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { MobileStockList } from '@/components/ui/MobileStockCard';
import { EmptySearch } from '@/components/ui/EmptyState';
import { DataFreshness } from '@/components/ui/LastUpdated';
import { DataSourceBadge } from '@/components/ui/DataSource';
import { BackgroundEffects } from '@/components/ui/BackgroundEffects';

interface Stock {
    id: number;
    ticker: string;
    name: string;
    exchange: string;
    commodity: string;
    current_price: number | null;
    prev_close: number | null;
    day_change: number | null;
    day_change_percent: number | null;
    market_cap: number | null;
    high_52w: number | null;
    low_52w: number | null;
    avg_volume: number | null;
    currency: string;
    last_updated: string | null;
    project_count: number;
}

interface StocksClientProps {
    initialStocks: Stock[];
    stats: {
        totalCompanies: number;
        totalMarketCap: number;
        totalProjects: number;
        totalNews: number;
    };
}

const COMMODITIES = [
    { id: 'all', name: 'All Assets', color: 'from-slate-500 to-slate-600' },
    { id: 'gold', name: 'Gold', color: 'from-yellow-500 to-amber-600' },
    { id: 'copper', name: 'Copper', color: 'from-orange-500 to-red-600' },
    { id: 'lithium', name: 'Lithium', color: 'from-cyan-400 to-blue-500' },
    { id: 'nickel', name: 'Nickel', color: 'from-emerald-500 to-green-600' },
    { id: 'uranium', name: 'Uranium', color: 'from-lime-400 to-green-500' },
    { id: 'silver', name: 'Silver', color: 'from-slate-300 to-slate-500' },
];

type SortColumn = 'ticker' | 'name' | 'current_price' | 'day_change_percent' | 'market_cap' | 'commodity';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 25;

export default function StocksClient({ initialStocks, stats }: StocksClientProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCommodity, setSelectedCommodity] = useState('all');
    const [sortColumn, setSortColumn] = useState<SortColumn>('market_cap');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [currentPage, setCurrentPage] = useState(1);

    const filteredStocks = useMemo(() => {
        let result = [...initialStocks];

        if (selectedCommodity !== 'all') {
            result = result.filter(s =>
                s.commodity?.toLowerCase().includes(selectedCommodity.toLowerCase())
            );
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(s =>
                s.ticker.toLowerCase().includes(query) ||
                s.name.toLowerCase().includes(query)
            );
        }

        result.sort((a, b) => {
            let aVal = a[sortColumn];
            let bVal = b[sortColumn];

            if (aVal === null) return sortOrder === 'asc' ? 1 : -1;
            if (bVal === null) return sortOrder === 'asc' ? -1 : 1;

            if (typeof aVal === 'string') {
                return sortOrder === 'asc'
                    ? aVal.localeCompare(bVal as string)
                    : (bVal as string).localeCompare(aVal);
            }

            return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
        });

        return result;
    }, [initialStocks, searchQuery, selectedCommodity, sortColumn, sortOrder]);

    // Reset to page 1 when filters change
    const totalPages = Math.ceil(filteredStocks.length / ITEMS_PER_PAGE);
    const paginatedStocks = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredStocks.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredStocks, currentPage]);

    // Reset page when filters change
    const handleFilterChange = (setter: (val: string) => void, value: string) => {
        setter(value);
        setCurrentPage(1);
    };

    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortOrder('desc');
        }
    };

    // Get the most recent update timestamp from all stocks
    const mostRecentUpdate = useMemo(() => {
        const timestamps = initialStocks
            .map(s => s.last_updated)
            .filter((t): t is string => t !== null)
            .map(t => new Date(t).getTime());

        if (timestamps.length === 0) return null;
        return new Date(Math.max(...timestamps)).toISOString();
    }, [initialStocks]);

    const formatNumber = (num: number | null, type: 'currency' | 'number' | 'compact' = 'number') => {
        if (num === null || num === undefined) return '—';
        if (type === 'compact') {
            if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
            if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
            if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
            return `$${num.toLocaleString()}`;
        }
        return num.toLocaleString();
    };

    const SortIcon = ({ column }: { column: SortColumn }) => {
        if (sortColumn !== column) return null;
        return sortOrder === 'asc'
            ? <ChevronUp size={14} className="inline ml-1" />
            : <ChevronDown size={14} className="inline ml-1" />;
    };

    return (
        <div className="min-h-screen bg-[var(--color-bg-base)] text-gray-200 font-sans overflow-x-hidden selection:bg-[var(--color-accent-muted)]">
            {/* Premium Background Effects */}
            <BackgroundEffects />

            {/* Content */}
            <div className="relative z-10 px-6 max-w-[1800px] mx-auto py-8">
                {/* Hero Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <div className="inline-flex items-center gap-3 mb-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                                    <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse"></span>
                                    <span className="text-xs font-medium text-cyan-300 uppercase tracking-widest">Live Data</span>
                                </div>
                                {mostRecentUpdate && (
                                    <DataFreshness
                                        timestamp={mostRecentUpdate}
                                        staleAfterMinutes={15}
                                        oldAfterMinutes={60}
                                    />
                                )}
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-3 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-600">
                                Stock Screener
                            </h1>
                            <p className="text-gray-500 max-w-lg">
                                Scan {stats.totalCompanies} mining assets across TSX & TSXV. Real-time prices, fundamentals, and AI-powered insights.
                            </p>
                        </div>

                        {/* Search Bar */}
                        <div className="w-full md:w-96 relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-[var(--color-accent)]/20 to-[var(--color-gradient-mid)]/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                                    placeholder="Search ticker or company..."
                                    className="w-full bg-[var(--color-bg-surface)] border border-white/10 text-white pl-12 pr-4 py-3.5 rounded-xl focus:outline-none focus:border-[var(--color-accent)]/50 transition placeholder:text-gray-600 font-mono text-sm"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <span className="text-xs text-gray-600 border border-gray-800 rounded px-1.5 py-0.5 font-mono">⌘K</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Row */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
                >
                    {[
                        { label: 'Total Assets', value: stats.totalCompanies, icon: Building2, color: 'cyan' },
                        { label: 'Market Cap', value: formatNumber(stats.totalMarketCap, 'compact'), icon: DollarSign, color: 'blue' },
                        { label: 'Mining Projects', value: stats.totalProjects, icon: Gem, color: 'purple' },
                        { label: 'In View', value: filteredStocks.length, icon: BarChart3, color: 'emerald' },
                    ].map((stat, idx) => (
                        <div key={idx} className="relative group">
                            <div className={`absolute inset-0 bg-${stat.color}-500/5 rounded-2xl blur-xl group-hover:bg-${stat.color}-500/10 transition-all duration-500`}></div>
                            <div className="relative bg-[var(--color-bg-surface)]/60 border border-white/5 rounded-2xl p-5 backdrop-blur-sm hover:border-white/10 transition-all">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-2 rounded-lg bg-${stat.color}-500/10`}>
                                        <stat.icon size={18} className={`text-${stat.color}-400`} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{stat.label}</span>
                                </div>
                                <p className="text-2xl font-bold text-white font-mono">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </motion.div>

                {/* Commodity Filters */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide"
                >
                    {COMMODITIES.map((commodity) => (
                        <button
                            key={commodity.id}
                            onClick={() => handleFilterChange(setSelectedCommodity, commodity.id)}
                            className={`relative px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${selectedCommodity === commodity.id
                                ? 'text-white'
                                : 'text-gray-500 hover:text-gray-300 bg-white/[0.02] hover:bg-white/5 border border-white/5'
                                }`}
                        >
                            {selectedCommodity === commodity.id && (
                                <motion.div
                                    layoutId="commodityPill"
                                    className={`absolute inset-0 bg-gradient-to-r ${commodity.color} rounded-xl`}
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative z-10">{commodity.name}</span>
                        </button>
                    ))}
                </motion.div>

                {/* Mobile Card View */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="md:hidden"
                >
                    <MobileStockList stocks={paginatedStocks} />

                    {/* Mobile Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-4 p-4 bg-[var(--color-bg-surface)]/60 border border-white/10 rounded-xl">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">
                                    {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredStocks.length)} of {filteredStocks.length}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg text-gray-500 hover:text-white bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <span className="text-sm font-mono text-gray-400 min-w-[60px] text-center">
                                        {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg text-gray-500 hover:text-white bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Desktop Data Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="hidden md:block bg-[var(--color-bg-surface)]/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm shadow-2xl"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th onClick={() => handleSort('ticker')} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-white transition">
                                        Ticker <SortIcon column="ticker" />
                                    </th>
                                    <th onClick={() => handleSort('name')} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-white transition">
                                        Company <SortIcon column="name" />
                                    </th>
                                    <th onClick={() => handleSort('commodity')} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-white transition">
                                        Commodity <SortIcon column="commodity" />
                                    </th>
                                    <th onClick={() => handleSort('current_price')} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right cursor-pointer hover:text-white transition">
                                        Price <SortIcon column="current_price" />
                                    </th>
                                    <th onClick={() => handleSort('day_change_percent')} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right cursor-pointer hover:text-white transition">
                                        Change <SortIcon column="day_change_percent" />
                                    </th>
                                    <th onClick={() => handleSort('market_cap')} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right cursor-pointer hover:text-white transition">
                                        Market Cap <SortIcon column="market_cap" />
                                    </th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">52W Range</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {paginatedStocks.map((stock, idx) => (
                                    <motion.tr
                                        key={stock.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.02 }}
                                        className="group hover:bg-white/[0.03] transition-colors"
                                    >
                                        <td className="p-4">
                                            <Link href={`/companies/${stock.ticker}`} className="font-mono font-bold text-[var(--color-accent)] group-hover:text-[var(--color-accent-light)] transition">
                                                {stock.ticker}
                                            </Link>
                                        </td>
                                        <td className="p-4">
                                            <Link href={`/companies/${stock.ticker}`} className="text-gray-300 font-medium hover:text-white transition">
                                                <div className="max-w-[200px] truncate">{stock.name}</div>
                                            </Link>
                                            <div className="text-xs text-gray-600">{stock.exchange}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-800/50 text-gray-400 border border-gray-700/50">
                                                {stock.commodity || 'Diversified'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-mono">
                                            {stock.current_price ? (
                                                <span className="text-white font-semibold">${stock.current_price.toFixed(2)}</span>
                                            ) : (
                                                <span className="text-gray-600">—</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right font-mono">
                                            {stock.day_change_percent !== null && stock.day_change_percent !== undefined ? (
                                                <span className={`font-semibold ${stock.day_change_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {stock.day_change_percent >= 0 ? '+' : ''}{stock.day_change_percent.toFixed(2)}%
                                                </span>
                                            ) : (
                                                <span className="text-gray-600">—</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right font-mono text-gray-400">
                                            {formatNumber(stock.market_cap, 'compact')}
                                        </td>
                                        <td className="p-4 text-right">
                                            {stock.high_52w && stock.low_52w ? (
                                                <div className="text-xs font-mono">
                                                    <span className="text-rose-400">${stock.low_52w.toFixed(2)}</span>
                                                    <span className="text-gray-600 mx-1">—</span>
                                                    <span className="text-emerald-400">${stock.high_52w.toFixed(2)}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-600">—</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <Link
                                                href={`/companies/${stock.ticker}`}
                                                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-[var(--color-accent)] transition font-medium"
                                            >
                                                View <ArrowUpRight size={12} />
                                            </Link>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer with Pagination */}
                    <div className="p-4 border-t border-white/5 bg-white/[0.02] flex flex-col sm:flex-row justify-between items-center gap-4">
                        <span className="text-xs text-gray-600">
                            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredStocks.length)} of {filteredStocks.length} assets
                        </span>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                    title="First page"
                                >
                                    <ChevronsLeft size={16} />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                    title="Previous page"
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                {/* Page Numbers */}
                                <div className="flex items-center gap-1 mx-2">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum: number;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`w-8 h-8 rounded-lg text-xs font-medium transition ${currentPage === pageNum
                                                    ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                                                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                    title="Next page"
                                >
                                    <ChevronRight size={16} />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                    title="Last page"
                                >
                                    <ChevronsRight size={16} />
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-3 text-xs text-gray-600">
                            <DataSourceBadge source="yfinance" showDelay />
                            <span className="text-gray-700">•</span>
                            <div className="flex items-center gap-1">
                                <Sparkles size={12} className="text-[var(--color-accent)]" />
                                AI-Enhanced
                            </div>
                        </div>
                    </div>
                </motion.div>

                {filteredStocks.length === 0 && (
                    <EmptySearch
                        query={searchQuery || undefined}
                        onClear={() => {
                            setSearchQuery('');
                            setSelectedCommodity('all');
                            setCurrentPage(1);
                        }}
                    />
                )}
            </div>
        </div>
    );
}
