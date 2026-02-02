'use client';

import { useEffect, useMemo, useState } from 'react';
import { createChart, ColorType, LineData, Time } from 'lightweight-charts';
import { TrendingUp, TrendingDown, Activity, AlertCircle } from 'lucide-react';

interface PricePoint {
    date: string;
    close?: number;
    price?: number;
}

interface CommodityCorrelationProps {
    stockPrices: PricePoint[];
    metalPrices: PricePoint[];
    stockTicker: string;
    metalName: string;
    metalSymbol?: string;
}

// Calculate Pearson correlation coefficient
function calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;
    return numerator / denominator;
}

// Normalize prices to percentage change from first value
function normalizeToPercent(prices: number[]): number[] {
    if (prices.length === 0) return [];
    const firstValue = prices[0];
    if (firstValue === 0) return prices.map(() => 0);
    return prices.map(p => ((p - firstValue) / firstValue) * 100);
}

export default function CommodityCorrelation({
    stockPrices,
    metalPrices,
    stockTicker,
    metalName,
    metalSymbol = 'XAU'
}: CommodityCorrelationProps) {
    const [chartContainer, setChartContainer] = useState<HTMLDivElement | null>(null);
    const [timeRange, setTimeRange] = useState<'30' | '90' | '180' | '365'>('90');

    // Merge and align price data
    const { alignedData, correlation, stockChange, metalChange } = useMemo(() => {
        const daysLimit = parseInt(timeRange);

        // Create date-indexed maps
        const stockMap = new Map<string, number>();
        const metalMap = new Map<string, number>();

        stockPrices.slice(-daysLimit).forEach(p => {
            const date = p.date.split('T')[0];
            stockMap.set(date, p.close || 0);
        });

        metalPrices.slice(-daysLimit).forEach(p => {
            const date = p.date.split('T')[0];
            metalMap.set(date, p.price || 0);
        });

        // Find common dates
        const commonDates = Array.from(stockMap.keys())
            .filter(date => metalMap.has(date))
            .sort();

        if (commonDates.length < 2) {
            return { alignedData: null, correlation: 0, stockChange: 0, metalChange: 0 };
        }

        const stockValues = commonDates.map(d => stockMap.get(d)!);
        const metalValues = commonDates.map(d => metalMap.get(d)!);

        // Calculate correlation
        const corr = calculateCorrelation(stockValues, metalValues);

        // Calculate total change
        const stockFirst = stockValues[0];
        const stockLast = stockValues[stockValues.length - 1];
        const metalFirst = metalValues[0];
        const metalLast = metalValues[metalValues.length - 1];

        const stockChg = stockFirst > 0 ? ((stockLast - stockFirst) / stockFirst) * 100 : 0;
        const metalChg = metalFirst > 0 ? ((metalLast - metalFirst) / metalFirst) * 100 : 0;

        // Normalize for chart
        const stockNormalized = normalizeToPercent(stockValues);
        const metalNormalized = normalizeToPercent(metalValues);

        return {
            alignedData: {
                dates: commonDates,
                stock: stockNormalized,
                metal: metalNormalized
            },
            correlation: corr,
            stockChange: stockChg,
            metalChange: metalChg
        };
    }, [stockPrices, metalPrices, timeRange]);

    // Chart rendering
    useEffect(() => {
        if (!chartContainer || !alignedData) return;

        const chart = createChart(chartContainer, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#6b7280',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
            },
            width: chartContainer.clientWidth,
            height: 200,
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
                timeVisible: true,
            },
            crosshair: {
                horzLine: {
                    color: 'rgba(103, 232, 249, 0.3)',
                    width: 1,
                    style: 2,
                    labelBackgroundColor: '#0A0A15',
                },
                vertLine: {
                    color: 'rgba(103, 232, 249, 0.3)',
                    width: 1,
                    style: 2,
                    labelBackgroundColor: '#0A0A15',
                },
            },
        });

        // Stock line
        const stockSeries = chart.addLineSeries({
            color: '#22d3ee',
            lineWidth: 2,
            title: stockTicker,
        });

        const stockData: LineData[] = alignedData.dates.map((date, i) => ({
            time: date as Time,
            value: alignedData.stock[i],
        }));
        stockSeries.setData(stockData);

        // Metal line
        const metalSeries = chart.addLineSeries({
            color: '#fbbf24',
            lineWidth: 2,
            title: metalName,
        });

        const metalData: LineData[] = alignedData.dates.map((date, i) => ({
            time: date as Time,
            value: alignedData.metal[i],
        }));
        metalSeries.setData(metalData);

        chart.timeScale().fitContent();

        // Handle resize
        const handleResize = () => {
            chart.applyOptions({ width: chartContainer.clientWidth });
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [chartContainer, alignedData, stockTicker, metalName]);

    // Correlation strength label
    const getCorrelationLabel = (corr: number) => {
        const abs = Math.abs(corr);
        if (abs >= 0.7) return { label: 'Strong', color: 'text-emerald-400' };
        if (abs >= 0.4) return { label: 'Moderate', color: 'text-amber-400' };
        if (abs >= 0.2) return { label: 'Weak', color: 'text-gray-400' };
        return { label: 'None', color: 'text-gray-600' };
    };

    const corrInfo = getCorrelationLabel(correlation);
    const isPositive = correlation >= 0;

    if (!alignedData || alignedData.dates.length < 5) {
        return (
            <div className="bg-[#0A0A15]/60 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center gap-3 text-gray-500">
                    <AlertCircle className="w-5 h-5" />
                    <span>Insufficient data for correlation analysis</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#0A0A15]/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
            {/* Header */}
            <div className="p-6 border-b border-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">
                                {stockTicker} vs {metalName}
                            </h3>
                            <p className="text-xs text-gray-500">Price correlation analysis</p>
                        </div>
                    </div>

                    {/* Time Range Selector */}
                    <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                        {(['30', '90', '180', '365'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${timeRange === range
                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                    : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                {range}D
                            </button>
                        ))}
                    </div>
                </div>

                {/* Correlation Stats */}
                <div className="mt-4 grid grid-cols-3 gap-4">
                    {/* Correlation Coefficient */}
                    <div className={`p-3 rounded-xl ${isPositive ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            {isPositive ? (
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                            ) : (
                                <TrendingDown className="w-4 h-4 text-rose-400" />
                            )}
                            <span className="text-xs text-gray-500">Correlation</span>
                        </div>
                        <p className={`text-xl font-bold font-mono ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {correlation >= 0 ? '+' : ''}{correlation.toFixed(2)}
                        </p>
                        <p className={`text-xs ${corrInfo.color}`}>{corrInfo.label} {isPositive ? 'positive' : 'negative'}</p>
                    </div>

                    {/* Stock Change */}
                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                        <p className="text-xs text-gray-500 mb-1">{stockTicker}</p>
                        <p className={`text-xl font-bold font-mono ${stockChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {stockChange >= 0 ? '+' : ''}{stockChange.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500">{timeRange}D change</p>
                    </div>

                    {/* Metal Change */}
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <p className="text-xs text-gray-500 mb-1">{metalName}</p>
                        <p className={`text-xl font-bold font-mono ${metalChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {metalChange >= 0 ? '+' : ''}{metalChange.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500">{timeRange}D change</p>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="p-4">
                <div ref={setChartContainer} className="w-full" />

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-3">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-cyan-400 rounded-full"></div>
                        <span className="text-xs text-gray-500">{stockTicker}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-amber-400 rounded-full"></div>
                        <span className="text-xs text-gray-500">{metalName}</span>
                    </div>
                </div>
            </div>

            {/* Interpretation */}
            <div className="px-6 pb-4">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-xs text-gray-500">
                        {Math.abs(correlation) >= 0.7 ? (
                            <>
                                <span className="text-white font-medium">{stockTicker}</span> shows a{' '}
                                <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                                    {corrInfo.label.toLowerCase()} {isPositive ? 'positive' : 'negative'}
                                </span>{' '}
                                correlation with {metalName}. Price movements tend to{' '}
                                {isPositive ? 'move together' : 'move in opposite directions'}.
                            </>
                        ) : Math.abs(correlation) >= 0.4 ? (
                            <>
                                <span className="text-white font-medium">{stockTicker}</span> shows a{' '}
                                <span className="text-amber-400">moderate</span> correlation with {metalName}.
                                Some price movements may be linked.
                            </>
                        ) : (
                            <>
                                <span className="text-white font-medium">{stockTicker}</span> shows{' '}
                                <span className="text-gray-400">weak or no</span> correlation with {metalName}.
                                Prices appear to move independently.
                            </>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
