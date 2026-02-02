'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Calendar, Clock, FileText, TrendingUp, Pickaxe, ArrowRight } from 'lucide-react';

interface NewsArticle {
    id: number;
    title: string;
    ticker?: string;
    published_at: string;
    source: string;
}

interface CatalystCalendarProps {
    news: NewsArticle[];
    className?: string;
}

interface Catalyst {
    id: number;
    type: 'earnings' | 'drill' | 'filing' | 'production' | 'other';
    title: string;
    ticker?: string;
    date: Date;
    source: string;
}

export default function CatalystCalendar({ news, className = '' }: CatalystCalendarProps) {
    const catalysts = useMemo(() => {
        // Extract potential catalysts from news
        const items: Catalyst[] = [];

        for (const article of news.slice(0, 50)) { // Check recent 50 news items
            const title = article.title.toLowerCase();
            let type: Catalyst['type'] = 'other';

            // Categorize by keywords
            if (title.includes('drill') || title.includes('assay') || title.includes('intersection')) {
                type = 'drill';
            } else if (title.includes('earnings') || title.includes('quarterly') || title.includes('q1') || title.includes('q2') || title.includes('q3') || title.includes('q4')) {
                type = 'earnings';
            } else if (title.includes('43-101') || title.includes('filing') || title.includes('report')) {
                type = 'filing';
            } else if (title.includes('production') || title.includes('output') || title.includes('guidance')) {
                type = 'production';
            } else {
                // Skip non-catalyst news
                continue;
            }

            items.push({
                id: article.id,
                type,
                title: article.title.length > 60 ? article.title.slice(0, 60) + '...' : article.title,
                ticker: article.ticker,
                date: new Date(article.published_at),
                source: article.source,
            });
        }

        // Sort by date (most recent first) and take top 8
        return items
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, 8);
    }, [news]);

    const getTypeConfig = (type: Catalyst['type']) => {
        switch (type) {
            case 'drill':
                return { icon: Pickaxe, color: 'text-amber-400', bg: 'bg-amber-400/20', label: 'Drill' };
            case 'earnings':
                return { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/20', label: 'Earnings' };
            case 'filing':
                return { icon: FileText, color: 'text-cyan-400', bg: 'bg-cyan-400/20', label: 'Filing' };
            case 'production':
                return { icon: TrendingUp, color: 'text-violet-400', bg: 'bg-violet-400/20', label: 'Prod' };
            default:
                return { icon: Calendar, color: 'text-gray-400', bg: 'bg-gray-400/20', label: 'News' };
        }
    };

    const formatDate = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className={`rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden ${className}`}>
            {/* Header */}
            <div className="p-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Calendar className="text-cyan-400" size={16} />
                    <h2 className="font-bold text-white text-sm">Catalysts</h2>
                    <span className="text-xs text-gray-500 font-mono">{catalysts.length}</span>
                </div>
                <Link
                    href="/news"
                    className="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-1"
                >
                    All News <ArrowRight size={10} />
                </Link>
            </div>

            {/* Catalyst List */}
            <div className="max-h-[280px] overflow-y-auto">
                {catalysts.length === 0 ? (
                    <div className="p-6 text-center">
                        <Calendar size={24} className="mx-auto text-gray-600 mb-2" />
                        <p className="text-sm text-gray-500">No catalysts detected</p>
                        <p className="text-xs text-gray-600 mt-1">Check back for upcoming events</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {catalysts.map((catalyst) => {
                            const config = getTypeConfig(catalyst.type);
                            const Icon = config.icon;

                            return (
                                <Link
                                    key={catalyst.id}
                                    href={`/news?article=${catalyst.id}`}
                                    className="flex items-start gap-3 p-3 hover:bg-white/5 transition-colors group"
                                >
                                    <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                                        <Icon size={14} className={config.color} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            {catalyst.ticker && (
                                                <span className="font-mono text-xs font-bold text-[var(--color-accent)]">
                                                    {catalyst.ticker}
                                                </span>
                                            )}
                                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}>
                                                {config.label}
                                            </span>
                                        </div>
                                        <p className="text-sm text-white group-hover:text-[var(--color-accent)] transition-colors line-clamp-2">
                                            {catalyst.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-gray-600 flex items-center gap-1">
                                                <Clock size={10} />
                                                {formatDate(catalyst.date)}
                                            </span>
                                            <span className="text-xs text-gray-600">
                                                {catalyst.source}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-white/5 bg-black/20 text-xs text-gray-600 text-center">
                Extracted from recent news
            </div>
        </div>
    );
}
