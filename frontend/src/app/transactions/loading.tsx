import { Skeleton, SkeletonFilters } from '@/components/ui/Skeleton';

export default function TransactionsLoading() {
    return (
        <div className="min-h-screen bg-[var(--color-bg-base)] text-gray-200 font-sans overflow-x-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-[120px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[120px]"></div>
            </div>

            <div className="relative z-10 px-6 max-w-7xl mx-auto py-8">
                {/* Header */}
                <div className="mb-8 space-y-4">
                    <Skeleton className="h-6 w-28 rounded-full" />
                    <Skeleton className="h-10 w-56" />
                    <Skeleton className="h-4 w-96 max-w-full" />
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-[var(--color-bg-surface)]/60 border border-white/5 rounded-2xl p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <Skeleton className="w-10 h-10 rounded-lg" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                            <Skeleton className="h-7 w-24" />
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="mb-6 flex flex-wrap gap-3">
                    <Skeleton className="h-10 w-48 rounded-xl" />
                    <Skeleton className="h-10 w-36 rounded-xl" />
                    <Skeleton className="h-10 w-40 rounded-xl" />
                </div>

                {/* Transaction Cards */}
                <div className="space-y-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div
                            key={i}
                            className="bg-[var(--color-bg-surface)]/60 border border-white/5 rounded-2xl p-6"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                {/* Left - Companies */}
                                <div className="flex items-center gap-4">
                                    <div className="space-y-2">
                                        <Skeleton className="h-5 w-40" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                    <Skeleton className="w-8 h-8 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-5 w-36" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                </div>

                                {/* Right - Deal Info */}
                                <div className="flex items-center gap-6">
                                    <div className="space-y-1 text-right">
                                        <Skeleton className="h-3 w-16 ml-auto" />
                                        <Skeleton className="h-6 w-24 ml-auto" />
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <Skeleton className="h-3 w-12 ml-auto" />
                                        <Skeleton className="h-5 w-20 ml-auto" />
                                    </div>
                                    <Skeleton className="h-8 w-24 rounded-lg" />
                                </div>
                            </div>

                            {/* Bottom - Tags */}
                            <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                                <Skeleton className="h-6 w-16 rounded-lg" />
                                <Skeleton className="h-6 w-20 rounded-lg" />
                                <Skeleton className="h-6 w-24 rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
