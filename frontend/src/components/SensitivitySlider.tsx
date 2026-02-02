'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sliders, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface SensitivityData {
    project_id: number;
    commodity: string;
    base_npv_million: number;
    assumed_price: number;
    sensitivity_factor: number;
    breakeven_price: number | null;
    data_points: Array<{ price: number; nav_million: number }>;
    error?: string;
}

interface Props {
    projectId: number;
    initialGoldPrice?: number;
    onNavChange?: (nav: number) => void;
}

export default function SensitivitySlider({ projectId, initialGoldPrice = 2000, onNavChange }: Props) {
    const [goldPrice, setGoldPrice] = useState(initialGoldPrice);
    const [sensitivityData, setSensitivityData] = useState<SensitivityData | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentNav, setCurrentNav] = useState<number | null>(null);

    // Fetch sensitivity data on mount
    useEffect(() => {
        async function fetchSensitivity() {
            try {
                const res = await fetch(`/api/projects/${projectId}/sensitivity?commodity=gold&steps=20`);
                if (res.ok) {
                    const data = await res.json();
                    setSensitivityData(data);
                    if (data.assumed_price) {
                        setGoldPrice(data.assumed_price);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch sensitivity:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchSensitivity();
    }, [projectId]);

    // Calculate NAV at current slider price
    useEffect(() => {
        if (!sensitivityData) return;

        const { base_npv_million, assumed_price, sensitivity_factor } = sensitivityData;
        if (!assumed_price || !base_npv_million) return;

        const priceChange = (goldPrice - assumed_price) / assumed_price;
        const adjustment = 1 + (sensitivity_factor * priceChange);
        const nav = base_npv_million * adjustment;

        setCurrentNav(nav);
        onNavChange?.(nav);
    }, [goldPrice, sensitivityData, onNavChange]);

    const resetPrice = () => {
        if (sensitivityData?.assumed_price) {
            setGoldPrice(sensitivityData.assumed_price);
        }
    };

    const priceChange = sensitivityData?.assumed_price
        ? ((goldPrice - sensitivityData.assumed_price) / sensitivityData.assumed_price) * 100
        : 0;

    if (loading) {
        return (
            <div className="bg-[#0A0A15]/60 border border-white/10 rounded-2xl p-6">
                <div className="animate-pulse flex items-center gap-2 text-gray-500">
                    <Sliders className="w-4 h-4" />
                    <span>Loading sensitivity data...</span>
                </div>
            </div>
        );
    }

    if (!sensitivityData || sensitivityData.error) {
        return (
            <div className="bg-[#0A0A15]/60 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-gray-500">
                    <Sliders className="w-4 h-4" />
                    <span>Sensitivity analysis requires project economics data</span>
                </div>
            </div>
        );
    }

    // Calculate chart data
    const minPrice = sensitivityData.assumed_price * 0.6;
    const maxPrice = sensitivityData.assumed_price * 1.4;

    return (
        <div className="bg-gradient-to-br from-purple-900/20 to-purple-900/5 border border-purple-500/20 rounded-2xl p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-bold text-white">
                    <span className="w-1 h-5 bg-purple-500 rounded-full"></span>
                    <Sliders className="w-4 h-4 text-purple-400" />
                    Commodity Sensitivity
                </h3>
                <button
                    onClick={resetPrice}
                    className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition"
                >
                    <RefreshCw className="w-3 h-3" />
                    Reset
                </button>
            </div>

            {/* Current NAV Display */}
            <div className="text-center bg-black/20 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase mb-1">NAV at ${goldPrice.toLocaleString()}/oz</p>
                <p className="text-3xl font-bold font-mono text-purple-400">
                    ${currentNav?.toLocaleString(undefined, { maximumFractionDigits: 1 })}M
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                    {priceChange !== 0 && (
                        <span className={`flex items-center gap-1 text-sm ${priceChange > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {priceChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}% from base
                        </span>
                    )}
                </div>
            </div>

            {/* Price Slider */}
            <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Gold Price</span>
                    <span className="font-mono text-amber-400 font-bold">${goldPrice.toLocaleString()}/oz</span>
                </div>

                <input
                    type="range"
                    min={minPrice}
                    max={maxPrice}
                    step={10}
                    value={goldPrice}
                    onChange={(e) => setGoldPrice(Number(e.target.value))}
                    className="w-full h-2 bg-black/30 rounded-lg appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-5
                        [&::-webkit-slider-thumb]:h-5
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-gradient-to-br
                        [&::-webkit-slider-thumb]:from-amber-400
                        [&::-webkit-slider-thumb]:to-amber-600
                        [&::-webkit-slider-thumb]:shadow-lg
                        [&::-webkit-slider-thumb]:cursor-grab
                        [&::-webkit-slider-thumb]:active:cursor-grabbing"
                />

                <div className="flex justify-between text-xs text-gray-600">
                    <span>${minPrice.toLocaleString()}</span>
                    <span className="text-amber-500">Base: ${sensitivityData.assumed_price?.toLocaleString()}</span>
                    <span>${maxPrice.toLocaleString()}</span>
                </div>
            </div>

            {/* Mini Sensitivity Chart */}
            <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase">NAV Response Curve</p>
                <div className="h-20 flex items-end gap-[2px]">
                    {sensitivityData.data_points?.map((point, i) => {
                        const maxNav = Math.max(...sensitivityData.data_points.map(p => p.nav_million));
                        const minNav = Math.min(...sensitivityData.data_points.map(p => p.nav_million));
                        const range = maxNav - minNav || 1;
                        const height = ((point.nav_million - minNav) / range) * 100;
                        const isActive = Math.abs(point.price - goldPrice) < (maxPrice - minPrice) / 20;

                        return (
                            <div
                                key={i}
                                className={`flex-1 rounded-t transition-all ${isActive
                                    ? 'bg-amber-400'
                                    : point.nav_million >= 0 ? 'bg-purple-500/50' : 'bg-rose-500/50'
                                    }`}
                                style={{ height: `${Math.max(height, 5)}%` }}
                                title={`$${point.price.toLocaleString()}: $${point.nav_million.toLocaleString()}M`}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Breakeven */}
            {sensitivityData.breakeven_price && (
                <div className="text-center text-sm border-t border-purple-500/10 pt-4">
                    <span className="text-gray-500">Breakeven: </span>
                    <span className="text-rose-400 font-mono font-bold">
                        ${sensitivityData.breakeven_price.toLocaleString()}/oz
                    </span>
                </div>
            )}
        </div>
    );
}
