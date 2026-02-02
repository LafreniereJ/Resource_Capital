'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
    Search, Filter, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
    ChevronsLeft, ChevronsRight, ArrowUpRight, Download, RotateCcw,
    TrendingUp, TrendingDown, Building2, DollarSign, BarChart3, Gem,
    SlidersHorizontal, Sparkles, Save, Lock, Bookmark, ChevronDownIcon
} from 'lucide-react';
import { DataFreshness } from '@/components/ui/LastUpdated';
import { DataSourceBadge } from '@/components/ui/DataSource';
import SavedQueriesModal, { getSavedQueries, SavedQuery } from '@/components/SavedQueriesModal';
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
    day_open: number | null;
    day_high: number | null;
    day_low: number | null;
    day_volume: number | null;
    market_cap: number | null;
    high_52w: number | null;
    low_52w: number | null;
    avg_volume: number | null;
    currency: string;
    last_updated: string | null;
    project_count: number;
}

interface ScreenerClientProps {
    initialStocks: Stock[];
    stats: {
        totalCompanies: number;
        totalMarketCap: number;
        totalProjects: number;
        totalNews: number;
    };
    commodityOptions: string[];
    exchangeOptions: string[];
}

// Filter configuration
interface ScreenerFilters {
    search: string;
    commodities: string[];
    exchanges: string[];
    minPrice: string;
    maxPrice: string;
    minMarketCap: string;
    maxMarketCap: string;
    minChange: string;
    maxChange: string;
    minVolume: string;
    near52WeekHigh: boolean;
    near52WeekLow: boolean;
    hasProjects: boolean;
}

const INITIAL_FILTERS: ScreenerFilters = {
    search: '',
    commodities: [],
    exchanges: [],
    minPrice: '',
    maxPrice: '',
    minMarketCap: '',
    maxMarketCap: '',
    minChange: '',
    maxChange: '',
    minVolume: '',
    near52WeekHigh: false,
    near52WeekLow: false,
    hasProjects: false,
};

// Market cap presets
const MARKET_CAP_PRESETS = [
    { label: 'Micro (<$50M)', min: 0, max: 50000000 },
    { label: 'Small ($50M-$300M)', min: 50000000, max: 300000000 },
    { label: 'Mid ($300M-$2B)', min: 300000000, max: 2000000000 },
    { label: 'Large (>$2B)', min: 2000000000, max: Infinity },
];

// Performance presets
const PERFORMANCE_PRESETS = [
    { label: 'Gainers (>5%)', minChange: '5', maxChange: '' },
    { label: 'Losers (<-5%)', minChange: '', maxChange: '-5' },
    { label: 'Movers (±10%)', minChange: '-10', maxChange: '10', abs: true },
];

type SortColumn = 'ticker' | 'name' | 'current_price' | 'day_change_percent' | 'market_cap' | 'day_volume' | 'commodity';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 25;

