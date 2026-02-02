'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, BarChart2, Building2 } from 'lucide-react';

interface TickerData {
    ticker: string;
    name: string;
    current_price: number | null;
    day_change_percent: number | null;
    market_cap: number | null;
    day_volume: number | null;
    high_52w: number | null;
    low_52w: number | null;
}

interface TickerHoverCardProps {
    ticker: string;
    children: React.ReactNode;
}

export default function TickerHoverCard({ ticker, children }: TickerHoverCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [data, setData] = useState<TickerData | null>(null);
    const [loading, setLoading] = useState(false);
    const [position, setPosition] = useState<'top' | 'bottom'>('bottom');
    const containerRef = useRef<HTMLDivElement>(null);
    const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

    // Calculate position based on viewport
    useEffect(() => {
        if (isHovered && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            setPosition(spaceBelow < 200 ? 'top' : 'bottom');
        }
    }, [isHovered]);

    // Fetch ticker data on hover
    useEffect(() => {
        if (isHovered && !data && !loading) {
            setLoading(true);
            fetch(`/api/companies/${ticker}`)
                .then(res => res.json())
                .then(result => {
                    if (result.company) {
                        setData(result.company);
                    }
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [isHovered, ticker, data, loading]);

    const handleMouseEnter = () => {
        hoverTimeout.current = setTimeout(() => {
            setIsHovered(true);
        }, 300); // Delay before showing card
    };

    const handleMouseLeave = () => {
        if (hoverTimeout.current) {
            clearTimeout(hoverTimeout.current);
        }
        setIsHovered(false);
    };

    const formatMarketCap = (value: number | null) => {
        if (!value) return '—';
        if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
        if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
        return `$${value.toLocaleString()}`;
    };

    const formatVolume = (value: number | null) => {
        if (!value) return '—';
        if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
        if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
        return value.toLocaleString();
    };

    return (
        <div
            ref={containerRef}
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}

            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: position === 'bottom' ? -10 : 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: position === 'bottom' ? -10 : 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute left-0 z-50 w-64 ${
                            position === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
                        }`}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={handleMouseLeave}
                    >
                        <div className="glass-card p-3 shadow-xl">
                            {loading ? (
                                <div className="flex items-center justify-center py-4">
                                    <div className="animate-pulse text-gray-500">Loading...</div>
                                </div>
                            ) : data ? (
                                <>
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-[var(--color-accent)] text-lg">
                                                    {data.ticker}
                                                </span>
                                                {(data.day_change_percent || 0) >= 0 ? (
                                                    <TrendingUp size={14} className="text-emerald-400" />
                                                ) : (
                                                    <TrendingDown size={14} className="text-rose-400" />
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 truncate max-w-[180px]">
                                                {data.name}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-mono text-white text-lg font-bold">
                                                ${data.current_price?.toFixed(2) || '—'}
                                            </p>
                                            <p className={`text-sm font-bold ${
                                                (data.day_change_percent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                            }`}>
                                                {(data.day_change_percent || 0) >= 0 ? '+' : ''}
                                                {data.day_change_percent?.toFixed(2) || '0.00'}%
                                            </p>
                                        </div>
                                    </div>

                                    {/* Mini Sparkline Placeholder */}
                                    <div className="h-8 bg-white/5 rounded mb-3 flex items-center justify-center">
                                        <BarChart2 size={16} className="text-gray-600" />
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="bg-white/5 rounded p-2">
                                            <span className="text-gray-500 block">Market Cap</span>
                                            <span className="text-white font-mono">
                                                {formatMarketCap(data.market_cap)}
                                            </span>
                                        </div>
                                        <div className="bg-white/5 rounded p-2">
                                            <span className="text-gray-500 block">Volume</span>
                                            <span className="text-white font-mono">
                                                {formatVolume(data.day_volume)}
                                            </span>
                                        </div>
                                        <div className="bg-white/5 rounded p-2">
                                            <span className="text-gray-500 block">52W High</span>
                                            <span className="text-white font-mono">
                                                ${data.high_52w?.toFixed(2) || '—'}
                                            </span>
                                        </div>
                                        <div className="bg-white/5 rounded p-2">
                                            <span className="text-gray-500 block">52W Low</span>
                                            <span className="text-white font-mono">
                                                ${data.low_52w?.toFixed(2) || '—'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 52W Range Bar */}
                                    {data.high_52w && data.low_52w && data.current_price && (
                                        <div className="mt-3">
                                            <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                                                <span>52W Range</span>
                                                <span>
                                                    {Math.round(((data.current_price - data.low_52w) / (data.high_52w - data.low_52w)) * 100)}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-[var(--color-accent)] to-cyan-400"
                                                    style={{
                                                        width: `${Math.min(100, Math.max(0, ((data.current_price - data.low_52w) / (data.high_52w - data.low_52w)) * 100))}%`
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex items-center gap-2 text-gray-500 py-2">
                                    <Building2 size={14} />
                                    <span className="text-sm">No data available</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
