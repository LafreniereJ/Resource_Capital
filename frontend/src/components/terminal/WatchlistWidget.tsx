'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Plus, X, TrendingUp, TrendingDown, Eye } from 'lucide-react';

interface WatchlistStock {
    ticker: string;
    name?: string;
    current_price?: number;
    day_change_percent?: number;
}

interface WatchlistWidgetProps {
    className?: string;
}

const STORAGE_KEY = 'rc-watchlist';

export default function WatchlistWidget({ className = '' }: WatchlistWidgetProps) {
    const [watchlist, setWatchlist] = useState<string[]>([]);
    const [stockData, setStockData] = useState<Map<string, WatchlistStock>>(new Map());
    const [isAddingTicker, setIsAddingTicker] = useState(false);
    const [newTicker, setNewTicker] = useState('');
    const [loading, setLoading] = useState(true);

    // Load watchlist from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                setWatchlist(JSON.parse(saved));
            }
            setLoading(false);
        }
    }, []);

    // Save watchlist to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined' && !loading) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
        }
    }, [watchlist, loading]);

    // Fetch stock data for watchlist
    useEffect(() => {
        if (watchlist.length === 0) return;

        async function fetchStockData() {
            const newData = new Map<string, WatchlistStock>();

            for (const ticker of watchlist) {
                try {
                    const res = await fetch(`/api/companies/${ticker}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.company) {
                            newData.set(ticker, {
                                ticker: data.company.ticker,
                                name: data.company.name,
                                current_price: data.company.current_price,
                                day_change_percent: data.company.day_change_percent,
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Failed to fetch ${ticker}:`, error);
                }
            }

            setStockData(newData);
        }

        fetchStockData();
        const interval = setInterval(fetchStockData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [watchlist]);

    const addTicker = () => {
        const ticker = newTicker.toUpperCase().trim();
        if (ticker && !watchlist.includes(ticker)) {
            setWatchlist(prev => [...prev, ticker]);
        }
        setNewTicker('');
        setIsAddingTicker(false);
    };

    const removeTicker = (ticker: string) => {
        setWatchlist(prev => prev.filter(t => t !== ticker));
        setStockData(prev => {
            const newMap = new Map(prev);
            newMap.delete(ticker);
            return newMap;
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            addTicker();
        } else if (e.key === 'Escape') {
            setIsAddingTicker(false);
            setNewTicker('');
        }
    };

    return (
        <div className={`rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden ${className}`}>
            {/* Header */}
            <div className="p-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Star className="text-amber-400" size={16} />
                    <h2 className="font-bold text-white text-sm">Watchlist</h2>
                    <span className="text-xs text-gray-500 font-mono">{watchlist.length}</span>
                </div>
                <button
                    onClick={() => setIsAddingTicker(true)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    title="Add ticker"
                >
                    <Plus size={14} />
                </button>
            </div>

            {/* Add Ticker Input */}
            <AnimatePresence>
                {isAddingTicker && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-b border-white/5"
                    >
                        <div className="p-2 flex gap-2">
                            <input
                                type="text"
                                value={newTicker}
                                onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                                onKeyDown={handleKeyDown}
                                placeholder="Enter ticker..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-accent)]/50"
                                autoFocus
                                maxLength={10}
                            />
                            <button
                                onClick={addTicker}
                                className="px-3 py-1.5 bg-[var(--color-accent-muted)] text-[var(--color-accent)] rounded-lg text-sm font-medium hover:bg-[var(--color-accent)]/20 transition-colors"
                            >
                                Add
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Watchlist Items */}
            <div className="max-h-[200px] overflow-y-auto">
                {loading ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                        Loading...
                    </div>
                ) : watchlist.length === 0 ? (
                    <div className="p-6 text-center">
                        <Eye size={24} className="mx-auto text-gray-600 mb-2" />
                        <p className="text-sm text-gray-500">No stocks in watchlist</p>
                        <button
                            onClick={() => setIsAddingTicker(true)}
                            className="mt-2 text-xs text-[var(--color-accent)] hover:underline"
                        >
                            + Add your first stock
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {watchlist.map((ticker) => {
                            const data = stockData.get(ticker);
                            const changePercent = data?.day_change_percent || 0;

                            return (
                                <div
                                    key={ticker}
                                    className="flex items-center justify-between p-2.5 hover:bg-white/5 transition-colors group"
                                >
                                    <Link
                                        href={`/companies/${ticker}`}
                                        className="flex-1 min-w-0"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-[var(--color-accent)] text-sm">
                                                {ticker}
                                            </span>
                                            {changePercent >= 0 ? (
                                                <TrendingUp size={10} className="text-emerald-400" />
                                            ) : (
                                                <TrendingDown size={10} className="text-rose-400" />
                                            )}
                                        </div>
                                        {data?.name && (
                                            <p className="text-xs text-gray-500 truncate">{data.name}</p>
                                        )}
                                    </Link>

                                    <div className="flex items-center gap-2">
                                        <div className="text-right">
                                            <p className="font-mono text-white text-sm">
                                                ${data?.current_price?.toFixed(2) || '—'}
                                            </p>
                                            <p className={`text-xs font-bold ${
                                                changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                            }`}>
                                                {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => removeTicker(ticker)}
                                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 text-gray-500 hover:text-rose-400 transition-all"
                                            title="Remove from watchlist"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer */}
            {watchlist.length > 0 && (
                <div className="p-2 border-t border-white/5 bg-black/20 text-xs text-gray-600 text-center">
                    Click ticker to view details
                </div>
            )}
        </div>
    );
}
