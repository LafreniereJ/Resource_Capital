'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface SystemHealthData {
    status: 'healthy' | 'degraded' | 'stale';
    lastStockUpdate: string | null;
    lastMetalUpdate: string | null;
    lastNewsUpdate: string | null;
}

interface SystemHealthProps {
    className?: string;
}

export default function SystemHealth({ className = '' }: SystemHealthProps) {
    const [health, setHealth] = useState<SystemHealthData | null>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchHealth() {
            try {
                const res = await fetch('/api/system-health');
                if (res.ok) {
                    const data = await res.json();
                    setHealth(data);
                }
            } catch (error) {
                console.error('Failed to fetch system health:', error);
                setHealth({
                    status: 'stale',
                    lastStockUpdate: null,
                    lastMetalUpdate: null,
                    lastNewsUpdate: null,
                });
            } finally {
                setLoading(false);
            }
        }

        fetchHealth();
        const interval = setInterval(fetchHealth, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    const formatTimeAgo = (dateStr: string | null) => {
        if (!dateStr) return 'Never';
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / (1000 * 60));
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours}h ago`;
            const diffDays = Math.floor(diffHours / 24);
            return `${diffDays}d ago`;
        } catch {
            return 'Unknown';
        }
    };

    const getStatusConfig = () => {
        if (loading || !health) {
            return {
                color: 'text-gray-500',
                bgColor: 'bg-gray-500/20',
                pulseColor: 'bg-gray-500',
                icon: Activity,
                label: 'Loading...',
            };
        }

        switch (health.status) {
            case 'healthy':
                return {
                    color: 'text-emerald-400',
                    bgColor: 'bg-emerald-400/20',
                    pulseColor: 'bg-emerald-400',
                    icon: CheckCircle,
                    label: 'Live',
                };
            case 'degraded':
                return {
                    color: 'text-amber-400',
                    bgColor: 'bg-amber-400/20',
                    pulseColor: 'bg-amber-400',
                    icon: AlertTriangle,
                    label: 'Delayed',
                };
            case 'stale':
            default:
                return {
                    color: 'text-rose-400',
                    bgColor: 'bg-rose-400/20',
                    pulseColor: 'bg-rose-400',
                    icon: XCircle,
                    label: 'Offline',
                };
        }
    };

    const config = getStatusConfig();
    const Icon = config.icon;

    return (
        <div
            className={`relative ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Main Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bgColor} cursor-help transition-colors`}>
                {/* Pulse dot */}
                <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.pulseColor} opacity-75`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${config.pulseColor}`}></span>
                </span>

                <span className={`text-xs font-semibold ${config.color}`}>
                    {config.label}
                </span>
            </div>

            {/* Tooltip */}
            <AnimatePresence>
                {isHovered && health && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        className="absolute top-full right-0 mt-2 w-56 z-50"
                    >
                        <div className="glass-card p-3 text-xs">
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
                                <Icon size={14} className={config.color} />
                                <span className="font-semibold text-white">System Status</span>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 flex items-center gap-1.5">
                                        <Clock size={10} />
                                        Stocks
                                    </span>
                                    <span className="text-gray-300 font-mono">
                                        {formatTimeAgo(health.lastStockUpdate)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 flex items-center gap-1.5">
                                        <Clock size={10} />
                                        Metals
                                    </span>
                                    <span className="text-gray-300 font-mono">
                                        {formatTimeAgo(health.lastMetalUpdate)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 flex items-center gap-1.5">
                                        <Clock size={10} />
                                        News
                                    </span>
                                    <span className="text-gray-300 font-mono">
                                        {formatTimeAgo(health.lastNewsUpdate)}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-white/5 text-gray-600 text-center">
                                Updates every 15 minutes
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
