'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'

interface WatchlistCompany {
    ticker: string
    name: string
    exchange: string
    commodity: string
    addedAt: string
}

interface WatchlistProject {
    id: number
    name: string
    companyTicker: string
    companyName: string
    commodity: string
    addedAt: string
}

interface CompanyData {
    ticker: string
    name: string
    exchange: string
    commodity: string
    current_price: number | null
    day_change_percent: number | null
}

export default function WatchlistPage() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()

    const [activeTab, setActiveTab] = useState<'companies' | 'projects'>('companies')
    const [watchlistCompanies, setWatchlistCompanies] = useState<WatchlistCompany[]>([])
    const [watchlistProjects, setWatchlistProjects] = useState<WatchlistProject[]>([])
    const [companyData, setCompanyData] = useState<Map<string, CompanyData>>(new Map())
    const [loading, setLoading] = useState(true)

    // Load watchlist from localStorage
    useEffect(() => {
        const storedCompanies = localStorage.getItem('rc_watchlist_companies')
        const storedProjects = localStorage.getItem('rc_watchlist_projects')

        if (storedCompanies) {
            try {
                setWatchlistCompanies(JSON.parse(storedCompanies))
            } catch {
                setWatchlistCompanies([])
            }
        }

        if (storedProjects) {
            try {
                setWatchlistProjects(JSON.parse(storedProjects))
            } catch {
                setWatchlistProjects([])
            }
        }

        setLoading(false)
    }, [])

    // Fetch current prices for watched companies
    useEffect(() => {
        if (watchlistCompanies.length === 0) return

        const fetchPrices = async () => {
            try {
                const response = await fetch('/api/companies')
                if (response.ok) {
                    const data = await response.json()
                    const dataMap = new Map<string, CompanyData>()
                    data.forEach((company: CompanyData) => {
                        dataMap.set(company.ticker, company)
                    })
                    setCompanyData(dataMap)
                }
            } catch (error) {
                console.error('Failed to fetch company data:', error)
            }
        }

        fetchPrices()
    }, [watchlistCompanies])

    const removeCompany = (ticker: string) => {
        const updated = watchlistCompanies.filter(c => c.ticker !== ticker)
        setWatchlistCompanies(updated)
        localStorage.setItem('rc_watchlist_companies', JSON.stringify(updated))
    }

    const removeProject = (id: number) => {
        const updated = watchlistProjects.filter(p => p.id !== id)
        setWatchlistProjects(updated)
        localStorage.setItem('rc_watchlist_projects', JSON.stringify(updated))
    }

    const formatPrice = (price: number | null) => {
        if (price === null) return '-'
        return `$${price.toFixed(2)}`
    }

    const formatChange = (change: number | null) => {
        if (change === null) return '-'
        const sign = change >= 0 ? '+' : ''
        return `${sign}${change.toFixed(2)}%`
    }

    if (authLoading) {
        return (
            <main className="min-h-screen pt-20 px-4 md:px-8 pb-12">
                <div className="max-w-6xl mx-auto">
                    <div className="animate-pulse">
                        <div className="h-8 bg-neutral-800 rounded w-48 mb-4"></div>
                        <div className="h-4 bg-neutral-800 rounded w-64 mb-8"></div>
                        <div className="glass-card p-6">
                            <div className="h-64 bg-neutral-800 rounded"></div>
                        </div>
                    </div>
                </div>
            </main>
        )
    }

    if (!user) {
        return (
            <main className="min-h-screen pt-20 px-4 md:px-8 pb-12">
                <div className="max-w-6xl mx-auto">
                    <div className="glass-card p-12 text-center">
                        <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Sign in to use Watchlist</h1>
                        <p className="text-neutral-400 mb-6">Track your favorite companies and projects</p>
                        <Link href="/login?redirect=/watchlist" className="btn-primary">
                            Sign In
                        </Link>
                    </div>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen pt-20 px-4 md:px-8 pb-12">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2 text-white">Watchlist</h1>
                    <p className="text-[var(--color-text-secondary)]">
                        Track your favorite companies and projects
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('companies')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            activeTab === 'companies'
                                ? 'bg-[var(--color-accent)] text-white'
                                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                        }`}
                    >
                        Companies ({watchlistCompanies.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('projects')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            activeTab === 'projects'
                                ? 'bg-[var(--color-accent)] text-white'
                                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                        }`}
                    >
                        Projects ({watchlistProjects.length})
                    </button>
                </div>

                {/* Companies Tab */}
                {activeTab === 'companies' && (
                    <div className="glass-card overflow-hidden">
                        {watchlistCompanies.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">No companies yet</h3>
                                <p className="text-neutral-400 mb-6">Start adding companies to track their performance</p>
                                <Link href="/stocks" className="btn-primary">
                                    Browse Stocks
                                </Link>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-neutral-800/50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-sm font-medium text-neutral-400">Company</th>
                                            <th className="px-6 py-4 text-left text-sm font-medium text-neutral-400">Exchange</th>
                                            <th className="px-6 py-4 text-left text-sm font-medium text-neutral-400">Commodity</th>
                                            <th className="px-6 py-4 text-right text-sm font-medium text-neutral-400">Price</th>
                                            <th className="px-6 py-4 text-right text-sm font-medium text-neutral-400">Change</th>
                                            <th className="px-6 py-4 text-right text-sm font-medium text-neutral-400"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-800">
                                        {watchlistCompanies.map((company) => {
                                            const data = companyData.get(company.ticker)
                                            const changePercent = data?.day_change_percent ?? null

                                            return (
                                                <tr key={company.ticker} className="hover:bg-neutral-800/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <Link href={`/companies/${company.ticker}`} className="group">
                                                            <p className="font-medium text-white group-hover:text-[var(--color-accent)] transition-colors">
                                                                {company.ticker}
                                                            </p>
                                                            <p className="text-sm text-neutral-400 truncate max-w-xs">
                                                                {company.name}
                                                            </p>
                                                        </Link>
                                                    </td>
                                                    <td className="px-6 py-4 text-neutral-300">
                                                        {company.exchange}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2 py-1 text-xs rounded-full bg-neutral-800 text-neutral-300">
                                                            {company.commodity}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono text-white">
                                                        {formatPrice(data?.current_price ?? null)}
                                                    </td>
                                                    <td className={`px-6 py-4 text-right font-mono ${
                                                        changePercent === null ? 'text-neutral-400' :
                                                        changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                                                    }`}>
                                                        {formatChange(changePercent)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => removeCompany(company.ticker)}
                                                            className="p-2 text-neutral-500 hover:text-red-400 transition-colors"
                                                            title="Remove from watchlist"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Projects Tab */}
                {activeTab === 'projects' && (
                    <div className="glass-card overflow-hidden">
                        {watchlistProjects.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
                                <p className="text-neutral-400 mb-6">Explore mining projects and add them to your watchlist</p>
                                <Link href="/map" className="btn-primary">
                                    Explore Map
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y divide-neutral-800">
                                {watchlistProjects.map((project) => (
                                    <div key={project.id} className="p-6 hover:bg-neutral-800/30 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <Link
                                                    href={`/companies/${project.companyTicker}/projects/${project.id}`}
                                                    className="group"
                                                >
                                                    <h3 className="font-medium text-white group-hover:text-[var(--color-accent)] transition-colors">
                                                        {project.name}
                                                    </h3>
                                                </Link>
                                                <p className="text-sm text-neutral-400 mt-1">
                                                    <Link
                                                        href={`/companies/${project.companyTicker}`}
                                                        className="hover:text-[var(--color-accent)]"
                                                    >
                                                        {project.companyName}
                                                    </Link>
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="px-2 py-1 text-xs rounded-full bg-neutral-800 text-neutral-300">
                                                    {project.commodity}
                                                </span>
                                                <button
                                                    onClick={() => removeProject(project.id)}
                                                    className="p-2 text-neutral-500 hover:text-red-400 transition-colors"
                                                    title="Remove from watchlist"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Add to Watchlist Info */}
                <div className="mt-8 p-4 rounded-xl bg-neutral-800/50 border border-neutral-700">
                    <h3 className="font-medium text-white mb-2">How to add items to your watchlist</h3>
                    <ul className="text-sm text-neutral-400 space-y-1">
                        <li>• Visit a company page and click the star icon to add it to your watchlist</li>
                        <li>• Visit a project page and click &quot;Add to Watchlist&quot;</li>
                        <li>• Use the compare tool to quickly add multiple companies</li>
                    </ul>
                </div>
            </div>
        </main>
    )
}
