'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

interface Stock {
    day_change_percent: number | null;
    market_cap: number | null;
}

interface MetalPrice {
    name: string;
    change: number;
}

interface RiskMeterProps {
    stocks: Stock[];
    metals: MetalPrice[];
    className?: string;
}

export default function RiskMeter({ stocks, metals, className = '' }: RiskMeterProps) {
    const riskMetrics = useMemo(() => {
        // Calculate various risk factors

        // 1. Market breadth (what % are declining)
        const withChange = stocks.filter(s => s.day_change_percent !== null);
        const decliners = withChange.filter(s => (s.day_change_percent || 0) < 0);
        const breadthRisk = withChange.length > 0 ? (decliners.length / withChange.length) * 100 : 50;

        // 2. Volatility (average absolute change)
        const avgAbsChange = withChange.length > 0
            ? withChange.reduce((sum, s) => sum + Math.abs(s.day_change_percent || 0), 0) / withChange.length
            : 0;
        const volatilityRisk = Math.min(avgAbsChange * 10, 100); // Scale to 0-100

        // 3. Large cap exposure (inverse - more large caps = less risk)
        const largeCaps = stocks.filter(s => (s.market_cap || 0) > 1e9).length;
        const largeCapRatio = stocks.length > 0 ? largeCaps / stocks.length : 0;
        const sizeRisk = (1 - largeCapRatio) * 100;

        // 4. Gold/Copper ratio (gold up + copper down = defensive/risk-off)
        const gold = metals.find(m => m.name === 'Gold');
        const copper = metals.find(m => m.name === 'Copper');
        let sentimentRisk = 50;
        if (gold && copper) {
            // If gold > copper, markets are defensive (higher risk indication)
            sentimentRisk = gold.change > copper.change ? 60 : 40;
            // Amplify based on gold move
            if (gold.change > 2) sentimentRisk += 15;
            if (copper.change < -2) sentimentRisk += 15;
        }

        // Weighted average
        const overallRisk = Math.round(
            breadthRisk * 0.4 +
            volatilityRisk * 0.2 +
            sizeRisk * 0.2 +
            sentimentRisk * 0.2
        );

        // Determine risk level
        let level: 'low' | 'moderate' | 'elevated' | 'high';
        let color: string;
        let bgColor: string;
        if (overallRisk < 35) {
            level = 'low';
            color = 'text-emerald-400';
            bgColor = 'bg-emerald-400';
        } else if (overallRisk < 55) {
            level = 'moderate';
            color = 'text-amber-400';
            bgColor = 'bg-amber-400';
        } else if (overallRisk < 75) {
            level = 'elevated';
            color = 'text-orange-400';
            bgColor = 'bg-orange-400';
        } else {
            level = 'high';
            color = 'text-rose-400';
            bgColor = 'bg-rose-400';
        }

        return {
            overall: overallRisk,
            breadth: Math.round(breadthRisk),
            volatility: Math.round(volatilityRisk),
            size: Math.round(sizeRisk),
            sentiment: Math.round(sentimentRisk),
            level,
            color,
            bgColor,
        };
    }, [stocks, metals]);

    const segments = 10;
    const filledSegments = Math.round((riskMetrics.overall / 100) * segments);

    return (
        <div className={`rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden ${className}`}>
            {/* Header */}
            <div className="p-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Shield className={riskMetrics.color} size={16} />
                    <h2 className="font-bold text-white text-sm">Risk Meter</h2>
                </div>
                <span className={`text-xs font-bold uppercase ${riskMetrics.color}`}>
                    {riskMetrics.level}
                </span>
            </div>

            {/* Risk Gauge */}
            <div className="p-4">
                {/* Segmented Bar */}
                <div className="flex gap-1 mb-2">
                    {Array.from({ length: segments }).map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className={`flex-1 h-6 rounded-sm ${
                                i < filledSegments
                                    ? i < 3
                                        ? 'bg-emerald-400'
                                        : i < 5
                                            ? 'bg-amber-400'
                                            : i < 7
                                                ? 'bg-orange-400'
                                                : 'bg-rose-400'
                                    : 'bg-white/10'
                            }`}
                        />
                    ))}
                </div>

                {/* Score */}
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-gray-500">Low Risk</span>
                    <span className={`text-2xl font-bold font-mono ${riskMetrics.color}`}>
                        {riskMetrics.overall}
                    </span>
                    <span className="text-xs text-gray-500">High Risk</span>
                </div>

                {/* Factor Breakdown */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 flex items-center gap-1.5">
                            <TrendingDown size={10} />
                            Market Breadth
                        </span>
                        <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${riskMetrics.breadth > 50 ? 'bg-rose-400' : 'bg-emerald-400'}`}
                                    style={{ width: `${riskMetrics.breadth}%` }}
                                />
                            </div>
                            <span className="text-gray-400 font-mono w-8 text-right">{riskMetrics.breadth}%</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 flex items-center gap-1.5">
                            <AlertTriangle size={10} />
                            Volatility
                        </span>
                        <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${riskMetrics.volatility > 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                    style={{ width: `${riskMetrics.volatility}%` }}
                                />
                            </div>
                            <span className="text-gray-400 font-mono w-8 text-right">{riskMetrics.volatility}%</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 flex items-center gap-1.5">
                            <TrendingUp size={10} />
                            Sentiment
                        </span>
                        <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${riskMetrics.sentiment > 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                    style={{ width: `${riskMetrics.sentiment}%` }}
                                />
                            </div>
                            <span className="text-gray-400 font-mono w-8 text-right">{riskMetrics.sentiment}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-white/5 bg-black/20 text-xs text-gray-600 text-center">
                Based on market breadth & sentiment
            </div>
        </div>
    );
}
