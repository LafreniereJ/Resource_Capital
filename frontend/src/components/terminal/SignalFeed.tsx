'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Flame, BarChart2, ArrowRight } from 'lucide-react';

interface Stock {
    id: number;
    ticker: string;
    name: string;
    commodity: string;
    current_price: number | null;
    day_change_percent: number | null;
    day_volume: number | null;
    avg_volume: number | null;
}

type TabType = 'gainers' | 'losers' | 'volume';

interface SignalFeedProps {
    stocks: Stock[];
}

export default function SignalFeed({ stocks }: SignalFeedProps) {
    const [activeTab, setActiveTab] = useState<TabType>('gainers');

    const { gainers, losers, volumeSpikes } = useMemo(() => {
        const withChange = stocks.filter(s => s.day_change_percent !== null);
        const sortedByChange = [...withChange].sort(
            (a, b) => (b.day_change_percent || 0) - (a.day_change_percent || 0)
        );

        // Volume spikes: stocks where day_volume > 2x avg_volume
        const spikes = stocks.filter(s => {
            if (!s.day_volume || !s.avg_volume || s.avg_volume === 0) return false;
            return s.day_volume > s.avg_volume * 2;
        }).sort((a, b) => {
            const ratioA = (a.day_volume || 0) / (a.avg_volume || 1);
            const ratioB = (b.day_volume || 0) / (b.avg_volume || 1);
            return ratioB - ratioA;
        });

        return {
            gainers: sortedByChange.filter(s => (s.day_change_percent || 0) > 0).slice(0, 8),
            losers: sortedByChange.filter(s => (s.day_change_percent || 0) < 0).slice(-8).reverse(),
            volumeSpikes: spikes.slice(0, 8),
        };
    }, [stocks]);

    const tabs = [
        { id: 'gainers' as TabType, label: 'Gainers', icon: TrendingUp, color: 'text-emerald-400', count: gainers.length },
        { id: 'losers' as TabType, label: 'Losers', icon: TrendingDown, color: 'text-rose-400', count: losers.length },
        { id: 'volume' as TabType, label: 'Volume', icon: Flame, color: 'text-amber-400', count: volumeSpikes.length },
    ];

    const getDisplayStocks = () => {
        switch (activeTab) {
            case 'gainers': return gainers;
            case 'losers': return losers;
            case 'volume': return volumeSpikes;
            default: return [];
        }
    };

    const displayStocks = getDisplayStocks();

    return (
        <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden h-full flex flex-col">
            {/* Header with Tabs */}
            <div className="p-3 border-b border-white/5">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <BarChart2 className="text-[var(--color-accent)]" size={16} />
                        <h2 className="font-bold text-white text-sm">Signal Feed</h2>
                    </div>
                    <Link
                        href="/screener"
                        className="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-1"
                    >
                        Screener <ArrowRight size={10} />
                    </Link>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-black/40 rounded-lg p-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                                    isActive
                                        ? `bg-white/10 ${tab.color}`
                                        : 'text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                <Icon size={12} />
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className={`text-[10px] px-1 rounded ${isActive ? 'bg-white/10' : 'bg-white/5'}`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.15 }}
                        className="divide-y divide-white/5"
                    >
                        {displayStocks.map((stock, index) => (
                            <Link
                                key={stock.id}
                                href={`/companies/${stock.ticker}`}
                                className="flex items-center justify-between p-2.5 hover:bg-white/5 transition-colors group"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        {/* Rank */}
                                        <span className="text-xs text-gray-600 font-mono w-4">
                                            {index + 1}
                                        </span>
                                        {/* Ticker */}
                                        <span className="font-mono font-bold text-[var(--color-accent)] text-sm group-hover:text-white transition-colors">
                                            {stock.ticker}
                                        </span>
                                        {/* Volume spike indicator */}
                                        {activeTab === 'volume' && stock.day_volume && stock.avg_volume && (
                                            <span className="flex items-center gap-0.5 text-amber-400">
                                                <Flame size={10} />
                                                <span className="text-[10px] font-bold">
                                                    {(stock.day_volume / stock.avg_volume).toFixed(1)}x
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 truncate pl-6">{stock.name}</p>
                                </div>

                                <div className="text-right shrink-0 ml-2">
                                    <p className="font-mono text-white text-sm">
                                        ${stock.current_price?.toFixed(2) || '—'}
                                    </p>
                                    <p className={`text-xs font-bold ${
                                        (stock.day_change_percent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}>
                                        {(stock.day_change_percent || 0) >= 0 ? '+' : ''}
                                        {stock.day_change_percent?.toFixed(2) || '0.00'}%
                                    </p>
                                </div>
                            </Link>
                        ))}

                        {displayStocks.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                <BarChart2 size={24} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No signals available</p>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer Stats */}
            <div className="p-2 border-t border-white/5 bg-black/20 flex items-center justify-between text-xs text-gray-600">
                <span>Total: {stocks.length} stocks</span>
                <span>{gainers.length} up / {losers.length} down</span>
            </div>
        </div>
    );
}
