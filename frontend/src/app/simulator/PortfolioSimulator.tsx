'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
    Calculator, TrendingUp, TrendingDown, DollarSign, Calendar,
    Search, X, Plus, Trash2, PieChart, BarChart3, ArrowRight,
    Sparkles, Info, RefreshCw
} from 'lucide-react';
import { createChart, ColorType, LineData, Time } from 'lightweight-charts';

interface Stock {
    id: number;
    ticker: string;
    name: string;
    commodity: string;
    current_price: number;
}

interface SimulationEntry {
    id: string;
    ticker: string;
    name: string;
    investmentDate: string;
    investmentAmount: number;
    purchasePrice: number | null;
    currentPrice: number | null;
    shares: number | null;
    currentValue: number | null;
    gain: number | null;
    gainPercent: number | null;
}

export default function PortfolioSimulator() {
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [entries, setEntries] = useState<SimulationEntry[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);

    // Fetch available stocks
    useEffect(() => {
        async function fetchStocks() {
            try {
                const res = await fetch('/api/stocks?limit=500');
                const data = await res.json();
                setStocks(data.stocks || []);
            } catch (error) {
                console.error('Failed to fetch stocks:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchStocks();
    }, []);

    // Filter stocks for search
    const filteredStocks = useMemo(() => {
        if (!searchQuery) return stocks.slice(0, 10);
        const query = searchQuery.toLowerCase();
        return stocks
            .filter(s =>
                s.ticker.toLowerCase().includes(query) ||
                s.name.toLowerCase().includes(query)
            )
            .slice(0, 10);
    }, [stocks, searchQuery]);

    // Add a stock to simulation
    const addStock = (stock: Stock) => {
        const newEntry: SimulationEntry = {
            id: Date.now().toString(),
            ticker: stock.ticker,
            name: stock.name,
            investmentDate: getDefaultDate(),
            investmentAmount: 10000,
            purchasePrice: null,
            currentPrice: stock.current_price,
            shares: null,
            currentValue: null,
            gain: null,
            gainPercent: null,
        };
        setEntries([...entries, newEntry]);
        setShowSearch(false);
        setSearchQuery('');
    };

    // Get default date (1 year ago)
    const getDefaultDate = () => {
        const date = new Date();
        date.setFullYear(date.getFullYear() - 1);
        return date.toISOString().split('T')[0];
    };

    // Update entry
    const updateEntry = (id: string, field: keyof SimulationEntry, value: any) => {
        setEntries(entries.map(e =>
            e.id === id ? { ...e, [field]: value } : e
        ));
    };

    // Remove entry
    const removeEntry = (id: string) => {
        setEntries(entries.filter(e => e.id !== id));
    };

    // Run simulation
    const runSimulation = async () => {
        if (entries.length === 0) return;

        setIsCalculating(true);

        try {
            const updatedEntries = await Promise.all(
                entries.map(async (entry) => {
                    try {
                        // Fetch historical price
                        const res = await fetch(
                            `/api/stocks/${entry.ticker}/price?date=${entry.investmentDate}`
                        );
                        const data = await res.json();

                        const purchasePrice = data.price || entry.currentPrice;
                        const currentPrice = entry.currentPrice || 0;
                        const shares = purchasePrice ? entry.investmentAmount / purchasePrice : 0;
                        const currentValue = shares * currentPrice;
                        const gain = currentValue - entry.investmentAmount;
                        const gainPercent = entry.investmentAmount > 0
                            ? ((currentValue - entry.investmentAmount) / entry.investmentAmount) * 100
                            : 0;

                        return {
                            ...entry,
                            purchasePrice,
                            shares,
                            currentValue,
                            gain,
                            gainPercent,
                        };
                    } catch (error) {
                        console.error(`Failed to fetch price for ${entry.ticker}:`, error);
                        return entry;
                    }
                })
            );

            setEntries(updatedEntries);
        } finally {
            setIsCalculating(false);
        }
    };

    // Calculate totals
    const totals = useMemo(() => {
        const hasResults = entries.some(e => e.currentValue !== null);
        if (!hasResults) return null;

        const totalInvested = entries.reduce((sum, e) => sum + e.investmentAmount, 0);
        const totalValue = entries.reduce((sum, e) => sum + (e.currentValue || 0), 0);
        const totalGain = totalValue - totalInvested;
        const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

        return { totalInvested, totalValue, totalGain, totalGainPercent };
    }, [entries]);

    const formatCurrency = (value: number | null) => {
        if (value === null) return '—';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'CAD',
            minimumFractionDigits: 2,
        }).format(value);
    };

    const formatPercent = (value: number | null) => {
        if (value === null) return '—';
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}%`;
    };

    return (
        <div className="min-h-screen bg-[var(--color-bg-base)] text-gray-200 font-sans overflow-x-hidden selection:bg-[var(--color-accent-muted)]">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/5 blur-[120px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-600/5 blur-[120px]"></div>
            </div>

            <div className="relative z-10 px-6 md:px-12 py-8 max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 flex items-center justify-center">
                            <Calculator className="w-7 h-7 text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-600">
                                Portfolio Simulator
                            </h1>
                            <p className="text-gray-500">
                                What if you had invested in the past?
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3">
                        <Info size={16} className="text-purple-400" />
                        <span>
                            Select stocks, choose your investment dates and amounts, then run the simulation to see hypothetical returns.
                        </span>
                    </div>
                </motion.div>

                {/* Add Stock Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-6"
                >
                    <div className="relative">
                        {!showSearch ? (
                            <button
                                onClick={() => setShowSearch(true)}
                                className="w-full p-4 border-2 border-dashed border-white/10 rounded-2xl hover:border-cyan-500/30 hover:bg-cyan-500/5 transition flex items-center justify-center gap-2 text-gray-500 hover:text-cyan-400"
                            >
                                <Plus size={20} />
                                Add Stock to Simulate
                            </button>
                        ) : (
                            <div className="bg-[var(--color-bg-surface)]/80 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                                <div className="flex items-center gap-3 mb-3">
                                    <Search size={18} className="text-gray-600" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by ticker or company name..."
                                        className="flex-1 bg-transparent text-white placeholder-gray-600 focus:outline-none"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => {
                                            setShowSearch(false);
                                            setSearchQuery('');
                                        }}
                                        className="p-1 hover:bg-white/5 rounded-lg transition"
                                    >
                                        <X size={18} className="text-gray-500" />
                                    </button>
                                </div>

                                <div className="space-y-1 max-h-64 overflow-y-auto">
                                    {filteredStocks.map((stock) => (
                                        <button
                                            key={stock.id}
                                            onClick={() => addStock(stock)}
                                            className="w-full p-3 rounded-xl hover:bg-white/5 transition flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-cyan-400 font-mono font-bold">
                                                    {stock.ticker}
                                                </span>
                                                <span className="text-gray-400 truncate">
                                                    {stock.name}
                                                </span>
                                            </div>
                                            <span className="text-gray-600 group-hover:text-cyan-400">
                                                <Plus size={16} />
                                            </span>
                                        </button>
                                    ))}
                                    {filteredStocks.length === 0 && (
                                        <p className="text-center text-gray-600 py-4">
                                            No stocks found
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Entries */}
                <AnimatePresence>
                    {entries.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-4 mb-6"
                        >
                            {entries.map((entry, index) => (
                                <motion.div
                                    key={entry.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-[var(--color-bg-surface)]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-sm"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                                <span className="text-cyan-400 font-mono font-bold text-sm">
                                                    {entry.ticker[0]}
                                                </span>
                                            </div>
                                            <div>
                                                <Link
                                                    href={`/companies/${entry.ticker}`}
                                                    className="text-white font-medium hover:text-cyan-400 transition"
                                                >
                                                    {entry.ticker}
                                                </Link>
                                                <p className="text-sm text-gray-500 truncate max-w-xs">
                                                    {entry.name}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeEntry(entry.id)}
                                            className="p-2 text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        {/* Investment Date */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                                Investment Date
                                            </label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                                                <input
                                                    type="date"
                                                    value={entry.investmentDate}
                                                    onChange={(e) => updateEntry(entry.id, 'investmentDate', e.target.value)}
                                                    max={new Date().toISOString().split('T')[0]}
                                                    className="w-full bg-white/5 border border-white/10 text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-cyan-500/50 transition"
                                                />
                                            </div>
                                        </div>

                                        {/* Investment Amount */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                                Investment Amount (CAD)
                                            </label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                                                <input
                                                    type="number"
                                                    value={entry.investmentAmount}
                                                    onChange={(e) => updateEntry(entry.id, 'investmentAmount', parseFloat(e.target.value) || 0)}
                                                    min={0}
                                                    step={1000}
                                                    className="w-full bg-white/5 border border-white/10 text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-cyan-500/50 transition font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Results */}
                                    {entry.currentValue !== null && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-white/5"
                                        >
                                            <div className="bg-white/5 rounded-xl p-3">
                                                <p className="text-xs text-gray-500 mb-1">Purchase Price</p>
                                                <p className="text-lg font-mono text-white">
                                                    {formatCurrency(entry.purchasePrice)}
                                                </p>
                                            </div>
                                            <div className="bg-white/5 rounded-xl p-3">
                                                <p className="text-xs text-gray-500 mb-1">Shares</p>
                                                <p className="text-lg font-mono text-white">
                                                    {entry.shares?.toFixed(2) || '—'}
                                                </p>
                                            </div>
                                            <div className="bg-white/5 rounded-xl p-3">
                                                <p className="text-xs text-gray-500 mb-1">Current Value</p>
                                                <p className="text-lg font-mono text-white">
                                                    {formatCurrency(entry.currentValue)}
                                                </p>
                                            </div>
                                            <div className={`rounded-xl p-3 ${(entry.gain || 0) >= 0
                                                ? 'bg-emerald-500/10 border border-emerald-500/20'
                                                : 'bg-rose-500/10 border border-rose-500/20'
                                                }`}>
                                                <p className="text-xs text-gray-500 mb-1">Return</p>
                                                <p className={`text-lg font-mono font-bold ${(entry.gain || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                                    }`}>
                                                    {formatPercent(entry.gainPercent)}
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Run Simulation Button */}
                {entries.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mb-8"
                    >
                        <button
                            onClick={runSimulation}
                            disabled={isCalculating}
                            className="w-full py-4 px-6 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold rounded-2xl hover:from-purple-400 hover:to-cyan-400 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {isCalculating ? (
                                <>
                                    <RefreshCw size={20} className="animate-spin" />
                                    Calculating...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={20} />
                                    Run Simulation
                                </>
                            )}
                        </button>
                    </motion.div>
                )}

                {/* Portfolio Summary */}
                {totals && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-purple-900/30 to-cyan-900/20 border border-purple-500/20 rounded-2xl p-6 mb-8"
                    >
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <PieChart size={20} className="text-purple-400" />
                            Portfolio Summary
                        </h2>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Invested</p>
                                <p className="text-2xl font-mono font-bold text-white">
                                    {formatCurrency(totals.totalInvested)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current Value</p>
                                <p className="text-2xl font-mono font-bold text-white">
                                    {formatCurrency(totals.totalValue)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Gain/Loss</p>
                                <p className={`text-2xl font-mono font-bold ${totals.totalGain >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}>
                                    {formatCurrency(totals.totalGain)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Return</p>
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg ${totals.totalGainPercent >= 0
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-rose-500/20 text-rose-400'
                                    }`}>
                                    {totals.totalGainPercent >= 0 ? (
                                        <TrendingUp size={18} />
                                    ) : (
                                        <TrendingDown size={18} />
                                    )}
                                    <span className="text-2xl font-mono font-bold">
                                        {formatPercent(totals.totalGainPercent)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Empty State */}
                {entries.length === 0 && !showSearch && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-16"
                    >
                        <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                            <BarChart3 size={32} className="text-gray-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-300 mb-2">
                            Start Your Simulation
                        </h3>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                            Add stocks to your hypothetical portfolio and see how they would have performed over time.
                        </p>
                        <button
                            onClick={() => setShowSearch(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500/20 text-cyan-400 font-medium rounded-xl hover:bg-cyan-500/30 transition"
                        >
                            <Plus size={18} />
                            Add Your First Stock
                        </button>
                    </motion.div>
                )}

                {/* Disclaimer */}
                <div className="text-center text-xs text-gray-600 mt-8">
                    <p>
                        This is a simulation tool for educational purposes only.
                        Past performance does not guarantee future results.
                        Not financial advice.
                    </p>
                </div>
            </div>
        </div>
    );
}
