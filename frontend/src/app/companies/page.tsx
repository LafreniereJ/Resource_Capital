import { getCompanies } from '@/lib/db';
import Link from 'next/link';
import { companiesMetadata } from '@/lib/metadata';

export const metadata = companiesMetadata;

export default async function CompaniesIndex() {
    const companies = await getCompanies() as any[];

    return (
        <main className="min-h-screen bg-[var(--color-bg-base)] text-gray-200 font-sans overflow-x-hidden selection:bg-[var(--color-accent-muted)]">
            {/* Premium Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/8 blur-[150px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 blur-[120px]"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
            </div>

            <div className="relative z-10 px-6 md:px-12 py-8 max-w-7xl mx-auto">
                {/* Back Link */}
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-violet-400 mb-8 transition">
                    ← Dashboard
                </Link>

                {/* Page Header */}
                <div className="mb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 mb-4">
                        <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></span>
                        <span className="text-xs font-medium text-violet-300 uppercase tracking-widest">Portfolio</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-600">
                        Tracked Companies
                    </h1>
                    <p className="text-gray-500 max-w-lg">
                        Browse all {companies.length} mining companies in your watchlist.
                    </p>
                </div>

                {/* Company Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {companies.map((co) => (
                        <Link key={co.id} href={`/companies/${co.ticker}`} className="block group">
                            <div className="relative bg-[#0A0A15]/60 border border-white/5 rounded-2xl p-6 backdrop-blur-sm transition-all hover:border-violet-500/30 hover:bg-[#0A0A15]/80">
                                {/* Glow effect on hover */}
                                <div className="absolute inset-0 bg-violet-500/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none"></div>

                                <div className="relative">
                                    <div className="flex justify-between items-start mb-4">
                                        {/* Company Icon */}
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-cyan-500 blur-lg opacity-20 group-hover:opacity-40 transition"></div>
                                            <div className="relative w-14 h-14 bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-white/10 rounded-xl flex items-center justify-center text-xl font-bold text-white group-hover:border-violet-500/30 transition">
                                                {co.ticker[0]}
                                            </div>
                                        </div>
                                        <span className="bg-white/5 text-xs px-2.5 py-1 rounded-lg text-gray-500 font-mono border border-white/5">{co.exchange}</span>
                                    </div>

                                    {/* Company Info */}
                                    <h2 className="text-lg font-bold text-white mb-1 group-hover:text-violet-300 transition line-clamp-1">
                                        {co.name}
                                    </h2>
                                    <p className="text-sm text-violet-400 font-mono mb-4">{co.ticker}</p>

                                    {/* Stats */}
                                    <div className="flex justify-between items-end border-t border-white/5 pt-4">
                                        <div>
                                            <p className="text-xs text-gray-600 uppercase font-bold tracking-wider mb-1">Price</p>
                                            <p className="font-mono text-white font-semibold">
                                                ${co.current_price?.toFixed(2) || '-.--'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-600 uppercase font-bold tracking-wider mb-1">Mkt Cap</p>
                                            <p className="font-mono text-white font-semibold">
                                                {co.market_cap ? `$${(co.market_cap / 1e9).toFixed(1)}B` : '-'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs text-gray-500 group-hover:text-violet-400 transition">
                                                View →
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {companies.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">📊</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Companies Found</h3>
                        <p className="text-gray-500">Start adding companies to your watchlist.</p>
                    </div>
                )}
            </div>
        </main>
    );
}