export default function ScreenerClient({
    initialStocks,
    stats,
    commodityOptions,
    exchangeOptions
}: ScreenerClientProps) {
    const [filters, setFilters] = useState<ScreenerFilters>(INITIAL_FILTERS);
    const [showFilters, setShowFilters] = useState(true);
    const [sortColumn, setSortColumn] = useState<SortColumn>('market_cap');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [currentPage, setCurrentPage] = useState(1);

    // Saved queries state
    const [savedQueriesModalOpen, setSavedQueriesModalOpen] = useState(false);
    const [savedQueriesMode, setSavedQueriesMode] = useState<'save' | 'load'>('save');
    const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
    const [showSavedDropdown, setShowSavedDropdown] = useState(false);

    // Load saved queries on mount
    useEffect(() => {
        setSavedQueries(getSavedQueries());
    }, []);

    // Refresh saved queries when modal closes
    useEffect(() => {
        if (!savedQueriesModalOpen) {
            setSavedQueries(getSavedQueries());
        }
    }, [savedQueriesModalOpen]);

    const handleLoadQuery = (loadedFilters: ScreenerFilters) => {
        setFilters(loadedFilters);
        setCurrentPage(1);
    };

    // Count active filters
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.search) count++;
        if (filters.commodities.length > 0) count++;
        if (filters.exchanges.length > 0) count++;
        if (filters.minPrice || filters.maxPrice) count++;
        if (filters.minMarketCap || filters.maxMarketCap) count++;
        if (filters.minChange || filters.maxChange) count++;
        if (filters.minVolume) count++;
        if (filters.near52WeekHigh) count++;
        if (filters.near52WeekLow) count++;
        if (filters.hasProjects) count++;
        return count;
    }, [filters]);

    // Apply all filters
    const filteredStocks = useMemo(() => {
        let result = [...initialStocks];

        // Text search
        if (filters.search) {
            const query = filters.search.toLowerCase();
            result = result.filter(s =>
                s.ticker.toLowerCase().includes(query) ||
                s.name.toLowerCase().includes(query)
            );
        }

        // Commodities filter
        if (filters.commodities.length > 0) {
            result = result.filter(s =>
                filters.commodities.some(c =>
                    s.commodity?.toLowerCase().includes(c.toLowerCase())
                )
            );
        }

        // Exchanges filter
        if (filters.exchanges.length > 0) {
            result = result.filter(s =>
                filters.exchanges.includes(s.exchange)
            );
        }

        // Price range
        if (filters.minPrice) {
            const min = parseFloat(filters.minPrice);
            result = result.filter(s => s.current_price !== null && s.current_price >= min);
        }
        if (filters.maxPrice) {
            const max = parseFloat(filters.maxPrice);
            result = result.filter(s => s.current_price !== null && s.current_price <= max);
        }

        // Market cap range
        if (filters.minMarketCap) {
            const min = parseFloat(filters.minMarketCap);
            result = result.filter(s => s.market_cap !== null && s.market_cap >= min);
        }
        if (filters.maxMarketCap) {
            const max = parseFloat(filters.maxMarketCap);
            result = result.filter(s => s.market_cap !== null && s.market_cap <= max);
        }

        // Change % range
        if (filters.minChange) {
            const min = parseFloat(filters.minChange);
            result = result.filter(s => s.day_change_percent !== null && s.day_change_percent >= min);
        }
        if (filters.maxChange) {
            const max = parseFloat(filters.maxChange);
            result = result.filter(s => s.day_change_percent !== null && s.day_change_percent <= max);
        }

        // Volume filter
        if (filters.minVolume) {
            const min = parseFloat(filters.minVolume);
            result = result.filter(s => s.day_volume !== null && s.day_volume >= min);
        }

        // Near 52-week high (within 10%)
        if (filters.near52WeekHigh) {
            result = result.filter(s => {
                if (!s.current_price || !s.high_52w) return false;
                const percentFromHigh = ((s.high_52w - s.current_price) / s.high_52w) * 100;
                return percentFromHigh <= 10;
            });
        }

        // Near 52-week low (within 10%)
        if (filters.near52WeekLow) {
            result = result.filter(s => {
                if (!s.current_price || !s.low_52w) return false;
                const percentFromLow = ((s.current_price - s.low_52w) / s.low_52w) * 100;
                return percentFromLow <= 10;
            });
        }

        // Has projects
        if (filters.hasProjects) {
            result = result.filter(s => s.project_count > 0);
        }

        // Sort
        result.sort((a, b) => {
            let aVal = a[sortColumn];
            let bVal = b[sortColumn];

            if (aVal === null || aVal === undefined) return sortOrder === 'asc' ? 1 : -1;
            if (bVal === null || bVal === undefined) return sortOrder === 'asc' ? -1 : 1;

            if (typeof aVal === 'string') {
                return sortOrder === 'asc'
                    ? aVal.localeCompare(bVal as string)
                    : (bVal as string).localeCompare(aVal);
            }

            return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
        });

        return result;
    }, [initialStocks, filters, sortColumn, sortOrder]);

    // Pagination
    const totalPages = Math.ceil(filteredStocks.length / ITEMS_PER_PAGE);
    const paginatedStocks = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredStocks.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredStocks, currentPage]);

    // Handlers
    const updateFilter = useCallback(<K extends keyof ScreenerFilters>(key: K, value: ScreenerFilters[K]) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    }, []);

    const toggleArrayFilter = useCallback((key: 'commodities' | 'exchanges', value: string) => {
        setFilters(prev => {
            const arr = prev[key];
            const newArr = arr.includes(value)
                ? arr.filter(v => v !== value)
                : [...arr, value];
            return { ...prev, [key]: newArr };
        });
        setCurrentPage(1);
    }, []);

    const resetFilters = useCallback(() => {
        setFilters(INITIAL_FILTERS);
        setCurrentPage(1);
    }, []);

    const applyMarketCapPreset = useCallback((min: number, max: number) => {
        setFilters(prev => ({
            ...prev,
            minMarketCap: min.toString(),
            maxMarketCap: max === Infinity ? '' : max.toString(),
        }));
        setCurrentPage(1);
    }, []);

    const handleSort = useCallback((column: SortColumn) => {
        if (sortColumn === column) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortOrder('desc');
        }
    }, [sortColumn]);

    // Get most recent update timestamp
    const mostRecentUpdate = useMemo(() => {
        const timestamps = initialStocks
            .map(s => s.last_updated)
            .filter((t): t is string => t !== null)
            .map(t => new Date(t).getTime());
        if (timestamps.length === 0) return null;
        return new Date(Math.max(...timestamps)).toISOString();
    }, [initialStocks]);

    // Format helpers
    const formatNumber = (num: number | null, type: 'currency' | 'number' | 'compact' | 'volume' = 'number') => {
        if (num === null || num === undefined) return '—';
        if (type === 'compact') {
            if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
            if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
            if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
            return `$${num.toLocaleString()}`;
        }
        if (type === 'volume') {
            if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
            if (num >= 1e3) return `${(num / 1e3).toFixed(0)}K`;
            return num.toLocaleString();
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
            {/* Background Effects */}
            <BackgroundEffects />

            <div className="relative z-10 px-4 md:px-6 max-w-[1800px] mx-auto py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div>
                            <div className="inline-flex items-center gap-3 mb-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-[var(--color-gradient-mid)]/20 to-[var(--color-accent)]/20 border border-[var(--color-gradient-mid)]/30">
                                    <SlidersHorizontal size={14} className="text-purple-400" />
                                    <span className="text-xs font-medium text-purple-300 uppercase tracking-widest">Advanced Screener</span>
                                </div>
                                {mostRecentUpdate && (
                                    <DataFreshness
                                        timestamp={mostRecentUpdate}
                                        staleAfterMinutes={15}
                                        oldAfterMinutes={60}
                                    />
                                )}
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-600">
                                Stock Screener
                            </h1>
                            <p className="text-gray-500 text-sm md:text-base">
                                Filter {stats.totalCompanies} mining stocks with advanced criteria
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Toggle Filters Button */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${showFilters
                                    ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent-light)] border border-[var(--color-accent)]/30'
                                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                <Filter size={16} />
                                Filters
                                {activeFilterCount > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-[var(--color-accent)] text-white rounded-full">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>

                            {/* Saved Queries Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowSavedDropdown(!showSavedDropdown)}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white/5 text-gray-300 border border-white/10 hover:border-[var(--color-gradient-mid)]/50 hover:bg-[var(--color-gradient-mid)]/10 transition"
                                >
                                    <Bookmark size={16} />
                                    <span className="hidden sm:inline">Saved</span>
                                    {savedQueries.length > 0 && (
                                        <span className="px-1.5 py-0.5 text-xs bg-[var(--color-gradient-mid)]/20 text-[var(--color-gradient-mid)] rounded-full">
                                            {savedQueries.length}
                                        </span>
                                    )}
                                    <ChevronDown size={14} />
                                </button>

                                {/* Dropdown */}
                                <AnimatePresence>
                                    {showSavedDropdown && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute right-0 top-full mt-2 w-64 bg-[var(--color-bg-surface)] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                                        >
                                            {savedQueries.length === 0 ? (
                                                <div className="p-4 text-center text-gray-500 text-sm">
                                                    No saved queries yet
                                                </div>
                                            ) : (
                                                <div className="max-h-64 overflow-y-auto">
                                                    {savedQueries.slice(0, 5).map((query) => (
                                                        <button
                                                            key={query.id}
                                                            onClick={() => {
                                                                handleLoadQuery(query.filters);
                                                                setShowSavedDropdown(false);
                                                            }}
                                                            className="w-full px-4 py-3 text-left hover:bg-white/5 transition border-b border-white/5 last:border-0"
                                                        >
                                                            <p className="text-sm text-white font-medium truncate">{query.name}</p>
                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                                {query.resultCount} results
                                                            </p>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="border-t border-white/10">
                                                <button
                                                    onClick={() => {
                                                        setSavedQueriesMode('load');
                                                        setSavedQueriesModalOpen(true);
                                                        setShowSavedDropdown(false);
                                                    }}
                                                    className="w-full px-4 py-2.5 text-sm text-[var(--color-accent)] hover:bg-[var(--color-accent-muted)] transition text-center"
                                                >
                                                    Manage Saved Queries →
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Save Query Button */}
                            <button
                                onClick={() => {
                                    setSavedQueriesMode('save');
                                    setSavedQueriesModalOpen(true);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-[var(--color-accent)]/20 to-[var(--color-gradient-mid)]/20 text-[var(--color-accent)] border border-[var(--color-accent)]/30 hover:border-[var(--color-accent)]/50 hover:from-[var(--color-accent)]/30 hover:to-[var(--color-gradient-mid)]/30 transition"
                            >
                                <Save size={16} />
                                <span className="hidden sm:inline">Save Query</span>
                            </button>

                            {/* Export (Pro Feature Stub) */}
                            <button
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed"
                                title="Pro feature - Export results"
                            >
                                <Download size={16} />
                                <span className="hidden sm:inline">Export</span>
                                <Lock size={12} className="text-yellow-500" />
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Filter Panel */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-6 overflow-hidden"
                        >
                            <div className="bg-[var(--color-bg-surface)]/80 border border-white/10 rounded-2xl p-4 md:p-6 backdrop-blur-sm">
                                {/* Search */}
                                <div className="mb-6">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                        Search
                                    </label>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                                        <input
                                            type="text"
                                            value={filters.search}
                                            onChange={(e) => updateFilter('search', e.target.value)}
                                            placeholder="Search by ticker or company name..."
                                            className="w-full bg-[var(--color-bg-surface)] border border-white/10 text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-[var(--color-accent)]/50 transition placeholder:text-gray-600 font-mono text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {/* Commodities */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                            Commodities
                                        </label>
                                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                            {commodityOptions.map(commodity => (
                                                <button
                                                    key={commodity}
                                                    onClick={() => toggleArrayFilter('commodities', commodity)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filters.commodities.includes(commodity)
                                                        ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent-light)] border border-[var(--color-accent)]/30'
                                                        : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                                        }`}
                                                >
                                                    {commodity}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Exchanges */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                            Exchange
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {exchangeOptions.map(exchange => (
                                                <button
                                                    key={exchange}
                                                    onClick={() => toggleArrayFilter('exchanges', exchange)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filters.exchanges.includes(exchange)
                                                        ? 'bg-[var(--color-gradient-mid)]/20 text-[var(--color-gradient-mid)] border border-[var(--color-gradient-mid)]/30'
                                                        : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                                        }`}
                                                >
                                                    {exchange}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Market Cap */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                            Market Cap
                                        </label>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {MARKET_CAP_PRESETS.map(preset => (
                                                <button
                                                    key={preset.label}
                                                    onClick={() => applyMarketCapPreset(preset.min, preset.max)}
                                                    className="px-2 py-1 rounded text-xs font-medium bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 transition"
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                value={filters.minMarketCap}
                                                onChange={(e) => updateFilter('minMarketCap', e.target.value)}
                                                placeholder="Min"
                                                className="w-full bg-[var(--color-bg-surface)] border border-white/10 text-white px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-[var(--color-accent)]/50"
                                            />
                                            <input
                                                type="number"
                                                value={filters.maxMarketCap}
                                                onChange={(e) => updateFilter('maxMarketCap', e.target.value)}
                                                placeholder="Max"
                                                className="w-full bg-[var(--color-bg-surface)] border border-white/10 text-white px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-[var(--color-accent)]/50"
                                            />
                                        </div>
                                    </div>

                                    {/* Price Range */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                            Price Range (CAD)
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={filters.minPrice}
                                                onChange={(e) => updateFilter('minPrice', e.target.value)}
                                                placeholder="Min"
                                                className="w-full bg-[var(--color-bg-surface)] border border-white/10 text-white px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-[var(--color-accent)]/50"
                                            />
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={filters.maxPrice}
                                                onChange={(e) => updateFilter('maxPrice', e.target.value)}
                                                placeholder="Max"
                                                className="w-full bg-[var(--color-bg-surface)] border border-white/10 text-white px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-[var(--color-accent)]/50"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Second Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                                    {/* Daily Change % */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                            Daily Change %
                                        </label>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {PERFORMANCE_PRESETS.map(preset => (
                                                <button
                                                    key={preset.label}
                                                    onClick={() => {
                                                        updateFilter('minChange', preset.minChange);
                                                        updateFilter('maxChange', preset.maxChange);
                                                    }}
                                                    className="px-2 py-1 rounded text-xs font-medium bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 transition"
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={filters.minChange}
                                                onChange={(e) => updateFilter('minChange', e.target.value)}
                                                placeholder="Min %"
                                                className="w-full bg-[var(--color-bg-surface)] border border-white/10 text-white px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-[var(--color-accent)]/50"
                                            />
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={filters.maxChange}
                                                onChange={(e) => updateFilter('maxChange', e.target.value)}
                                                placeholder="Max %"
                                                className="w-full bg-[var(--color-bg-surface)] border border-white/10 text-white px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-[var(--color-accent)]/50"
                                            />
                                        </div>
                                    </div>

                                    {/* Volume */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                            Min Volume
                                        </label>
                                        <input
                                            type="number"
                                            value={filters.minVolume}
                                            onChange={(e) => updateFilter('minVolume', e.target.value)}
                                            placeholder="e.g., 100000"
                                            className="w-full bg-[var(--color-bg-surface)] border border-white/10 text-white px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-[var(--color-accent)]/50"
                                        />
                                    </div>

                                    {/* 52-Week Filters */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                            52-Week Range
                                        </label>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => updateFilter('near52WeekHigh', !filters.near52WeekHigh)}
                                                className={`px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 ${filters.near52WeekHigh
                                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                                    }`}
                                            >
                                                <TrendingUp size={14} />
                                                Near 52W High (±10%)
                                            </button>
                                            <button
                                                onClick={() => updateFilter('near52WeekLow', !filters.near52WeekLow)}
                                                className={`px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 ${filters.near52WeekLow
                                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                                    }`}
                                            >
                                                <TrendingDown size={14} />
                                                Near 52W Low (±10%)
                                            </button>
                                        </div>
                                    </div>

                                    {/* Additional Filters */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                            Additional
                                        </label>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => updateFilter('hasProjects', !filters.hasProjects)}
                                                className={`px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 ${filters.hasProjects
                                                    ? 'bg-[var(--color-gradient-mid)]/20 text-[var(--color-gradient-mid)] border border-[var(--color-gradient-mid)]/30'
                                                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                                    }`}
                                            >
                                                <Gem size={14} />
                                                Has Mining Projects
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Reset Button */}
                                {activeFilterCount > 0 && (
                                    <div className="mt-6 pt-4 border-t border-white/5">
                                        <button
                                            onClick={resetFilters}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition"
                                        >
                                            <RotateCcw size={14} />
                                            Reset All Filters
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Results Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
                >
                    {[
                        { label: 'Matches', value: filteredStocks.length, icon: BarChart3, color: 'cyan' },
                        {
                            label: 'Avg Market Cap', value: formatNumber(
                                filteredStocks.length > 0
                                    ? filteredStocks.reduce((sum, s) => sum + (s.market_cap || 0), 0) / filteredStocks.length
                                    : 0,
                                'compact'
                            ), icon: DollarSign, color: 'blue'
                        },
                        { label: 'Gainers', value: filteredStocks.filter(s => (s.day_change_percent || 0) > 0).length, icon: TrendingUp, color: 'emerald' },
                        { label: 'Losers', value: filteredStocks.filter(s => (s.day_change_percent || 0) < 0).length, icon: TrendingDown, color: 'rose' },
                    ].map((stat, idx) => (
                        <div key={idx} className="bg-[var(--color-bg-surface)]/60 border border-white/5 rounded-xl p-4 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <stat.icon size={14} className={`text-${stat.color}-400`} />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{stat.label}</span>
                            </div>
                            <p className="text-xl font-bold text-white font-mono">{stat.value}</p>
                        </div>
                    ))}
                </motion.div>

                {/* Results Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-[var(--color-bg-surface)]/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm shadow-2xl"
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
                                    <th onClick={() => handleSort('commodity')} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-white transition hidden md:table-cell">
                                        Commodity <SortIcon column="commodity" />
                                    </th>
                                    <th onClick={() => handleSort('current_price')} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right cursor-pointer hover:text-white transition">
                                        Price <SortIcon column="current_price" />
                                    </th>
                                    <th onClick={() => handleSort('day_change_percent')} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right cursor-pointer hover:text-white transition">
                                        Change <SortIcon column="day_change_percent" />
                                    </th>
                                    <th onClick={() => handleSort('day_volume')} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right cursor-pointer hover:text-white transition hidden lg:table-cell">
                                        Volume <SortIcon column="day_volume" />
                                    </th>
                                    <th onClick={() => handleSort('market_cap')} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right cursor-pointer hover:text-white transition hidden md:table-cell">
                                        Market Cap <SortIcon column="market_cap" />
                                    </th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right hidden lg:table-cell">52W Range</th>
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
                                        <td className="p-4 hidden md:table-cell">
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
                                            {stock.day_change_percent !== null ? (
                                                <span className={`font-semibold ${stock.day_change_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {stock.day_change_percent >= 0 ? '+' : ''}{stock.day_change_percent.toFixed(2)}%
                                                </span>
                                            ) : (
                                                <span className="text-gray-600">—</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right font-mono text-gray-400 hidden lg:table-cell">
                                            {formatNumber(stock.day_volume, 'volume')}
                                        </td>
                                        <td className="p-4 text-right font-mono text-gray-400 hidden md:table-cell">
                                            {formatNumber(stock.market_cap, 'compact')}
                                        </td>
                                        <td className="p-4 text-right hidden lg:table-cell">
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

                    {/* Empty State */}
                    {filteredStocks.length === 0 && (
                        <div className="p-12 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800/50 mb-4">
                                <Search size={24} className="text-gray-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-300 mb-2">No stocks match your criteria</h3>
                            <p className="text-sm text-gray-500 mb-4">Try adjusting your filters or search terms</p>
                            <button
                                onClick={resetFilters}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-accent)] bg-[var(--color-accent-muted)] hover:bg-[var(--color-accent)]/20 transition"
                            >
                                <RotateCcw size={14} />
                                Reset Filters
                            </button>
                        </div>
                    )}

                    {/* Footer with Pagination */}
                    {filteredStocks.length > 0 && (
                        <div className="p-4 border-t border-white/5 bg-white/[0.02] flex flex-col sm:flex-row justify-between items-center gap-4">
                            <span className="text-xs text-gray-600">
                                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredStocks.length)} of {filteredStocks.length} results
                            </span>

                            {totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                    >
                                        <ChevronsLeft size={16} />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>

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
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                    >
                                        <ChevronsRight size={16} />
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center gap-3 text-xs text-gray-600">
                                <DataSourceBadge source="yfinance" showDelay />
                                <span className="text-gray-700">•</span>
                                <div className="flex items-center gap-1">
                                    <Sparkles size={12} className="text-purple-400" />
                                    Advanced Filters
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Saved Queries Modal */}
            <SavedQueriesModal
                isOpen={savedQueriesModalOpen}
                onClose={() => setSavedQueriesModalOpen(false)}
                currentFilters={filters}
                resultCount={filteredStocks.length}
                onLoadQuery={handleLoadQuery}
                mode={savedQueriesMode}
            />
        </div>
    );
}
