'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

/**
 * Generic empty state component
 */
export function EmptyState({
    icon,
    title,
    description,
    action,
    className
}: EmptyStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('text-center py-12', className)}
        >
            {icon && (
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                    {icon}
                </div>
            )}
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            {description && (
                <p className="text-gray-500 max-w-sm mx-auto mb-6">{description}</p>
            )}
            {action && (
                <button
                    onClick={action.onClick}
                    className="px-5 py-2.5 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 rounded-xl text-violet-300 font-medium transition-colors"
                >
                    {action.label}
                </button>
            )}
        </motion.div>
    );
}

/**
 * Empty search results
 */
export function EmptySearch({
    query,
    onClear,
    className
}: {
    query?: string;
    onClear?: () => void;
    className?: string;
}) {
    return (
        <EmptyState
            icon={
                <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            }
            title="No results found"
            description={query ? `No matches for "${query}". Try a different search term.` : 'Try adjusting your search or filters.'}
            action={onClear ? { label: 'Clear search', onClick: onClear } : undefined}
            className={className}
        />
    );
}

/**
 * Empty list/table
 */
export function EmptyList({
    itemType = 'items',
    action,
    className
}: {
    itemType?: string;
    action?: EmptyStateProps['action'];
    className?: string;
}) {
    return (
        <EmptyState
            icon={
                <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
            }
            title={`No ${itemType} yet`}
            description={`There are no ${itemType} to display at this time.`}
            action={action}
            className={className}
        />
    );
}

/**
 * Empty companies
 */
export function EmptyCompanies({
    onAdd,
    className
}: {
    onAdd?: () => void;
    className?: string;
}) {
    return (
        <EmptyState
            icon={<span className="text-2xl">🏢</span>}
            title="No Companies Found"
            description="Start adding companies to your watchlist to track their performance."
            action={onAdd ? { label: 'Add Company', onClick: onAdd } : undefined}
            className={className}
        />
    );
}

/**
 * Empty news
 */
export function EmptyNews({
    onRefresh,
    className
}: {
    onRefresh?: () => void;
    className?: string;
}) {
    return (
        <EmptyState
            icon={<span className="text-2xl">📰</span>}
            title="No News Available"
            description="There are no news articles matching your criteria. Try adjusting your filters."
            action={onRefresh ? { label: 'Refresh', onClick: onRefresh } : undefined}
            className={className}
        />
    );
}

/**
 * Empty transactions
 */
export function EmptyTransactions({
    onViewAll,
    className
}: {
    onViewAll?: () => void;
    className?: string;
}) {
    return (
        <EmptyState
            icon={<span className="text-2xl">💼</span>}
            title="No Transactions Found"
            description="No M&A activity matches your filters. Try expanding your search criteria."
            action={onViewAll ? { label: 'View All', onClick: onViewAll } : undefined}
            className={className}
        />
    );
}

/**
 * Empty projects
 */
export function EmptyProjects({
    className
}: {
    className?: string;
}) {
    return (
        <EmptyState
            icon={<span className="text-2xl">⛏️</span>}
            title="No Projects Found"
            description="This company doesn't have any tracked projects at this time."
            className={className}
        />
    );
}

/**
 * Empty watchlist
 */
export function EmptyWatchlist({
    onBrowse,
    className
}: {
    onBrowse?: () => void;
    className?: string;
}) {
    return (
        <EmptyState
            icon={<span className="text-2xl">⭐</span>}
            title="Your Watchlist is Empty"
            description="Add companies to your watchlist to track their stock prices and news."
            action={onBrowse ? { label: 'Browse Companies', onClick: onBrowse } : undefined}
            className={className}
        />
    );
}

/**
 * Empty comparison
 */
export function EmptyComparison({
    onSelect,
    className
}: {
    onSelect?: () => void;
    className?: string;
}) {
    return (
        <EmptyState
            icon={
                <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            }
            title="Select Items to Compare"
            description="Choose at least two companies or projects to see a side-by-side comparison."
            action={onSelect ? { label: 'Select Items', onClick: onSelect } : undefined}
            className={className}
        />
    );
}

/**
 * Empty map/no location data
 */
export function EmptyMap({
    className
}: {
    className?: string;
}) {
    return (
        <EmptyState
            icon={<span className="text-2xl">🗺️</span>}
            title="No Locations Available"
            description="There are no project locations with coordinates to display on the map."
            className={className}
        />
    );
}
