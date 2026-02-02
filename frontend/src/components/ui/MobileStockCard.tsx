'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';

interface Stock {
    id: number;
    ticker: string;
    name: string;
    exchange: string;
    commodity: string;
    current_price: number | null;
    day_change_percent: number | null;
    market_cap: number | null;
}

interface MobileStockCardProps {
    stock: Stock;
    index?: number;
}

export function MobileStockCard({ stock, index = 0 }: MobileStockCardProps) {
    const formatMarketCap = (num: number | null) => {
        if (!num) return '—';
        if (num >= 1e12) return `$${(num / 1e12).toFixed(1)}T`;
        if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
        if (num >= 1e6) return `$${(num / 1e6).toFixed(0)}M`;
        return `$${num.toLocaleString()}`;
    };

    const isPositive = stock.day_change_percent !== null && stock.day_change_percent >= 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
        >
            <Link
                href={`/companies/${stock.ticker}`}
                className="block bg-[#0A0A15]/60 border border-white/5 rounded-xl p-4 active:bg-white/5 transition-colors"
            >
                {/* Top Row: Ticker, Name, Arrow */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-cyan-400 text-base">
                                {stock.ticker}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500 font-medium">
                                {stock.exchange}
                            </span>
                        </div>
                        <p className="text-sm text-gray-400 truncate pr-2">{stock.name}</p>
                    </div>
                    <ArrowUpRight size={16} className="text-gray-600 shrink-0 mt-1" />
                </div>

                {/* Bottom Row: Price, Change, Market Cap */}
                <div className="flex items-end justify-between">
                    {/* Price */}
                    <div>
                        <p className="text-xs text-gray-600 mb-0.5">Price</p>
                        <p className="font-mono font-semibold text-white text-lg">
                            {stock.current_price ? `$${stock.current_price.toFixed(2)}` : '—'}
                        </p>
                    </div>

                    {/* Change */}
                    <div className="text-center">
                        <p className="text-xs text-gray-600 mb-0.5">Change</p>
                        {stock.day_change_percent !== null ? (
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-mono font-semibold ${
                                isPositive
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-rose-500/10 text-rose-400'
                            }`}>
                                {isPositive ? (
                                    <TrendingUp size={12} />
                                ) : (
                                    <TrendingDown size={12} />
                                )}
                                {isPositive ? '+' : ''}{stock.day_change_percent.toFixed(2)}%
                            </div>
                        ) : (
                            <span className="text-gray-600">—</span>
                        )}
                    </div>

                    {/* Market Cap */}
                    <div className="text-right">
                        <p className="text-xs text-gray-600 mb-0.5">Mkt Cap</p>
                        <p className="font-mono text-gray-400 text-sm">
                            {formatMarketCap(stock.market_cap)}
                        </p>
                    </div>
                </div>

                {/* Commodity Badge */}
                {stock.commodity && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-800/50 text-gray-500 border border-gray-700/50">
                            {stock.commodity}
                        </span>
                    </div>
                )}
            </Link>
        </motion.div>
    );
}

/**
 * Mobile stock list wrapper with proper spacing
 */
export function MobileStockList({
    stocks,
    className = ''
}: {
    stocks: Stock[];
    className?: string;
}) {
    return (
        <div className={`space-y-3 ${className}`}>
            {stocks.map((stock, index) => (
                <MobileStockCard key={stock.id} stock={stock} index={index} />
            ))}
        </div>
    );
}
