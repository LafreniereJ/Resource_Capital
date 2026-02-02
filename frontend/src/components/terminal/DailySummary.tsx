'use client';

import React, { useMemo } from 'react';
import { Bot, TrendingUp, TrendingDown, Newspaper, Sparkles } from 'lucide-react';

interface Stock {
    ticker: string;
    name: string;
    day_change_percent: number | null;
    commodity?: string;
}

interface NewsArticle {
    title: string;
    ticker?: string;
}

interface MetalPrice {
    name: string;
    change: number;
}

interface DailySummaryProps {
    stocks: Stock[];
    news: NewsArticle[];
    metals: MetalPrice[];
}

export default function DailySummary({ stocks, news, metals }: DailySummaryProps) {
    const summary = useMemo(() => {
        // Calculate stats
        const withChange = stocks.filter(s => s.day_change_percent !== null);
        const advancers = withChange.filter(s => (s.day_change_percent || 0) > 0);
        const decliners = withChange.filter(s => (s.day_change_percent || 0) < 0);

        // Top gainer
        const topGainer = [...withChange].sort(
            (a, b) => (b.day_change_percent || 0) - (a.day_change_percent || 0)
        )[0];

        // Top loser
        const topLoser = [...withChange].sort(
            (a, b) => (a.day_change_percent || 0) - (b.day_change_percent || 0)
        )[0];

        // Gold/Copper ratio for sentiment
        const gold = metals.find(m => m.name === 'Gold');
        const copper = metals.find(m => m.name === 'Copper');
        const marketSentiment = copper && gold
            ? (copper.change > gold.change ? 'risk-on' : 'defensive')
            : 'neutral';

        // Count high-impact news
        const impactNews = news.filter(n => {
            const title = n.title.toLowerCase();
            return title.includes('acquire') || title.includes('merger') ||
                title.includes('billion') || title.includes('drill') ||
                title.includes('discovery') || title.includes('significant');
        });

        // Generate summary parts
        const parts: string[] = [];

        // Market breadth
        const advPct = Math.round((advancers.length / withChange.length) * 100);
        if (advPct >= 60) {
            parts.push(`Mining stocks are broadly positive today with ${advPct}% of tracked companies advancing.`);
        } else if (advPct <= 40) {
            parts.push(`Mining stocks face selling pressure today with only ${advPct}% advancing.`);
        } else {
            parts.push(`Mixed trading in mining stocks today with ${advPct}% of companies higher.`);
        }

        // Top movers
        if (topGainer) {
            parts.push(`${topGainer.ticker} leads gainers at +${topGainer.day_change_percent?.toFixed(1)}%.`);
        }

        // Metal commentary
        if (gold && copper) {
            if (gold.change > 1) {
                parts.push(`Gold is surging +${gold.change.toFixed(1)}%, supporting precious metals stocks.`);
            } else if (copper.change > 1) {
                parts.push(`Base metals rally with copper up ${copper.change.toFixed(1)}%.`);
            }
        }

        // News
        if (impactNews.length > 0) {
            parts.push(`${impactNews.length} significant news items today including potential M&A and drill results.`);
        }

        return {
            text: parts.join(' '),
            advPct,
            topGainer,
            topLoser,
            marketSentiment,
            newsCount: news.length,
            impactNewsCount: impactNews.length,
        };
    }, [stocks, news, metals]);

    return (
        <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                        <Bot size={12} className="text-white" />
                    </div>
                    <h2 className="font-bold text-white text-sm">Daily Brief</h2>
                </div>
                <div className="flex items-center gap-1 text-xs text-violet-400">
                    <Sparkles size={10} />
                    <span>AI Summary</span>
                </div>
            </div>

            {/* Summary Text */}
            <div className="p-4">
                <p className="text-sm text-gray-300 leading-relaxed">
                    {summary.text}
                </p>

                {/* Quick Stats */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                        <div className="flex items-center justify-center gap-1 text-emerald-400 mb-1">
                            <TrendingUp size={12} />
                            <span className="font-bold text-lg">{summary.advPct}%</span>
                        </div>
                        <span className="text-xs text-gray-500">Advancing</span>
                    </div>

                    <div className="bg-white/5 rounded-lg p-2 text-center">
                        <div className={`font-bold text-lg mb-1 ${
                            summary.marketSentiment === 'risk-on' ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                            {summary.marketSentiment === 'risk-on' ? '🟢' : '🟡'}
                        </div>
                        <span className="text-xs text-gray-500 capitalize">{summary.marketSentiment}</span>
                    </div>

                    <div className="bg-white/5 rounded-lg p-2 text-center">
                        <div className="flex items-center justify-center gap-1 text-cyan-400 mb-1">
                            <Newspaper size={12} />
                            <span className="font-bold text-lg">{summary.newsCount}</span>
                        </div>
                        <span className="text-xs text-gray-500">News Items</span>
                    </div>
                </div>

                {/* Top Mover Highlight */}
                {summary.topGainer && (
                    <div className="mt-3 p-2 bg-emerald-400/10 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={14} className="text-emerald-400" />
                            <span className="text-xs text-gray-400">Top Gainer</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-400 text-sm">
                                {summary.topGainer.ticker}
                            </span>
                            <span className="text-xs text-emerald-400 font-bold">
                                +{summary.topGainer.day_change_percent?.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-white/5 bg-black/20 text-xs text-gray-600 text-center">
                Generated from real-time market data
            </div>
        </div>
    );
}
