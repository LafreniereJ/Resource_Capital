'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ErrorStateProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    className?: string;
    variant?: 'inline' | 'card' | 'fullPage';
}

/**
 * Inline error message for small components
 */
export function ErrorInline({
    message = 'Something went wrong',
    onRetry,
    className
}: Omit<ErrorStateProps, 'variant' | 'title'>) {
    return (
        <div className={cn('flex items-center gap-3 text-red-400', className)}>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{message}</span>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="text-sm text-red-300 hover:text-white underline underline-offset-2"
                >
                    Retry
                </button>
            )}
        </div>
    );
}

/**
 * Error card for sections/widgets
 */
export function ErrorCard({
    title = 'Error loading data',
    message = 'We couldn\'t load this content. Please try again.',
    onRetry,
    className
}: ErrorStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                'bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center',
                className
            )}
        >
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
            <p className="text-gray-400 text-sm mb-4">{message}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-300 text-sm font-medium transition-colors"
                >
                    Try Again
                </button>
            )}
        </motion.div>
    );
}

/**
 * Full page error state
 */
export function ErrorFullPage({
    title = 'Something went wrong',
    message = 'We\'re having trouble loading this page. Please try refreshing or come back later.',
    onRetry,
    className
}: ErrorStateProps) {
    return (
        <div className={cn(
            'min-h-[60vh] flex items-center justify-center px-6',
            className
        )}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center max-w-md"
            >
                {/* Error Icon */}
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full"></div>
                    <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20 flex items-center justify-center mx-auto">
                        <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-white mb-3">{title}</h1>
                <p className="text-gray-400 mb-6">{message}</p>

                <div className="flex items-center justify-center gap-3">
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="px-5 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-red-300 font-medium transition-colors"
                        >
                            Try Again
                        </button>
                    )}
                    <button
                        onClick={() => window.location.href = '/'}
                        className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 font-medium transition-colors"
                    >
                        Go Home
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

/**
 * API/Network error with status code
 */
export function ErrorAPI({
    statusCode,
    statusText,
    message,
    onRetry,
    className
}: {
    statusCode?: number;
    statusText?: string;
    message?: string;
    onRetry?: () => void;
    className?: string;
}) {
    const errorMessages: Record<number, string> = {
        400: 'The request was invalid. Please check your input.',
        401: 'You need to be logged in to access this.',
        403: 'You don\'t have permission to access this.',
        404: 'The requested resource could not be found.',
        429: 'Too many requests. Please wait a moment and try again.',
        500: 'Our servers are having issues. Please try again later.',
        502: 'Service temporarily unavailable. Please try again.',
        503: 'Service is under maintenance. Please check back soon.',
    };

    const displayMessage = message || (statusCode ? errorMessages[statusCode] : 'An unexpected error occurred.');

    return (
        <ErrorCard
            title={statusCode ? `Error ${statusCode}${statusText ? `: ${statusText}` : ''}` : 'Connection Error'}
            message={displayMessage}
            onRetry={onRetry}
            className={className}
        />
    );
}

/**
 * Data stale warning banner
 */
export function DataStaleWarning({
    lastUpdated,
    onRefresh,
    className
}: {
    lastUpdated?: Date | string;
    onRefresh?: () => void;
    className?: string;
}) {
    const formatTime = (date: Date | string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={cn(
            'flex items-center justify-between gap-4 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl',
            className
        )}>
            <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-amber-200">
                    <span className="font-medium">Data may be outdated.</span>
                    {lastUpdated && (
                        <span className="text-amber-300/70 ml-1">
                            Last updated at {formatTime(lastUpdated)}
                        </span>
                    )}
                </p>
            </div>
            {onRefresh && (
                <button
                    onClick={onRefresh}
                    className="text-sm text-amber-300 hover:text-white font-medium shrink-0"
                >
                    Refresh
                </button>
            )}
        </div>
    );
}

/**
 * Offline indicator
 */
export function OfflineIndicator({ className }: { className?: string }) {
    return (
        <div className={cn(
            'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gray-800 border border-gray-700 rounded-full shadow-lg flex items-center gap-2',
            className
        )}>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span className="text-sm text-gray-300">You&apos;re offline</span>
        </div>
    );
}
