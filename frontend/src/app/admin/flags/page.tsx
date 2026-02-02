'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';

interface FeatureFlag {
    id: string;
    name: string;
    description: string;
    defaultEnabled: boolean;
    rolloutPercentage: number;
    enabledForTiers: string[];
    isDevelopment: boolean;
    isEnabled: boolean;
    hasOverride: boolean;
}

export default function AdminFlagsPage() {
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        fetchFlags();
    }, []);

    const fetchFlags = async () => {
        try {
            const res = await fetch('/api/admin/feature-flags');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setFlags(data.flags || []);
        } catch (err) {
            console.error('Error fetching flags:', err);
            toast.error('Failed to load feature flags');
        } finally {
            setLoading(false);
        }
    };

    const toggleFlag = async (flagId: string, currentEnabled: boolean) => {
        try {
            const res = await fetch('/api/admin/feature-flags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    flagId,
                    enabled: !currentEnabled,
                }),
            });

            if (res.ok) {
                toast.success('Flag updated', `${flagId} is now ${!currentEnabled ? 'enabled' : 'disabled'}`);
                fetchFlags();
            } else {
                throw new Error('Failed');
            }
        } catch {
            toast.error('Failed to update flag');
        }
    };

    const clearOverride = async (flagId: string) => {
        try {
            const res = await fetch('/api/admin/feature-flags', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ flagId }),
            });

            if (res.ok) {
                toast.success('Override cleared', 'Flag will use default behavior');
                fetchFlags();
            } else {
                throw new Error('Failed');
            }
        } catch {
            toast.error('Failed to clear override');
        }
    };

    const updateRollout = async (flagId: string, percentage: number) => {
        try {
            const res = await fetch('/api/admin/feature-flags/rollout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ flagId, percentage }),
            });

            if (res.ok) {
                toast.success('Rollout updated', `${flagId} now at ${percentage}%`);
                fetchFlags();
            } else {
                throw new Error('Failed');
            }
        } catch {
            toast.error('Failed to update rollout');
        }
    };

    if (loading) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-8 bg-slate-700 rounded w-48"></div>
                <div className="space-y-2">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-20 bg-slate-700 rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    const productionFlags = flags.filter(f => !f.isDevelopment);
    const developmentFlags = flags.filter(f => f.isDevelopment);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Feature Flags</h1>
                    <p className="text-slate-400 text-sm">Control feature rollouts and A/B tests</p>
                </div>
                <button
                    onClick={fetchFlags}
                    className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                    ↻ Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <div className="text-2xl font-bold">{flags.length}</div>
                    <div className="text-sm text-slate-400">Total Flags</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <div className="text-2xl font-bold text-green-400">
                        {flags.filter(f => f.isEnabled).length}
                    </div>
                    <div className="text-sm text-slate-400">Enabled</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <div className="text-2xl font-bold text-yellow-400">
                        {flags.filter(f => f.hasOverride).length}
                    </div>
                    <div className="text-sm text-slate-400">Overridden</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <div className="text-2xl font-bold text-purple-400">
                        {developmentFlags.length}
                    </div>
                    <div className="text-sm text-slate-400">In Development</div>
                </div>
            </div>

            {/* Production Flags */}
            <div className="bg-slate-800 rounded-xl border border-slate-700">
                <div className="p-4 border-b border-slate-700">
                    <h2 className="text-lg font-semibold">Production Flags</h2>
                    <p className="text-sm text-slate-400">Active features available to users</p>
                </div>
                <div className="divide-y divide-slate-700">
                    {productionFlags.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">No production flags</div>
                    ) : (
                        productionFlags.map((flag) => (
                            <FlagRow
                                key={flag.id}
                                flag={flag}
                                onToggle={() => toggleFlag(flag.id, flag.isEnabled)}
                                onClearOverride={() => clearOverride(flag.id)}
                                onUpdateRollout={(pct) => updateRollout(flag.id, pct)}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Development Flags */}
            <div className="bg-slate-800 rounded-xl border border-slate-700">
                <div className="p-4 border-b border-slate-700">
                    <h2 className="text-lg font-semibold">Development Flags</h2>
                    <p className="text-sm text-slate-400">Features in development (disabled in production)</p>
                </div>
                <div className="divide-y divide-slate-700">
                    {developmentFlags.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">No development flags</div>
                    ) : (
                        developmentFlags.map((flag) => (
                            <FlagRow
                                key={flag.id}
                                flag={flag}
                                onToggle={() => toggleFlag(flag.id, flag.isEnabled)}
                                onClearOverride={() => clearOverride(flag.id)}
                                onUpdateRollout={(pct) => updateRollout(flag.id, pct)}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function FlagRow({
    flag,
    onToggle,
    onClearOverride,
    onUpdateRollout,
}: {
    flag: FeatureFlag;
    onToggle: () => void;
    onClearOverride: () => void;
    onUpdateRollout: (pct: number) => void;
}) {
    const [showRollout, setShowRollout] = useState(false);
    const [rolloutValue, setRolloutValue] = useState(flag.rolloutPercentage);

    return (
        <div className="p-4 hover:bg-slate-700/30">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-medium">{flag.name}</span>
                        {flag.hasOverride && (
                            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                                Overridden
                            </span>
                        )}
                        {flag.isDevelopment && (
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                                Dev
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{flag.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span>ID: <code className="bg-slate-900 px-1 rounded">{flag.id}</code></span>
                        <span>Tiers: {flag.enabledForTiers.join(', ')}</span>
                        <span>Rollout: {flag.rolloutPercentage}%</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Rollout Slider */}
                    {showRollout ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={rolloutValue}
                                onChange={(e) => setRolloutValue(parseInt(e.target.value))}
                                className="w-24"
                            />
                            <span className="text-sm w-12">{rolloutValue}%</span>
                            <button
                                onClick={() => {
                                    onUpdateRollout(rolloutValue);
                                    setShowRollout(false);
                                }}
                                className="px-2 py-1 bg-green-600 rounded text-xs"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => setShowRollout(false)}
                                className="px-2 py-1 bg-slate-600 rounded text-xs"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowRollout(true)}
                            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs"
                        >
                            Rollout
                        </button>
                    )}

                    {/* Clear Override */}
                    {flag.hasOverride && (
                        <button
                            onClick={onClearOverride}
                            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs"
                        >
                            Clear
                        </button>
                    )}

                    {/* Toggle */}
                    <button
                        onClick={onToggle}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                            flag.isEnabled ? 'bg-green-600' : 'bg-slate-600'
                        }`}
                    >
                        <span
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                flag.isEnabled ? 'left-7' : 'left-1'
                            }`}
                        />
                    </button>
                </div>
            </div>
        </div>
    );
}
