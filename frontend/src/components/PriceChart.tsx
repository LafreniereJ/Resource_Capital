'use client';

import { createChart, ColorType, IChartApi, CrosshairMode, CandlestickSeries, AreaSeries, Time } from 'lightweight-charts';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';

interface ChartDataPoint {
    time: string;
    value?: number;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
}

interface ChartProps {
    data: ChartDataPoint[];
    type?: 'line' | 'candlestick';
    showRangeSelector?: boolean;
    height?: number;
    colors?: {
        backgroundColor?: string;
        lineColor?: string;
        textColor?: string;
        areaTopColor?: string;
        areaBottomColor?: string;
    };
}

type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

const TIME_RANGES: { label: TimeRange; days: number | null }[] = [
    { label: '1W', days: 7 },
    { label: '1M', days: 30 },
    { label: '3M', days: 90 },
    { label: '6M', days: 180 },
    { label: '1Y', days: 365 },
    { label: 'ALL', days: null },
];

export const PriceChart = ({
    data,
    type = 'line',
    showRangeSelector = true,
    height = 300,
    colors: {
        backgroundColor = 'transparent',
        lineColor = '#06b6d4', // cyan-500
        textColor = '#9ca3af', // gray-400
        areaTopColor = 'rgba(6, 182, 212, 0.4)',
        areaBottomColor = 'rgba(6, 182, 212, 0.0)',
    } = {},
}: ChartProps) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const [selectedRange, setSelectedRange] = useState<TimeRange>('1Y');
    const [tooltipData, setTooltipData] = useState<{
        price: number;
        date: string;
        change: number;
        changePercent: number;
    } | null>(null);

    // Filter data based on selected time range
    const filteredData = useMemo(() => {
        const rangeConfig = TIME_RANGES.find(r => r.label === selectedRange);
        if (!rangeConfig?.days || data.length === 0) return data;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - rangeConfig.days);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];

        return data.filter(d => d.time >= cutoffStr);
    }, [data, selectedRange]);

    // Calculate stats for the filtered period
    const periodStats = useMemo(() => {
        if (filteredData.length < 2) return null;

        const firstValue = filteredData[0].close ?? filteredData[0].value ?? 0;
        const lastValue = filteredData[filteredData.length - 1].close ?? filteredData[filteredData.length - 1].value ?? 0;
        const change = lastValue - firstValue;
        const changePercent = firstValue !== 0 ? (change / firstValue) * 100 : 0;
        const high = Math.max(...filteredData.map(d => d.high ?? d.value ?? 0));
        const low = Math.min(...filteredData.map(d => d.low ?? d.value ?? 0).filter(v => v > 0));

        return { firstValue, lastValue, change, changePercent, high, low };
    }, [filteredData]);

    useEffect(() => {
        if (!chartContainerRef.current || filteredData.length === 0) return;

        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        // Create chart with enhanced options
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: backgroundColor },
                textColor,
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
            },
            width: chartContainerRef.current.clientWidth,
            height,
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    width: 1,
                    color: 'rgba(6, 182, 212, 0.3)',
                    style: 2,
                    labelBackgroundColor: '#0A0A15',
                },
                horzLine: {
                    width: 1,
                    color: 'rgba(6, 182, 212, 0.3)',
                    style: 2,
                    labelBackgroundColor: '#0A0A15',
                },
            },
            rightPriceScale: {
                borderVisible: false,
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            timeScale: {
                borderVisible: false,
                timeVisible: true,
                secondsVisible: false,
                fixLeftEdge: true,
                fixRightEdge: true,
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
                horzTouchDrag: true,
                vertTouchDrag: false,
            },
            handleScale: {
                axisPressedMouseMove: true,
                mouseWheel: true,
                pinch: true,
            },
        });

        chartRef.current = chart;
        chart.timeScale().fitContent();

        // Add series based on type
        if (type === 'candlestick') {
            const series = chart.addSeries(CandlestickSeries, {
                upColor: '#10b981', // emerald-500
                downColor: '#ef4444', // red-500
                borderVisible: false,
                wickUpColor: '#10b981',
                wickDownColor: '#ef4444',
            });
            // @ts-ignore - lightweight-charts types
            series.setData(filteredData);

            // Subscribe to crosshair move for tooltip
            chart.subscribeCrosshairMove((param) => {
                if (!param.point || !param.time || param.point.x < 0 || param.point.y < 0) {
                    setTooltipData(null);
                    return;
                }
                const price = param.seriesData.get(series) as any;
                if (price) {
                    const firstPrice = filteredData[0].close ?? filteredData[0].value ?? 0;
                    const currentPrice = price.close ?? price.value ?? 0;
                    setTooltipData({
                        price: currentPrice,
                        date: param.time as string,
                        change: currentPrice - firstPrice,
                        changePercent: firstPrice !== 0 ? ((currentPrice - firstPrice) / firstPrice) * 100 : 0,
                    });
                }
            });
        } else {
            const series = chart.addSeries(AreaSeries, {
                lineColor,
                topColor: areaTopColor,
                bottomColor: areaBottomColor,
                lineWidth: 2,
            });
            // Transform data for area chart (needs 'value' field)
            const areaData = filteredData.map(d => ({
                time: d.time as Time,
                value: d.close ?? d.value ?? 0,
            }));
            series.setData(areaData);

            // Subscribe to crosshair move for tooltip
            chart.subscribeCrosshairMove((param) => {
                if (!param.point || !param.time || param.point.x < 0 || param.point.y < 0) {
                    setTooltipData(null);
                    return;
                }
                const price = param.seriesData.get(series) as any;
                if (price) {
                    const firstPrice = filteredData[0].close ?? filteredData[0].value ?? 0;
                    const currentPrice = price.value ?? 0;
                    setTooltipData({
                        price: currentPrice,
                        date: param.time as string,
                        change: currentPrice - firstPrice,
                        changePercent: firstPrice !== 0 ? ((currentPrice - firstPrice) / firstPrice) * 100 : 0,
                    });
                }
            });
        }

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
            chartRef.current = null;
        };
    }, [filteredData, backgroundColor, lineColor, textColor, areaTopColor, areaBottomColor, type, height]);

    const formatPrice = (price: number) => {
        if (price >= 1000) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (price >= 1) return `$${price.toFixed(2)}`;
        return `$${price.toFixed(4)}`;
    };

    const isPositive = periodStats ? periodStats.changePercent >= 0 : true;

    return (
        <div className="relative">
            {/* Header with stats and range selector */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                {/* Period stats */}
                {periodStats && (
                    <div className="flex items-center gap-4">
                        <div>
                            <span className="text-2xl font-bold font-mono text-white">
                                {formatPrice(periodStats.lastValue)}
                            </span>
                            <span className={`ml-3 text-sm font-mono font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isPositive ? '+' : ''}{periodStats.change.toFixed(2)} ({isPositive ? '+' : ''}{periodStats.changePercent.toFixed(2)}%)
                            </span>
                        </div>
                    </div>
                )}

                {/* Time range selector */}
                {showRangeSelector && (
                    <div className="flex items-center bg-[#0A0A15] rounded-lg p-1 border border-white/5">
                        {TIME_RANGES.map((range) => (
                            <button
                                key={range.label}
                                onClick={() => setSelectedRange(range.label)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                    selectedRange === range.label
                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                        : 'text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Hover tooltip */}
            {tooltipData && (
                <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-16 left-4 z-20 bg-[#0A0A15]/95 border border-white/10 rounded-lg px-3 py-2 backdrop-blur-sm pointer-events-none"
                >
                    <div className="text-xs text-gray-500 mb-1">{tooltipData.date}</div>
                    <div className="text-lg font-mono font-bold text-white">{formatPrice(tooltipData.price)}</div>
                    <div className={`text-xs font-mono font-semibold ${tooltipData.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {tooltipData.changePercent >= 0 ? '+' : ''}{tooltipData.change.toFixed(2)} ({tooltipData.changePercent >= 0 ? '+' : ''}{tooltipData.changePercent.toFixed(2)}%)
                    </div>
                </motion.div>
            )}

            {/* High/Low markers */}
            {periodStats && (
                <div className="absolute top-16 right-4 z-10 text-xs space-y-1 pointer-events-none">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-600">H:</span>
                        <span className="font-mono text-emerald-400">{formatPrice(periodStats.high)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-600">L:</span>
                        <span className="font-mono text-rose-400">{formatPrice(periodStats.low)}</span>
                    </div>
                </div>
            )}

            {/* Chart container */}
            <div
                ref={chartContainerRef}
                className="w-full"
                style={{ height: `${height}px` }}
            />

            {/* No data state */}
            {filteredData.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0A0A15]/80">
                    <div className="text-center">
                        <div className="text-4xl mb-2">📈</div>
                        <p className="text-gray-500">No data for selected period</p>
                    </div>
                </div>
            )}
        </div>
    );
};
