'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Handshake, Filter, Calendar, DollarSign, Building2, TrendingUp, ExternalLink, Search } from 'lucide-react';

interface Transaction {
    id: number;
    acquirer_name: string;
    acquirer_ticker: string | null;
    target_name: string;
    target_ticker: string | null;
    transaction_type: string | null;
    deal_value_million: number | null;
    currency: string;
    announcement_date: string | null;
    completion_date: string | null;
    deal_status: string;
    asset_name: string | null;
    commodity: string | null;
    stage: string | null;
    location: string | null;
    contained_gold_moz: number | null;
    contained_copper_mlbs: number | null;
    price_per_oz: number | null;
    price_per_lb: number | null;
    source_url: string | null;
    notes: string | null;
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        commodity: '',
        stage: '',
        minValue: '',
    });

    useEffect(() => {
        async function fetchTransactions() {
            try {
                const params = new URLSearchParams();
                if (filters.commodity) params.append('commodity', filters.commodity);
                if (filters.stage) params.append('stage', filters.stage);
                if (filters.minValue) params.append('min_value', filters.minValue);

                const res = await fetch(`/api/transactions?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setTransactions(data);
                }
            } catch (error) {
                console.error('Failed to fetch transactions:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchTransactions();
    }, [filters]);

    const formatValue = (value: number | null, prefix = '$', suffix = '') => {
        if (value === null || value === undefined) return '—';
        return `${prefix}${value.toLocaleString()}${suffix}`;
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'announced': return 'bg-[var(--color-accent-muted)] text-[var(--color-accent-light)] border-[var(--color-accent)]/20';
            case 'terminated': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    };

    return (
        <main className="min-h-screen bg-[var(--color-bg-base)] text-gray-200 font-sans">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--color-accent)]/5 blur-[120px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/5 blur-[120px]"></div>
            </div>

            <div className="relative z-10 px-6 md:px-12 py-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-600 flex items-center gap-3">
                        <Handshake className="w-8 h-8 text-[var(--color-accent-light)]" />
                        M&A Tracker
                    </h1>
                    <p className="text-gray-500">Track mining sector acquisitions, mergers, and asset transactions</p>
                </div>

                {/* Filters */}
                <div className="bg-[var(--color-bg-surface)]/60 border border-white/10 rounded-2xl p-6 mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="w-4 h-4 text-[var(--color-accent)]" />
                        <h2 className="font-bold text-white">Filters</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 uppercase mb-1 block">Commodity</label>
                            <select
                                value={filters.commodity}
                                onChange={(e) => setFilters({ ...filters, commodity: e.target.value })}
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]/50"
                            >
                                <option value="">All Commodities</option>
                                <option value="Gold">Gold</option>
                                <option value="Copper">Copper</option>
                                <option value="Silver">Silver</option>
                                <option value="Nickel">Nickel</option>
                                <option value="Lithium">Lithium</option>
                                <option value="Uranium">Uranium</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase mb-1 block">Stage</label>
                            <select
                                value={filters.stage}
                                onChange={(e) => setFilters({ ...filters, stage: e.target.value })}
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]/50"
                            >
                                <option value="">All Stages</option>
                                <option value="producing">Producing</option>
                                <option value="development">Development</option>
                                <option value="exploration">Exploration</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase mb-1 block">Min Value ($M)</label>
                            <input
                                type="number"
                                value={filters.minValue}
                                onChange={(e) => setFilters({ ...filters, minValue: e.target.value })}
                                placeholder="e.g., 100"
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]/50"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => setFilters({ commodity: '', stage: '', minValue: '' })}
                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-400 hover:text-white hover:bg-white/10 transition"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Transactions List */}
                <div className="bg-[var(--color-bg-surface)]/60 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                        <h2 className="flex items-center gap-2 font-bold text-white">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            Recent Transactions
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {transactions.length} transactions
                        </p>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center text-gray-500">
                            Loading transactions...
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="p-12 text-center">
                            <Handshake className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">No Transactions Yet</h3>
                            <p className="text-gray-500 max-w-md mx-auto mb-4">
                                M&A transaction data will appear here once added to the database.
                                This feature tracks mining sector deals, acquisitions, and asset sales.
                            </p>
                            <div className="bg-[var(--color-accent-muted)] border border-[var(--color-accent)]/20 rounded-lg p-4 text-left max-w-lg mx-auto">
                                <p className="text-[var(--color-accent-light)] text-sm font-bold mb-2">Sample Transaction Data</p>
                                <p className="text-gray-400 text-xs">
                                    Transactions can be added via the API or through the data pipeline.
                                    Each transaction includes: acquirer, target, deal value, commodity,
                                    stage, implied valuations ($/oz or $/lb), and source references.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {transactions.map(tx => (
                                <div key={tx.id} className="p-6 hover:bg-white/[0.02] transition">
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                        {/* Transaction Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`px-2 py-1 rounded text-xs font-bold border ${getStatusColor(tx.deal_status)}`}>
                                                    {tx.deal_status}
                                                </span>
                                                {tx.transaction_type && (
                                                    <span className="text-xs text-gray-500 uppercase">
                                                        {tx.transaction_type}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-lg font-bold text-white mb-1">
                                                {tx.acquirer_name}
                                                {tx.acquirer_ticker && (
                                                    <span className="text-[var(--color-accent)] ml-2 text-sm font-mono">
                                                        ({tx.acquirer_ticker})
                                                    </span>
                                                )}
                                                <span className="text-gray-500 mx-2">→</span>
                                                {tx.target_name}
                                                {tx.target_ticker && (
                                                    <span className="text-[var(--color-accent)] ml-2 text-sm font-mono">
                                                        ({tx.target_ticker})
                                                    </span>
                                                )}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                                                {tx.asset_name && (
                                                    <span className="flex items-center gap-1">
                                                        <Building2 className="w-3 h-3" />
                                                        {tx.asset_name}
                                                    </span>
                                                )}
                                                {tx.commodity && (
                                                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs">
                                                        {tx.commodity}
                                                    </span>
                                                )}
                                                {tx.stage && (
                                                    <span className="text-gray-500">{tx.stage}</span>
                                                )}
                                                {tx.location && (
                                                    <span className="text-gray-500">📍 {tx.location}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Value & Metrics */}
                                        <div className="flex items-center gap-6">
                                            {tx.deal_value_million && (
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500 uppercase">Deal Value</p>
                                                    <p className="text-2xl font-bold font-mono text-emerald-400">
                                                        {formatValue(tx.deal_value_million)}M
                                                    </p>
                                                </div>
                                            )}
                                            {tx.price_per_oz && (
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500 uppercase">$/oz</p>
                                                    <p className="text-lg font-mono text-white">
                                                        {formatValue(tx.price_per_oz)}
                                                    </p>
                                                </div>
                                            )}
                                            {tx.announcement_date && (
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500 uppercase">Announced</p>
                                                    <p className="text-sm text-gray-300">
                                                        {formatDate(tx.announcement_date)}
                                                    </p>
                                                </div>
                                            )}
                                            {tx.source_url && (
                                                <a
                                                    href={tx.source_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    {tx.notes && (
                                        <p className="mt-3 text-sm text-gray-500 border-t border-white/5 pt-3">
                                            {tx.notes}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Box */}
                <div className="mt-8 bg-gradient-to-r from-[var(--color-accent)]/20 to-[var(--color-gradient-mid)]/20 border border-[var(--color-accent)]/20 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-2">Understanding M&A Valuations</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
                        <div>
                            <p className="text-[var(--color-accent)] font-bold mb-1">Price per Ounce ($/oz)</p>
                            <p>Deal value divided by contained gold ounces. Key metric for comparing gold project acquisitions.</p>
                        </div>
                        <div>
                            <p className="text-amber-400 font-bold mb-1">EV/Resource Multiple</p>
                            <p>Enterprise value relative to total resources. Higher for producing assets, lower for exploration.</p>
                        </div>
                        <div>
                            <p className="text-emerald-400 font-bold mb-1">Implied Valuation</p>
                            <p>Use comparable transactions to estimate value of similar undeveloped assets.</p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
