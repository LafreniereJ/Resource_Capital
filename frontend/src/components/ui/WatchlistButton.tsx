'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useWatchlist } from '@/hooks/useWatchlist'
import Link from 'next/link'

interface WatchlistButtonProps {
    company: {
        ticker: string
        name: string
        exchange: string
        commodity: string
    }
    size?: 'sm' | 'md' | 'lg'
    showLabel?: boolean
    className?: string
}

export function WatchlistButton({ company, size = 'md', showLabel = false, className = '' }: WatchlistButtonProps) {
    const { user } = useAuth()
    const { isCompanyWatched, toggleCompany, isLoaded } = useWatchlist()
    const [isWatched, setIsWatched] = useState(false)
    const [showTooltip, setShowTooltip] = useState(false)

    useEffect(() => {
        if (isLoaded) {
            setIsWatched(isCompanyWatched(company.ticker))
        }
    }, [isLoaded, isCompanyWatched, company.ticker])

    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12',
    }

    const iconSizes = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
    }

    if (!user) {
        return (
            <Link
                href="/login?redirect=/watchlist"
                className={`relative flex items-center gap-2 ${className}`}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                <button
                    className={`${sizeClasses[size]} rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors`}
                >
                    <svg
                        className={`${iconSizes[size]} text-neutral-500`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                    </svg>
                </button>
                {showLabel && <span className="text-neutral-400 text-sm">Sign in to save</span>}

                {showTooltip && !showLabel && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-neutral-800 text-white text-xs rounded-lg whitespace-nowrap shadow-lg z-10">
                        Sign in to use watchlist
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-800" />
                    </div>
                )}
            </Link>
        )
    }

    const handleClick = () => {
        const added = toggleCompany(company)
        setIsWatched(added)
    }

    return (
        <div
            className={`relative flex items-center gap-2 ${className}`}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <button
                onClick={handleClick}
                className={`${sizeClasses[size]} rounded-full ${
                    isWatched
                        ? 'bg-amber-500/20 hover:bg-amber-500/30'
                        : 'bg-neutral-800 hover:bg-neutral-700'
                } flex items-center justify-center transition-colors`}
                aria-label={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
            >
                <svg
                    className={`${iconSizes[size]} ${
                        isWatched ? 'text-amber-400' : 'text-neutral-500'
                    } transition-colors`}
                    fill={isWatched ? 'currentColor' : 'none'}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                </svg>
            </button>

            {showLabel && (
                <span className={`text-sm ${isWatched ? 'text-amber-400' : 'text-neutral-400'}`}>
                    {isWatched ? 'Watching' : 'Add to watchlist'}
                </span>
            )}

            {showTooltip && !showLabel && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-neutral-800 text-white text-xs rounded-lg whitespace-nowrap shadow-lg z-10">
                    {isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-800" />
                </div>
            )}
        </div>
    )
}
