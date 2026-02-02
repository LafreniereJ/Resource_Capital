'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';

interface SystemHealth {
    status: 'healthy' | 'degraded' | 'down';
    uptime: string;
    version: string;
    components: {
        name: string;
        status: 'up' | 'degraded' | 'down';
        latency: number;
        lastCheck: string;
        details?: string;
    }[];
    jobs: {
        name: string;
        lastRun: string | null;
        nextRun: string | null;
        status: 'success' | 'failed' | 'running' | 'scheduled';
        duration?: number;
        error?: string;
    }[];
    metrics: {
        requestsPerMinute: number;
        errorRate: number;
        avgResponseTime: number;
        activeConnections: number;
    };
}

interface LogEntry {
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    source: string;
}

function StatusBadge({ status }: { status: 'up' | 'down' | 'degraded' | 'healthy' | 'success' | 'failed' | 'running' | 'scheduled' }) {
    const styles = {
        up: 'bg-green-500/20 text-green-400',
        healthy: 'bg-green-500/20 text-green-400',
        success: 'bg-green-500/20 text-green-400',
        running: 'bg-blue-500/20 text-blue-400',
        scheduled: 'bg-slate-500/20 text-slate-400',
        degraded: 'bg-yellow-500/20 text-yellow-400',
        down: 'bg-red-500/20 text-red-400',
        failed: 'bg-red-500/20 text-red-400',
    };

    return (
        <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${styles[status]}`}>
            {status}
        </span>
    );
}

export default function AdminSystemPage() {
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
    const toast = useToast();

    const fetchHealth = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/system-health');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setHealth(data.health);
            setLogs(data.logs || []);
        } catch (err) {
            console.error('Health check error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 15000); // Refresh every 15s
        return () => clearInterval(interval);
    }, [fetchHealth]);

    const runJob = async (jobName: string) => {
        try {
            toast.info('Job started', `Running ${jobName}...`);
            const res = await fetch('/api/admin/run-job', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobName }),
            });

            if (res.ok) {
                toast.success('Job completed', `${jobName} finished successfully`);
                fetchHealth();
            } else {
                throw new Error('Job failed');
            }
        } catch {
            toast.error('Job failed', `${jobName} encountered an error`);
        }
    };

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    };

    const formatTimeAgo = (dateStr: string | null) => {
        if (!dateStr) return 'Never';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-8 bg-slate-700 rounded w-48"></div>
                <div className="grid grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-24 bg-slate-700 rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    // Default health if API returns nothing
    const displayHealth = health || {
        status: 'healthy' as const,
        uptime: '0d 0h 0m',
        version: '1.0.0',
        components: [],
        jobs: [],
        metrics: { requestsPerMinute: 0, errorRate: 0, avgResponseTime: 0, activeConnections: 0 },
    };

    const filteredLogs = logs.filter(log =>
        logFilter === 'all' || log.level === logFilter
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">System Health</h1>
                    <p className="text-slate-400 text-sm">Monitoring and job management</p>
                </div>
                <div className="flex items-center gap-4">
                    <StatusBadge status={displayHealth.status} />
                    <button
                        onClick={fetchHealth}
                        className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                        ↻ Refresh
                    </button>
                </div>
            </div>

            {/* Overview Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                    <div className="text-slate-400 text-sm">Uptime</div>
                    <div className="text-2xl font-bold mt-1">{displayHealth.uptime}</div>
                </div>
                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                    <div className="text-slate-400 text-sm">Requests/min</div>
                    <div className="text-2xl font-bold mt-1">{displayHealth.metrics.requestsPerMinute}</div>
                </div>
                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                    <div className="text-slate-400 text-sm">Error Rate</div>
                    <div className={`text-2xl font-bold mt-1 ${
                        displayHealth.metrics.errorRate > 5 ? 'text-red-400' :
                        displayHealth.metrics.errorRate > 1 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                        {displayHealth.metrics.errorRate.toFixed(2)}%
                    </div>
                </div>
                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                    <div className="text-slate-400 text-sm">Avg Response</div>
                    <div className="text-2xl font-bold mt-1">{displayHealth.metrics.avgResponseTime}ms</div>
                </div>
            </div>

            {/* Components Status */}
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                <h2 className="text-lg font-semibold mb-4">Components</h2>
                <div className="space-y-3">
                    {displayHealth.components.length === 0 ? (
                        <div className="text-slate-400 text-center py-4">No component data available</div>
                    ) : (
                        displayHealth.components.map((component) => (
                            <div key={component.name} className="flex items-center justify-between py-3 border-b border-slate-700 last:border-0">
                                <div className="flex items-center gap-3">
                                    <span className={`w-2 h-2 rounded-full ${
                                        component.status === 'up' ? 'bg-green-500' :
                                        component.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}></span>
                                    <div>
                                        <div className="font-medium">{component.name}</div>
                                        {component.details && (
                                            <div className="text-xs text-slate-400">{component.details}</div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-400">
                                    <span>{component.latency}ms</span>
                                    <span>{formatTimeAgo(component.lastCheck)}</span>
                                    <StatusBadge status={component.status} />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Background Jobs */}
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                <h2 className="text-lg font-semibold mb-4">Background Jobs</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-700">
                                <th className="text-left py-3 text-slate-400 font-medium text-sm">Job</th>
                                <th className="text-left py-3 text-slate-400 font-medium text-sm">Status</th>
                                <th className="text-left py-3 text-slate-400 font-medium text-sm">Last Run</th>
                                <th className="text-left py-3 text-slate-400 font-medium text-sm">Duration</th>
                                <th className="text-left py-3 text-slate-400 font-medium text-sm">Next Run</th>
                                <th className="text-right py-3 text-slate-400 font-medium text-sm">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {displayHealth.jobs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-slate-400">
                                        No jobs configured
                                    </td>
                                </tr>
                            ) : (
                                displayHealth.jobs.map((job) => (
                                    <tr key={job.name}>
                                        <td className="py-3">
                                            <div className="font-medium">{job.name}</div>
                                            {job.error && (
                                                <div className="text-xs text-red-400 mt-1">{job.error}</div>
                                            )}
                                        </td>
                                        <td className="py-3">
                                            <StatusBadge status={job.status} />
                                        </td>
                                        <td className="py-3 text-sm text-slate-400">
                                            {formatTimeAgo(job.lastRun)}
                                        </td>
                                        <td className="py-3 text-sm text-slate-400">
                                            {job.duration ? formatDuration(job.duration) : '-'}
                                        </td>
                                        <td className="py-3 text-sm text-slate-400">
                                            {job.nextRun ? formatTimeAgo(job.nextRun) : '-'}
                                        </td>
                                        <td className="py-3 text-right">
                                            <button
                                                onClick={() => runJob(job.name)}
                                                disabled={job.status === 'running'}
                                                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs font-medium disabled:opacity-50"
                                            >
                                                Run Now
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Logs */}
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Recent Logs</h2>
                    <select
                        value={logFilter}
                        onChange={(e) => setLogFilter(e.target.value as any)}
                        className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-sm focus:outline-none focus:border-blue-500"
                    >
                        <option value="all">All Levels</option>
                        <option value="error">Errors</option>
                        <option value="warn">Warnings</option>
                        <option value="info">Info</option>
                    </select>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredLogs.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">No logs available</div>
                    ) : (
                        filteredLogs.map((log, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded text-sm font-mono">
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                    log.level === 'error' ? 'bg-red-500/20 text-red-400' :
                                    log.level === 'warn' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-blue-500/20 text-blue-400'
                                }`}>
                                    {log.level.toUpperCase()}
                                </span>
                                <span className="text-slate-500 text-xs">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                <span className="text-slate-400 text-xs">[{log.source}]</span>
                                <span className="flex-1 text-slate-200">{log.message}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
