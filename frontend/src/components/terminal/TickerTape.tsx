'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Pause, Play } from 'lucide-react';

interface MetalPrice {
    name: string;
    symbol: string;
    price: number;
    change: number;
    currency: string;
}

interface Stock {
    ticker: string;
    name: string;
    current_price: number | null;
    day_change_percent: number | null;
}

interface TickerTapeProps {
    metals: MetalPrice[];
    topMovers: Stock[];
}

export default function TickerTape({ metals, topMovers }: TickerTapeProps) {
    const [isPaused, setIsPaused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Combine metals and top movers for the tape
    const tapeItems = [
        ...metals.map(m => ({
            type: 'metal' as const,
            symbol: m.name,
            price: m.price,
            change: m.change,
            href: '/metals',
        })),
        ...topMovers.slice(0, 10).map(s => ({
            type: 'stock' as const,
            symbol: s.ticker,
            price: s.current_price || 0,
            change: s.day_change_percent || 0,
            href: `/companies/${s.ticker}`,
        })),
    ];

    // Duplicate items for seamless looping
    const duplicatedItems = [...tapeItems, ...tapeItems, ...tapeItems];

    return (
        <div
            className="relative overflow-hidden bg-black/40 border-y border-white/5"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Gradient masks */}
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[var(--color-bg-base)] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[var(--color-bg-base)] to-transparent z-10 pointer-events-none" />

            {/* Pause indicator */}
            {isPaused && (
                <div className="absolute right-20 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1 text-xs text-gray-500">
                    <Pause size={10} />
                    <span>Paused</span>
                </div>
            )}

            {/* Scrolling container */}
            <div
                ref={containerRef}
                className="flex py-2"
                style={{
                    animation: isPaused ? 'none' : 'ticker-scroll 60s linear infinite',
                }}
            >
                {duplicatedItems.map((item, index) => (
                    <Link
                        key={`${item.symbol}-${index}`}
                        href={item.href}
                        className="flex items-center gap-2 px-4 shrink-0 hover:bg-white/5 transition-colors rounded"
                    >
                        {/* Symbol */}
                        <span className={`font-mono font-bold text-xs ${
                            item.type === 'metal' ? 'text-amber-400' : 'text-[var(--color-accent)]'
                        }`}>
                            {item.symbol}
                        </span>

                        {/* Price */}
                        <span className="font-mono text-white text-xs">
                            ${item.price.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}
                        </span>

                        {/* Change */}
                        <span className={`flex items-center gap-0.5 text-xs font-bold ${
                            item.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                            {item.change >= 0 ? (
                                <TrendingUp size={10} />
                            ) : (
                                <TrendingDown size={10} />
                            )}
                            {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                        </span>

                        {/* Separator */}
                        <span className="text-gray-700 ml-2">│</span>
                    </Link>
                ))}
            </div>

            {/* CSS Animation */}
            <style jsx>{`
                @keyframes ticker-scroll {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-33.333%);
                    }
                }
            `}</style>
        </div>
    );
}
