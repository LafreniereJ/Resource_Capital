import { Skeleton, SkeletonFilters, SkeletonNewsCard } from '@/components/ui/Skeleton';

export default function NewsLoading() {
    return (
        <div className="min-h-screen bg-[var(--color-bg-base)] text-slate-200">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/5 blur-[150px] rounded-full" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 blur-[150px] rounded-full" />
            </div>

            {/* Header Skeleton */}
            <header className="relative z-20 border-b border-white/5">
                <div className="max-w-[1800px] mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <Skeleton className="w-14 h-14 rounded-2xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-8 w-48" />
                                <Skeleton className="h-4 w-64" />
                            </div>
                        </div>
                        <Skeleton className="hidden md:block w-80 h-12 rounded-2xl" />
                    </div>
                </div>
            </header>

            {/* Filter Bar Skeleton */}
            <div className="relative z-10 border-b border-white/5 bg-slate-950/50">
                <div className="max-w-[1800px] mx-auto px-6 py-4">
                    <SkeletonFilters count={10} />
                </div>
            </div>

            {/* Main Content */}
            <main className="relative z-10 max-w-[1800px] mx-auto px-6 py-10">
                {/* Featured Article Skeleton */}
                <div className="mb-12 rounded-3xl overflow-hidden bg-[var(--color-bg-surface)]/50 border border-white/5">
                    <div className="grid lg:grid-cols-2 gap-0">
                        <Skeleton className="h-64 lg:h-[400px]" />
                        <div className="p-8 lg:p-12 space-y-4">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-3/4" />
                            <Skeleton className="h-5 w-full" />
                            <Skeleton className="h-5 w-5/6" />
                            <div className="flex gap-2 pt-4">
                                <Skeleton className="h-8 w-20 rounded-lg" />
                                <Skeleton className="h-8 w-24 rounded-lg" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section Header */}
                <div className="flex items-center gap-3 mb-8">
                    <Skeleton className="w-6 h-6 rounded" />
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                </div>

                {/* News Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* Wide card */}
                    <div className="md:col-span-2 rounded-2xl overflow-hidden bg-[var(--color-bg-surface)]/30 border border-white/5">
                        <Skeleton className="h-56" />
                        <div className="p-5 space-y-3">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-full" />
                            <div className="flex gap-2 pt-4 border-t border-white/5">
                                <Skeleton className="h-6 w-16 rounded" />
                                <Skeleton className="h-6 w-20 rounded" />
                            </div>
                        </div>
                    </div>

                    {/* Regular cards */}
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-2xl overflow-hidden bg-[var(--color-bg-surface)]/30 border border-white/5">
                            <Skeleton className="h-40" />
                            <div className="p-5 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-3 w-12" />
                                </div>
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-2/3" />
                                <div className="flex gap-2 pt-3 border-t border-white/5">
                                    <Skeleton className="h-5 w-14 rounded" />
                                    <Skeleton className="h-5 w-16 rounded" />
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Text-only cards */}
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={`text-${i}`} className="rounded-xl bg-[var(--color-bg-surface)]/20 border border-white/5 p-4 space-y-2">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-2 w-16" />
                                <Skeleton className="h-2 w-12" />
                            </div>
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <div className="flex gap-1 pt-2 border-t border-white/5">
                                <Skeleton className="h-4 w-12 rounded" />
                                <Skeleton className="h-4 w-14 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
