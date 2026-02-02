'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import InteractiveGrid from '@/components/ui/InteractiveGrid';
import {
    TrendingUp, TrendingDown, Newspaper, ArrowRight, Clock, ExternalLink,
    BarChart3, Map, GitCompare, FileText, Zap, Activity, Command
} from 'lucide-react';

// Terminal Components
import {
    TickerTape,
    CommandPalette,
    SystemHealth,
    SignalFeed,
    MiniHotspotMap,
    DailySummary,
    WatchlistWidget,
    RiskMeter,
    CatalystCalendar,
} from '@/components/terminal';

// Helper for classes
function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

// Strip HTML tags from text
function stripHtml(html: string): string {
    if (!html) return '';
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
}

interface MetalPrice {
    name: string;
    symbol: string;
    price: number;
    change: number;
    currency: string;
    updatedAt: string;
}

interface Stock {
    id: number;
    ticker: string;
    name: string;
    commodity: string;
    current_price: number | null;
    day_change_percent: number | null;
    day_volume?: number | null;
    avg_volume?: number | null;
    market_cap: number | null;
}

interface NewsArticle {
    id: number;
    ticker: string;
    title: string;
    description: string;
    source: string;
    url: string;
    published_at: string;
    image_url?: string;
}

interface LandingClientProps {
    stocks: Stock[];
    news: NewsArticle[];
}

const FALLBACK_METALS: MetalPrice[] = [
    { name: "Gold", symbol: "GC=F", price: 2845.50, change: 0.85, currency: "USD", updatedAt: "" },
    { name: "Silver", symbol: "SI=F", price: 34.20, change: -0.32, currency: "USD", updatedAt: "" },
    { name: "Copper", symbol: "HG=F", price: 4.15, change: 1.2, currency: "USD", updatedAt: "" },
    { name: "Uranium", symbol: "URA", price: 85.00, change: 0.45, currency: "USD", updatedAt: "" },
];

