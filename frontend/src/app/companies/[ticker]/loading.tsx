import { Skeleton, SkeletonChart, SkeletonCompanyHeader } from '@/components/ui/Skeleton';

export default function CompanyLoading() {
    return (
        <main className="min-h-screen bg-[var(--color-bg-base)] text-gray-200 font-sans overflow-x-hidden">
            {/* Premium Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 blur-[120px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/5 blur-[120px]"></div>
                <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] rounded-full bg-purple-600/3 blur-[100px]"></div>
            </div>

            <div className="relative z-10 px-6 md:px-12 py-8 max-w-7xl mx-auto">
                {/* Back Link */}
                <Skeleton className="h-4 w-40 mb-8" />

                {/* Company Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-10">
                    <SkeletonCompanyHeader />

                    {/* Price Card Skeleton */}
                    <div className="bg-[var(--color-bg-surface)]/60 border border-white/10 rounded-2xl p-6 min-w-[280px]">
                        <div className="flex items-baseline gap-3 mb-2">
                            <Skeleton className="h-10 w-28" />
                            <Skeleton className="h-6 w-20" />
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-[var(--color-bg-surface)]/60 border border-white/5 rounded-2xl p-5">
                            <Skeleton className="h-3 w-20 mb-3" />
                            <Skeleton className="h-7 w-24" />
                        </div>
                    ))}
                </div>

                {/* KPIs */}
                <div className="mb-10">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="bg-[var(--color-bg-surface)]/40 border border-white/5 rounded-xl p-4">
                                <Skeleton className="h-3 w-16 mb-2" />
                                <Skeleton className="h-6 w-20 mb-1" />
                                <Skeleton className="h-3 w-12" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-3 gap-6 mb-10">
                    {/* Chart - Takes 2 columns */}
                    <div className="lg:col-span-2">
                        <SkeletonChart height="h-[400px]" />
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Company Info */}
                        <div className="bg-[var(--color-bg-surface)]/60 border border-white/5 rounded-2xl p-5">
                            <Skeleton className="h-5 w-32 mb-4" />
                            <div className="space-y-3">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="flex justify-between">
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-4 w-24" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Mining Metrics */}
                        <div className="bg-[var(--color-bg-surface)]/60 border border-white/5 rounded-2xl p-5">
                            <Skeleton className="h-5 w-36 mb-4" />
                            <div className="space-y-3">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="flex justify-between">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-4 w-20" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Projects Section */}
                <div className="mb-10">
                    <Skeleton className="h-6 w-40 mb-4" />
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="bg-[var(--color-bg-surface)]/60 border border-white/5 rounded-2xl p-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <Skeleton className="w-10 h-10 rounded-lg" />
                                    <div>
                                        <Skeleton className="h-5 w-32 mb-1" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                </div>
                                <Skeleton className="h-4 w-full mb-2" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Insider Transactions */}
                <div className="mb-10">
                    <Skeleton className="h-6 w-48 mb-4" />
                    <div className="bg-[#0A0A15]/60 border border-white/5 rounded-2xl overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <th key={i} className="p-4 text-left">
                                            <Skeleton className="h-3 w-16" />
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="border-b border-white/5">
                                        {Array.from({ length: 5 }).map((_, j) => (
                                            <td key={j} className="p-4">
                                                <Skeleton className="h-4 w-20" />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}
