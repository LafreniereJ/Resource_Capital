'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'

interface RecentlyViewedProps {
    maxItems?: number
    showClearButton?: boolean
    className?: string
}

export function RecentlyViewed({ maxItems = 5, showClearButton = true, className = '' }: RecentlyViewedProps) {
    const { items, isLoaded, clearHistory, removeItem } = useRecentlyViewed()
    const [showConfirmClear, setShowConfirmClear] = useState(false)

    if (!isLoaded) {
        return (
            <div className={`glass-card p-6 ${className}`}>
                <div className="h-6 bg-neutral-800 rounded w-40 mb-4 animate-pulse"></div>
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 bg-neutral-800 rounded animate-pulse"></div>
                    ))}
                </div>
            </div>
        )
    }

    if (items.length === 0) {
        return (
            <div className={`glass-card p-6 ${className}`}>
                <h3 className="text-lg font-semibold text-white mb-4">Recently Viewed</h3>
                <div className="text-center py-8">
                    <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-neutral-400 text-sm">No recent activity</p>
                    <p className="text-neutral-500 text-xs mt-1">Your viewed items will appear here</p>
                </div>
            </div>
        )
    }

    const displayItems = items.slice(0, maxItems)

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 7) return `${diffDays}d ago`
        return date.toLocaleDateString()
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'company':
                return (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                )
            case 'project':
                return (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                )
            case 'news':
                return (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                )
            default:
                return null
        }
    }

    const handleClear = () => {
        if (showConfirmClear) {
            clearHistory()
            setShowConfirmClear(false)
        } else {
            setShowConfirmClear(true)
            setTimeout(() => setShowConfirmClear(false), 3000)
        }
    }

    return (
        <div className={`glass-card p-6 ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Recently Viewed</h3>
                {showClearButton && items.length > 0 && (
                    <button
                        onClick={handleClear}
                        className={`text-xs transition-colors ${
                            showConfirmClear
                                ? 'text-red-400 hover:text-red-300'
                                : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                    >
                        {showConfirmClear ? 'Click again to confirm' : 'Clear all'}
                    </button>
                )}
            </div>

            <div className="space-y-2">
                {displayItems.map((item) => (
                    <div
                        key={`${item.type}-${item.id}`}
                        className="group flex items-center gap-3 p-3 rounded-xl bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] transition-colors"
                    >
                        <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-400">
                            {getIcon(item.type)}
                        </div>

                        <Link href={item.url} className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate group-hover:text-[var(--color-accent)] transition-colors">
                                {item.title}
                            </p>
                            {item.subtitle && (
                                <p className="text-xs text-neutral-500 truncate">{item.subtitle}</p>
                            )}
                        </Link>

                        <div className="flex items-center gap-2">
                            <span className="text-xs text-neutral-500 whitespace-nowrap">
                                {formatTime(item.viewedAt)}
                            </span>
                            <button
                                onClick={(e) => {
                                    e.preventDefault()
                                    removeItem(item.type, item.id)
                                }}
                                className="p-1 text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {items.length > maxItems && (
                <Link
                    href="/profile"
                    className="block mt-4 text-center text-sm text-[var(--color-accent)] hover:underline"
                >
                    View all ({items.length} items)
                </Link>
            )}
        </div>
    )
}