export default function LandingClient({ stocks, news }: LandingClientProps) {
    const [metals, setMetals] = useState<MetalPrice[]>(FALLBACK_METALS);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

    // Calculate market stats
    const marketStats = useMemo(() => {
        const withChange = stocks.filter(s => s.day_change_percent !== null);
        const advancers = withChange.filter(s => (s.day_change_percent || 0) > 0).length;
        const decliners = withChange.filter(s => (s.day_change_percent || 0) < 0).length;
        return {
            total: stocks.length,
            advancers,
            decliners,
            advancerPct: withChange.length > 0 ? Math.round((advancers / withChange.length) * 100) : 0,
            declinerPct: withChange.length > 0 ? Math.round((decliners / withChange.length) * 100) : 0,
        };
    }, [stocks]);

    // Calculate top movers for ticker tape
    const topMovers = useMemo(() => {
        return [...stocks]
            .filter(s => s.day_change_percent !== null)
            .sort((a, b) => Math.abs(b.day_change_percent || 0) - Math.abs(a.day_change_percent || 0))
            .slice(0, 20);
    }, [stocks]);

    // Format relative time
    const formatTimeAgo = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = Math.abs(now.getTime() - date.getTime());
            const diffMins = Math.floor(diffMs / (1000 * 60));
            if (diffMins < 1) return 'just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours}h ago`;
            const diffDays = Math.floor(diffHours / 24);
            return `${diffDays}d ago`;
        } catch {
            return '';
        }
    };

    // Fetch live metal prices
    useEffect(() => {
        async function fetchMetals() {
            try {
                const res = await fetch('/api/metals');
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.data?.length > 0) {
                        setMetals(data.data.slice(0, 7)); // Get all 7 metals for ticker tape
                        const latestUpdate = data.data
                            .map((m: MetalPrice) => m.updatedAt)
                            .filter(Boolean)
                            .sort()
                            .pop();
                        if (latestUpdate) {
                            setLastUpdated(formatTimeAgo(latestUpdate));
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch metal prices:', error);
            }
        }
        fetchMetals();
        const interval = setInterval(fetchMetals, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Global keyboard shortcut for command palette
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setCommandPaletteOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="min-h-screen bg-[var(--color-bg-base)] text-gray-200 font-sans overflow-x-hidden">
            {/* BACKGROUND */}
            <InteractiveGrid className="opacity-10" />

            {/* COMMAND PALETTE */}
            <CommandPalette
                isOpen={commandPaletteOpen}
                onClose={() => setCommandPaletteOpen(false)}
            />

            {/* ═══════════════════════════════════════════════════════════════════
                GLOBAL PULSE BAR (sticky top)
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="sticky top-16 z-40 border-b border-white/5 bg-[var(--color-bg-base)]/95 backdrop-blur-xl">
                <div className="max-w-[1800px] mx-auto px-4">
                    {/* Top Info Bar */}
                    <div className="h-10 flex items-center justify-between border-b border-white/5">
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold hidden sm:inline">
                                Command Center
                            </span>

                            {/* Market Regime Indicator */}
                            {metals.length > 0 && (() => {
                                const goldChange = metals.find(m => m.name === 'Gold')?.change || 0;
                                const copperChange = metals.find(m => m.name === 'Copper')?.change || 0;
                                const isRiskOn = copperChange > goldChange && copperChange > 0;
                                return (
                                    <div className={cn(
                                        "flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold",
                                        isRiskOn
                                            ? "bg-emerald-400/10 text-emerald-400"
                                            : "bg-amber-400/10 text-amber-400"
                                    )}>
                                        <Zap size={10} />
                                        {isRiskOn ? 'Risk-On' : 'Risk-Off'}
                                    </div>
                                );
                            })()}

                            {/* Command Palette Hint */}
                            <button
                                onClick={() => setCommandPaletteOpen(true)}
                                className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 text-xs text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-colors"
                            >
                                <Command size={10} />
                                <span>Search</span>
                                <kbd className="px-1 py-0.5 rounded bg-white/5 text-[10px] font-mono">⌘K</kbd>
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* System Health */}
                            <SystemHealth />

                            {/* Market Breadth */}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="text-emerald-400 font-bold">{marketStats.advancerPct}%</span>
                                <span className="hidden sm:inline">up</span>
                                <span className="text-gray-700">|</span>
                                <span className="text-rose-400 font-bold">{marketStats.declinerPct}%</span>
                                <span className="hidden sm:inline">down</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ticker Tape */}
                <TickerTape metals={metals} topMovers={topMovers} />
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                MAIN CONTENT - BENTO GRID LAYOUT
            ═══════════════════════════════════════════════════════════════════ */}
            <section className="relative z-10 px-4 max-w-[1800px] mx-auto py-6">
                {/* Bento Grid - 12 columns */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">

                    {/* ═══════════════════════════════════════════════════════════
                        Q1: SIGNAL FEED (Left Column - 4 cols)
                    ═══════════════════════════════════════════════════════════ */}
                    <div className="lg:col-span-4">
                        <SignalFeed stocks={stocks} />
                    </div>

                    {/* ═══════════════════════════════════════════════════════════
                        Q2: INTELLIGENCE ENGINE (Center - 5 cols)
                    ═══════════════════════════════════════════════════════════ */}
                    <div className="lg:col-span-5 space-y-4">
                        {/* Hotspot Map */}
                        <MiniHotspotMap />

                        {/* Daily AI Summary */}
                        <DailySummary stocks={stocks} news={news} metals={metals} />
                    </div>

                    {/* ═══════════════════════════════════════════════════════════
                        Q3: NEWS & CATALYSTS (Right Column - 3 cols)
                    ═══════════════════════════════════════════════════════════ */}
                    <div className="lg:col-span-3 space-y-4">
                        {/* Breaking News - Compact */}
                        <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
                            <div className="p-3 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Newspaper className="text-cyan-400" size={16} />
                                    <h2 className="font-bold text-white text-sm">Breaking</h2>
                                </div>
                                <Link href="/news" className="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-1">
                                    All <ArrowRight size={10} />
                                </Link>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto divide-y divide-white/5">
                                {news.slice(0, 6).map((article) => {
                                    const title = article.title.toLowerCase();
                                    const hasHighImpact = title.includes('acquire') || title.includes('merger') ||
                                        title.includes('billion') || title.includes('drill') || title.includes('discovery');

                                    return (
                                        <a
                                            key={article.id}
                                            href={article.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block p-2.5 hover:bg-white/5 transition-colors group"
                                        >
                                            <div className="flex items-start gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                                        {hasHighImpact && (
                                                            <span className="text-[10px] font-bold text-rose-400">●</span>
                                                        )}
                                                        {article.ticker && (
                                                            <span className="text-xs font-mono font-bold text-[var(--color-accent)]">
                                                                {article.ticker}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] text-gray-600">
                                                            {formatTimeAgo(article.published_at)}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-xs text-white group-hover:text-[var(--color-accent)] transition-colors line-clamp-2">
                                                        {article.title}
                                                    </h3>
                                                </div>
                                                <ExternalLink size={10} className="text-gray-600 shrink-0 mt-0.5" />
                                            </div>
                                        </a>
                                    );
                                })}
                                {news.length === 0 && (
                                    <div className="p-6 text-center text-gray-500">
                                        <Newspaper size={20} className="mx-auto mb-2 opacity-50" />
                                        <p className="text-xs">No news available</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Catalyst Calendar */}
                        <CatalystCalendar news={news} />
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════
                    Q4: PORTFOLIO & TOOLS RAIL (Full Width)
                ═══════════════════════════════════════════════════════════════════ */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Watchlist Widget */}
                    <WatchlistWidget />

                    {/* Risk Meter */}
                    <RiskMeter stocks={stocks} metals={metals} />

                    {/* Quick Actions */}
                    <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
                        <div className="p-3 border-b border-white/5">
                            <h2 className="font-bold text-white text-sm">Quick Actions</h2>
                        </div>
                        <div className="p-3 grid grid-cols-2 gap-2">
                            {[
                                { href: '/screener', label: 'Screener', icon: BarChart3, color: 'text-violet-400' },
                                { href: '/map', label: 'Full Map', icon: Map, color: 'text-emerald-400' },
                                { href: '/compare', label: 'Compare', icon: GitCompare, color: 'text-cyan-400' },
                                { href: '/reports', label: 'Reports', icon: FileText, color: 'text-amber-400' },
                            ].map((action) => {
                                const Icon = action.icon;
                                return (
                                    <Link
                                        key={action.href}
                                        href={action.href}
                                        className="p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-[var(--color-accent-muted)] hover:border-[var(--color-accent)]/30 transition-all group"
                                    >
                                        <Icon size={16} className={action.color} />
                                        <span className="text-xs text-gray-400 group-hover:text-white transition-colors block mt-1">
                                            {action.label}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════════
                FOOTER STATS BAR
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="border-t border-white/5 bg-black/20 mt-8">
                <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center gap-4">
                        <span>{stocks.length} companies tracked</span>
                        <span>{metals.length} commodities</span>
                        <span>{news.length} news items</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Activity size={10} className="text-emerald-400" />
                        <span>Data updates every 15 min</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
