'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';

interface DashboardStats {
    users: {
        total: number;
        newToday: number;
        newThisWeek: number;
        activeToday: number;
    };
    subscriptions: {
        free: number;
        pro: number;
        institutional: number;
        totalMRR: number;
    };
    system: {
        cpuUsage: number;
        memoryUsage: number;
        dbConnections: number;
        lastPriceUpdate: string | null;
        lastNewsUpdate: string | null;
    };
    abuse: {
        totalTracked: number;
        currentlyBlocked: number;
        recentViolations: number;
    };
    data: {
        totalCompanies: number;
        totalProjects: number;
        totalNews: number;
        companiesWithPrices: number;
    };
}

interface RecentError {
    id: string;
    timestamp: string;
    type: string;
    message: string;
    endpoint?: string;
    userId?: string;
}

function StatCard({ title, value, subtitle, trend, icon }: {
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: { value: number; positive: boolean };
    icon: string;
}) {
    return (
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-slate-400 text-sm font-medium">{title}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                    {subtitle && (
                        <p className="text-slate-500 text-xs mt-1">{subtitle}</p>
                    )}
                    {trend && (
                        <p className={`text-xs mt-1 ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
                            {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}% vs last week
                        </p>
                    )}
                </div>
                <span className="text-2xl">{icon}</span>
            </div>
        </div>
    );
}

function SystemStatusIndicator({ label, status, value }: {
    label: string;
    status: 'good' | 'warning' | 'critical';
    value: string;
}) {
    const statusColors = {
        good: 'bg-green-500',
        warning: 'bg-yellow-500',
        critical: 'bg-red-500',
    };

    return (
        <div className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
            <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${statusColors[status]}`}></span>
                <span className="text-slate-300 text-sm">{label}</span>
            </div>
            <span className="text-slate-400 text-sm font-mono">{value}</span>
        </div>
    );
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [errors, setErrors] = useState<RecentError[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const toast = useToast();

    const fetchDashboardData = useCallback(async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        try {
            const res = await fetch('/api/admin/dashboard');
            if (!res.ok) throw new Error('Failed to fetch dashboard data');
            const data = await res.json();
            setStats(data.stats);
            setErrors(data.recentErrors || []);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchDashboardData();
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => fetchDashboardData(), 30000);
        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    if (loading) {
        return (
            <div className="animate-pulse space-y-6">
                <div className="h-8 bg-slate-700 rounded w-48"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-28 bg-slate-700 rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    // Default stats if API returns nothing
    const displayStats = stats || {
        users: { total: 0, newToday: 0, newThisWeek: 0, activeToday: 0 },
        subscriptions: { free: 0, pro: 0, institutional: 0, totalMRR: 0 },
        system: { cpuUsage: 0, memoryUsage: 0, dbConnections: 0, lastPriceUpdate: null, lastNewsUpdate: null },
        abuse: { totalTracked: 0, currentlyBlocked: 0, recentViolations: 0 },
        data: { totalCompanies: 0, totalProjects: 0, totalNews: 0, companiesWithPrices: 0 },
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                    <p className="text-slate-400 text-sm">Resource Capital Platform Overview</p>
                </div>
                <button
                    onClick={() => fetchDashboardData(true)}
                    disabled={refreshing}
                    className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                >
                    {refreshing ? (
                        <>
                            <span className="animate-spin">↻</span>
                            Refreshing...
                        </>
                    ) : (
                        <>↻ Refresh</>
                    )}
                </button>
            </div>

            {/* User Stats */}
            <section>
                <h2 className="text-lg font-semibold mb-4 text-slate-300">Users & Subscriptions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Users"
                        value={displayStats.users.total.toLocaleString()}
                        subtitle={`${displayStats.users.newToday} new today`}
                        icon="👥"
                    />
                    <StatCard
                        title="Active Today"
                        value={displayStats.users.activeToday}
                        subtitle="Logged in users"
                        icon="🟢"
                    />
                    <StatCard
                        title="Pro Subscribers"
                        value={displayStats.subscriptions.pro}
                        subtitle={`$${displayStats.subscriptions.pro * 29}/mo`}
                        icon="⭐"
                    />
                    <StatCard
                        title="Monthly Revenue"
                        value={`$${displayStats.subscriptions.totalMRR.toLocaleString()}`}
                        subtitle="MRR"
                        icon="💰"
                    />
                </div>
            </section>

            {/* Data Stats */}
            <section>
                <h2 className="text-lg font-semibold mb-4 text-slate-300">Data Coverage</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Companies"
                        value={displayStats.data.totalCompanies}
                        subtitle={`${displayStats.data.companiesWithPrices} with prices`}
                        icon="🏢"
                    />
                    <StatCard
                        title="Projects"
                        value={displayStats.data.totalProjects}
                        icon="⛏️"
                    />
                    <StatCard
                        title="News Articles"
                        value={displayStats.data.totalNews.toLocaleString()}
                        icon="📰"
                    />
                    <StatCard
                        title="Price Coverage"
                        value={`${Math.round((displayStats.data.companiesWithPrices / displayStats.data.totalCompanies) * 100) || 0}%`}
                        subtitle="Companies with live prices"
                        icon="📈"
                    />
                </div>
            </section>

            {/* System Status & Abuse Detection */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* System Status */}
                <section className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                    <h2 className="text-lg font-semibold mb-4">System Status</h2>
                    <div className="space-y-1">
                        <SystemStatusIndicator
                            label="CPU Usage"
                            status={displayStats.system.cpuUsage < 70 ? 'good' : displayStats.system.cpuUsage < 90 ? 'warning' : 'critical'}
                            value={`${displayStats.system.cpuUsage}%`}
                        />
                        <SystemStatusIndicator
                            label="Memory Usage"
                            status={displayStats.system.memoryUsage < 70 ? 'good' : displayStats.system.memoryUsage < 90 ? 'warning' : 'critical'}
                            value={`${displayStats.system.memoryUsage}%`}
                        />
                        <SystemStatusIndicator
                            label="DB Connections"
                            status={displayStats.system.dbConnections < 80 ? 'good' : 'warning'}
                            value={`${displayStats.system.dbConnections}/100`}
                        />
                        <SystemStatusIndicator
                            label="Last Price Update"
                            status={displayStats.system.lastPriceUpdate ? 'good' : 'warning'}
                            value={displayStats.system.lastPriceUpdate || 'Never'}
                        />
                        <SystemStatusIndicator
                            label="Last News Update"
                            status={displayStats.system.lastNewsUpdate ? 'good' : 'warning'}
                            value={displayStats.system.lastNewsUpdate || 'Never'}
                        />
                    </div>
                </section>

                {/* Abuse Detection */}
                <section className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                    <h2 className="text-lg font-semibold mb-4">Security & Rate Limiting</h2>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-slate-200">{displayStats.abuse.totalTracked}</div>
                            <div className="text-xs text-slate-400">IPs Tracked</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-400">{displayStats.abuse.currentlyBlocked}</div>
                            <div className="text-xs text-slate-400">Currently Blocked</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-400">{displayStats.abuse.recentViolations}</div>
                            <div className="text-xs text-slate-400">Recent Violations</div>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-slate-700">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Rate limit status</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                displayStats.abuse.currentlyBlocked === 0
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                                {displayStats.abuse.currentlyBlocked === 0 ? 'All Clear' : 'Active Blocks'}
                            </span>
                        </div>
                    </div>
                </section>
            </div>

            {/* Recent Errors */}
            <section className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Recent Errors</h2>
                    {errors.length > 0 && (
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                            {errors.length} errors
                        </span>
                    )}
                </div>
                {errors.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <span className="text-3xl mb-2 block">✓</span>
                        No recent errors
                    </div>
                ) : (
                    <div className="space-y-2">
                        {errors.slice(0, 5).map((error) => (
                            <div key={error.id} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg">
                                <span className="text-red-400">⚠</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs px-2 py-0.5 bg-slate-700 rounded font-mono">
                                            {error.type}
                                        </span>
                                        {error.endpoint && (
                                            <span className="text-xs text-slate-500">{error.endpoint}</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-300 mt-1 truncate">{error.message}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {new Date(error.timestamp).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Quick Actions */}
            <section className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => window.location.href = '/admin/queue'}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium"
                    >
                        📋 View Queue
                    </button>
                    <button
                        onClick={() => window.location.href = '/admin/data'}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium"
                    >
                        🔧 Data Overrides
                    </button>
                    <button
                        onClick={() => window.location.href = '/admin/users'}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium"
                    >
                        👥 Manage Users
                    </button>
                    <button
                        onClick={async () => {
                            try {
                                const res = await fetch('/api/admin/trigger-refresh', { method: 'POST' });
                                if (res.ok) {
                                    toast.success('Refresh triggered', 'Price update job started');
                                } else {
                                    throw new Error('Failed');
                                }
                            } catch {
                                toast.error('Failed to trigger refresh');
                            }
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium"
                    >
                        ↻ Trigger Price Refresh
                    </button>
                </div>
            </section>
        </div>
    );
}
