'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Loader2, AlertCircle, Gem } from 'lucide-react';

interface NAVData {
    project_id: number;
    nav_million: number | null;
    method: string;
    base_npv_million?: number;
    assumed_price?: number;
    current_price?: number;
    price_adjustment_factor?: number;
    irr_percent?: number;
    payback_years?: number;
    aisc_per_oz?: number;
    study_type?: string;
    mine_life_years?: number;
    sensitivity?: Record<string, { price: number; nav_million: number }>;
    message?: string;
    metal_prices_used?: Record<string, { price: number; currency: string }>;
}

export default function NavCard({ projectId }: { projectId: number }) {
    const [navData, setNavData] = useState<NAVData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchNAV() {
            try {
                const res = await fetch(`/api/projects/${projectId}/nav`);
                if (!res.ok) throw new Error('Failed to fetch NAV');
                const data = await res.json();
                setNavData(data);
            } catch (err) {
                setError('Could not load NAV data');
            } finally {
                setLoading(false);
            }
        }
        fetchNAV();
    }, [projectId]);

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-emerald-900/20 to-emerald-900/5 border border-emerald-500/20 rounded-2xl p-6">
                <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Calculating NAV...</span>
                </div>
            </div>
        );
    }

    if (error || !navData) {
        return (
            <div className="bg-[#0A0A15]/60 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-gray-500">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error || 'NAV unavailable'}</span>
                </div>
            </div>
        );
    }

    const hasData = navData.nav_million !== null && navData.method !== 'no_data';
    const goldPrice = navData.metal_prices_used?.gold?.price;

    if (!hasData) {
        return (
            <div className="bg-[#0A0A15]/60 border border-white/10 rounded-2xl p-6">
                <h3 className="flex items-center gap-2 font-bold text-white mb-3">
                    <span className="w-1 h-5 bg-emerald-500 rounded-full"></span>
                    Net Asset Value
                </h3>
                <p className="text-gray-500 text-sm">
                    NAV calculation requires technical report data (NPV, IRR, or mineral estimates).
                </p>
                {goldPrice && (
                    <p className="text-xs text-gray-600 mt-2">
                        Current Gold: ${goldPrice.toLocaleString()}/oz
                    </p>
                )}
            </div>
        );
    }

    const priceAdjustment = navData.price_adjustment_factor;
    const isPriceUp = priceAdjustment && priceAdjustment > 1;
    const isPriceDown = priceAdjustment && priceAdjustment < 1;

    return (
        <div className="bg-gradient-to-br from-emerald-900/20 to-emerald-900/5 border border-emerald-500/20 rounded-2xl p-6 space-y-4">
            {/* Header */}
            <h3 className="flex items-center gap-2 font-bold text-white">
                <span className="w-1 h-5 bg-emerald-500 rounded-full"></span>
                <Gem className="w-4 h-4 text-emerald-400" />
                Net Asset Value
            </h3>

            {/* Main NAV Figure */}
            <div className="text-center py-4">
                <p className="text-4xl font-bold font-mono text-emerald-400">
                    ${navData.nav_million?.toLocaleString()}M
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    {navData.method === 'dcf_adjusted' ? 'DCF Adjusted' : 'In-Situ Valuation'}
                    {navData.study_type && ` • ${navData.study_type}`}
                </p>
            </div>

            {/* Price Adjustment */}
            {navData.method === 'dcf_adjusted' && navData.assumed_price && navData.current_price && (
                <div className="bg-black/20 rounded-xl p-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Base NPV (at ${navData.assumed_price?.toLocaleString()})</span>
                        <span className="font-mono text-white">${navData.base_npv_million?.toLocaleString()}M</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-gray-400">Current Gold Price</span>
                        <span className={`font-mono flex items-center gap-1 ${isPriceUp ? 'text-emerald-400' : isPriceDown ? 'text-rose-400' : 'text-white'}`}>
                            {isPriceUp && <TrendingUp className="w-3 h-3" />}
                            {isPriceDown && <TrendingDown className="w-3 h-3" />}
                            ${navData.current_price?.toLocaleString()}
                        </span>
                    </div>
                </div>
            )}

            {/* Key Metrics */}
            {(navData.irr_percent || navData.payback_years || navData.aisc_per_oz) && (
                <div className="grid grid-cols-3 gap-2 text-center">
                    {navData.irr_percent && (
                        <div className="bg-black/20 rounded-lg py-2 px-1">
                            <p className="text-xs text-gray-500 uppercase">IRR</p>
                            <p className="font-mono font-bold text-white">{navData.irr_percent.toFixed(1)}%</p>
                        </div>
                    )}
                    {navData.payback_years && (
                        <div className="bg-black/20 rounded-lg py-2 px-1">
                            <p className="text-xs text-gray-500 uppercase">Payback</p>
                            <p className="font-mono font-bold text-white">{navData.payback_years.toFixed(1)}y</p>
                        </div>
                    )}
                    {navData.aisc_per_oz && (
                        <div className="bg-black/20 rounded-lg py-2 px-1">
                            <p className="text-xs text-gray-500 uppercase">AISC</p>
                            <p className="font-mono font-bold text-white">${navData.aisc_per_oz.toLocaleString()}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Sensitivity Table */}
            {navData.sensitivity && Object.keys(navData.sensitivity).length > 0 && (
                <div className="border-t border-emerald-500/10 pt-4">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Price Sensitivity</p>
                    <div className="flex justify-between text-xs">
                        {Object.entries(navData.sensitivity).map(([label, data]) => (
                            <div key={label} className="text-center">
                                <p className={`font-mono ${label === '0%' ? 'text-white font-bold' : 'text-gray-400'}`}>
                                    {label}
                                </p>
                                <p className="font-mono text-emerald-400">
                                    ${data.nav_million?.toLocaleString()}M
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer */}
            {goldPrice && (
                <p className="text-xs text-gray-600 text-center pt-2 border-t border-white/5">
                    Using live gold price: ${goldPrice.toLocaleString()}/oz
                </p>
            )}
        </div>
    );
}
