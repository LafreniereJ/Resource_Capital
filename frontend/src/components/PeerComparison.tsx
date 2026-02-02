'use client';

import Link from 'next/link';
import { TrendingUp, TrendingDown, ArrowRight, Users, BarChart3 } from 'lucide-react';

interface PeerCompany {
    id: number;
    ticker: string;
    name: string;
    exchange: string;
    commodity: string;
    current_price: number | null;
    day_change_percent: number | null;
    market_cap: number | null;
    high_52w: number | null;
    low_52w: number | null;
}

interface PeerComparisonProps {
    currentCompany: {
        ticker: string;
        name: string;
        commodity: string;
        current_price: number | null;
        day_change_percent: number | null;
        market_cap: number | null;
    };
    peers: PeerCompany[];
}

export default function PeerComparison({ currentCompany, peers }: PeerComparisonProps) {
    if (peers.length === 0) {
        return null;
    }

    const formatMarketCap = (value: number | null) => {
        if (value === null || value === undefined) return '—';
        if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
        if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
        return `$${(value / 1e3).toFixed(0)}K`;
    };

    const formatChange = (value: number | null) => {
        if (value === null || value === undefined) return '—';
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}%`;
    };

    // Calculate peer average for comparison
    const peerAvgChange = peers.reduce((sum, p) => sum + (p.day_change_percent || 0), 0) / peers.length;
    const currentChange = currentCompany.day_change_percent || 0;
    const outperforming = currentChange > peerAvgChange;

    // Calculate 52-week position for each peer
    const calc52wPosition = (price: number | null, high: number | null, low: number | null) => {
        if (!price || !high || !low || high === low) return null;
        return ((price - low) / (high - low)) * 100;
    };

    return (
        <div className="bg-[#0A0A15]/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
            {/* Header */}
            <div className="p-6 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 flex items-center justify-center">
                            <Users className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Peer Comparison</h3>
                            <p className="text-xs text-gray-500">{currentCompany.commodity} sector</p>
                        </div>
                    </div>
                    <Link
                        href={`/compare?tickers=${currentCompany.ticker},${peers.slice(0, 3).map(p => p.ticker).join(',')}`}
                        className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition"
                    >
                        Full Compare <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>

                {/* Performance Summary */}
                <div className={`mt-4 p-3 rounded-xl ${outperforming
                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                    : 'bg-rose-500/10 border border-rose-500/20'
                    }`}>
                    <div className="flex items-center gap-2">
                        {outperforming ? (
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                        ) : (
                            <TrendingDown className="w-4 h-4 text-rose-400" />
                        )}
                        <span className={`text-sm font-medium ${outperforming ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {outperforming ? 'Outperforming' : 'Underperforming'} peers by {Math.abs(currentChange - peerAvgChange).toFixed(2)}%
                        </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                        {currentCompany.ticker}: {formatChange(currentChange)} vs Peer Avg: {formatChange(peerAvgChange)}
                    </div>
                </div>
            </div>

            {/* Peer List */}
            <div className="divide-y divide-white/5">
                {peers.map((peer) => {
                    const position52w = calc52wPosition(peer.current_price, peer.high_52w, peer.low_52w);
                    const changeValue = peer.day_change_percent || 0;

                    return (
                        <Link
                            key={peer.id}
                            href={`/companies/${peer.ticker}`}
                            className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition group"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-cyan-400 font-mono font-bold text-sm group-hover:text-cyan-300 transition">
                                        {peer.ticker}
                                    </span>
                                    <span className="text-xs text-gray-600">{peer.exchange}</span>
                                </div>
                                <p className="text-sm text-gray-400 truncate mt-0.5">{peer.name}</p>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Market Cap */}
                                <div className="text-right hidden sm:block">
                                    <p className="text-xs text-gray-500">Mkt Cap</p>
                                    <p className="text-sm font-mono text-white">{formatMarketCap(peer.market_cap)}</p>
                                </div>

                                {/* Price */}
                                <div className="text-right w-16">
                                    <p className="text-xs text-gray-500">Price</p>
                                    <p className="text-sm font-mono text-white">
                                        ${peer.current_price?.toFixed(2) || '—'}
                                    </p>
                                </div>

                                {/* Change */}
                                <div className={`text-right w-16 ${changeValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    <p className="text-xs text-gray-500">Change</p>
                                    <p className="text-sm font-mono font-bold">
                                        {formatChange(peer.day_change_percent)}
                                    </p>
                                </div>

                                {/* 52W Position Bar */}
                                {position52w !== null && (
                                    <div className="hidden md:block w-20">
                                        <p className="text-xs text-gray-500 mb-1">52W Range</p>
                                        <div className="h-2 bg-white/10 rounded-full overflow-hidden relative">
                                            <div
                                                className="absolute left-0 top-0 h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 rounded-full"
                                                style={{ width: `${position52w}%` }}
                                            />
                                            <div
                                                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3 bg-white rounded-full shadow"
                                                style={{ left: `${position52w}%`, marginLeft: '-3px' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Footer - View All */}
            <div className="p-4 border-t border-white/5 bg-white/[0.01]">
                <Link
                    href={`/screener?commodity=${encodeURIComponent(currentCompany.commodity)}`}
                    className="flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition"
                >
                    <BarChart3 className="w-4 h-4" />
                    View all {currentCompany.commodity} companies
                </Link>
            </div>
        </div>
    );
}
