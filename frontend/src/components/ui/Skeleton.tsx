'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
    className?: string;
}

/**
 * Base skeleton component with pulse animation
 */
export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                'animate-pulse rounded-md bg-white/5',
                className
            )}
        />
    );
}

/**
 * Text skeleton - simulates a line of text
 */
export function SkeletonText({ className, width = 'w-24' }: SkeletonProps & { width?: string }) {
    return <Skeleton className={cn('h-4', width, className)} />;
}

/**
 * Circle skeleton - for avatars, icons
 */
export function SkeletonCircle({ className, size = 'w-10 h-10' }: SkeletonProps & { size?: string }) {
    return <Skeleton className={cn('rounded-full', size, className)} />;
}

/**
 * Card skeleton - stat cards, info cards
 */
export function SkeletonCard({ className }: SkeletonProps) {
    return (
        <div className={cn('bg-[#0A0A15]/60 border border-white/5 rounded-2xl p-5', className)}>
            <div className="flex items-center gap-3 mb-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-7 w-24" />
        </div>
    );
}

/**
 * Table row skeleton
 */
export function SkeletonTableRow({ columns = 8 }: { columns?: number }) {
    return (
        <tr className="border-b border-white/5">
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="p-4">
                    <Skeleton className={cn('h-4', i === 0 ? 'w-16' : i === 1 ? 'w-32' : 'w-20')} />
                </td>
            ))}
        </tr>
    );
}

/**
 * Stats row skeleton - for dashboard stat cards
 */
export function SkeletonStatsRow({ count = 4 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}

/**
 * Filter pills skeleton
 */
export function SkeletonFilters({ count = 7 }: { count?: number }) {
    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-4">
            {Array.from({ length: count }).map((_, i) => (
                <Skeleton key={i} className={cn('h-10 rounded-xl shrink-0', i === 0 ? 'w-24' : 'w-20')} />
            ))}
        </div>
    );
}

/**
 * Full table skeleton
 */
export function SkeletonTable({ rows = 10, columns = 8 }: { rows?: number; columns?: number }) {
    return (
        <div className="bg-[#0A0A15]/60 border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                            {Array.from({ length: columns }).map((_, i) => (
                                <th key={i} className="p-4">
                                    <Skeleton className="h-3 w-16" />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {Array.from({ length: rows }).map((_, i) => (
                            <SkeletonTableRow key={i} columns={columns} />
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="p-4 border-t border-white/5 bg-white/[0.02] flex justify-between items-center">
                <Skeleton className="h-4 w-40" />
                <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="w-8 h-8 rounded-lg" />
                    ))}
                </div>
            </div>
        </div>
    );
}

/**
 * News card skeleton
 */
export function SkeletonNewsCard({ className }: SkeletonProps) {
    return (
        <div className={cn('bg-[#0A0A15]/60 border border-white/5 rounded-2xl p-5', className)}>
            <div className="flex gap-4">
                <Skeleton className="w-24 h-24 rounded-xl shrink-0" />
                <div className="flex-1 space-y-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-32" />
                </div>
            </div>
        </div>
    );
}

/**
 * Chart skeleton
 */
export function SkeletonChart({ className, height = 'h-[300px]' }: SkeletonProps & { height?: string }) {
    return (
        <div className={cn('bg-[#0A0A15]/60 border border-white/5 rounded-2xl p-5', className)}>
            <div className="flex justify-between items-center mb-4">
                <Skeleton className="h-5 w-32" />
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-16 rounded-lg" />
                    <Skeleton className="h-8 w-16 rounded-lg" />
                </div>
            </div>
            <Skeleton className={cn('w-full rounded-xl', height)} />
        </div>
    );
}

/**
 * Company header skeleton
 */
export function SkeletonCompanyHeader({ className }: SkeletonProps) {
    return (
        <div className={cn('space-y-4', className)}>
            <div className="flex items-center gap-4">
                <Skeleton className="w-16 h-16 rounded-xl" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>
            <div className="flex gap-3">
                <Skeleton className="h-10 w-24 rounded-xl" />
                <Skeleton className="h-10 w-24 rounded-xl" />
                <Skeleton className="h-10 w-24 rounded-xl" />
            </div>
        </div>
    );
}
