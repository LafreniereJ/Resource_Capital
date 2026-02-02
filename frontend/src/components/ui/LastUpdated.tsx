'use client';

import { Clock, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

interface LastUpdatedProps {
    timestamp: string | Date | null | undefined;
    label?: string;
    showRelative?: boolean;
    showRefresh?: boolean;
    onRefresh?: () => void;
    className?: string;
}

/**
 * Formats a date to relative time (e.g., "2 minutes ago", "1 hour ago")
 */
function getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) {
        return 'just now';
    } else if (diffMins < 60) {
        return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    } else {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        });
    }
}

/**
 * Formats a date to absolute time (e.g., "Jan 20, 2026 at 3:45 PM")
 */
function getAbsoluteTime(date: Date): string {
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

/**
 * LastUpdated - Display when data was last updated
 *
 * Shows relative time by default with absolute time in tooltip.
 * Optionally includes a refresh button.
 */
export function LastUpdated({
    timestamp,
    label = 'Updated',
    showRelative = true,
    showRefresh = false,
    onRefresh,
    className = '',
}: LastUpdatedProps) {
    const [relativeTime, setRelativeTime] = useState<string>('');
    const [absoluteTime, setAbsoluteTime] = useState<string>('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        if (!timestamp) return;

        const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

        if (isNaN(date.getTime())) return;

        const updateTimes = () => {
            setRelativeTime(getRelativeTime(date));
            setAbsoluteTime(getAbsoluteTime(date));
        };

        updateTimes();

        // Update relative time every minute
        const interval = setInterval(updateTimes, 60000);
        return () => clearInterval(interval);
    }, [timestamp]);

    if (!timestamp) {
        return null;
    }

    const handleRefresh = async () => {
        if (!onRefresh || isRefreshing) return;
        setIsRefreshing(true);
        try {
            await onRefresh();
        } finally {
            setTimeout(() => setIsRefreshing(false), 1000);
        }
    };

    const displayTime = showRelative ? relativeTime : absoluteTime;

    return (
        <div
            className={`inline-flex items-center gap-1.5 text-xs text-gray-500 ${className}`}
            title={absoluteTime}
        >
            <Clock className="w-3 h-3" />
            <span>
                {label}: {displayTime}
            </span>
            {showRefresh && onRefresh && (
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="ml-1 p-1 hover:bg-white/5 rounded transition-colors disabled:opacity-50"
                    title="Refresh data"
                >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            )}
        </div>
    );
}

/**
 * DataFreshness - Shows data freshness status with color coding
 */
interface DataFreshnessProps {
    timestamp: string | Date | null | undefined;
    staleAfterMinutes?: number;
    oldAfterMinutes?: number;
    className?: string;
}

export function DataFreshness({
    timestamp,
    staleAfterMinutes = 15,
    oldAfterMinutes = 60,
    className = '',
}: DataFreshnessProps) {
    const [status, setStatus] = useState<'fresh' | 'stale' | 'old'>('fresh');
    const [relativeTime, setRelativeTime] = useState<string>('');

    useEffect(() => {
        if (!timestamp) return;

        const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
        if (isNaN(date.getTime())) return;

        const updateStatus = () => {
            const now = new Date();
            const diffMins = (now.getTime() - date.getTime()) / (1000 * 60);

            if (diffMins < staleAfterMinutes) {
                setStatus('fresh');
            } else if (diffMins < oldAfterMinutes) {
                setStatus('stale');
            } else {
                setStatus('old');
            }

            setRelativeTime(getRelativeTime(date));
        };

        updateStatus();
        const interval = setInterval(updateStatus, 60000);
        return () => clearInterval(interval);
    }, [timestamp, staleAfterMinutes, oldAfterMinutes]);

    if (!timestamp) return null;

    const statusColors = {
        fresh: 'text-emerald-400',
        stale: 'text-amber-400',
        old: 'text-gray-500',
    };

    const statusLabels = {
        fresh: 'Live',
        stale: 'Delayed',
        old: 'Outdated',
    };

    return (
        <div className={`inline-flex items-center gap-2 text-xs ${className}`}>
            <span className={`flex items-center gap-1 ${statusColors[status]}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                    status === 'fresh' ? 'bg-emerald-400 animate-pulse' :
                    status === 'stale' ? 'bg-amber-400' : 'bg-gray-500'
                }`} />
                {statusLabels[status]}
            </span>
            <span className="text-gray-600">
                {relativeTime}
            </span>
        </div>
    );
}

export default LastUpdated;
