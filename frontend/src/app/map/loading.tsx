import { Skeleton, SkeletonFilters } from '@/components/ui/Skeleton';

export default function MapLoading() {
    return (
        <div className="min-h-screen bg-[var(--color-bg-base)] text-gray-200">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 blur-[120px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/5 blur-[120px]"></div>
            </div>

            <div className="relative z-10 h-screen flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/5 bg-[var(--color-bg-surface)]/80">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Skeleton className="w-10 h-10 rounded-xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-40" />
                                <Skeleton className="h-3 w-60" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-48 rounded-xl" />
                            <Skeleton className="h-10 w-32 rounded-xl" />
                            <Skeleton className="h-10 w-32 rounded-xl" />
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="px-6 py-3 border-b border-white/5 bg-[var(--color-bg-surface)]/60">
                    <SkeletonFilters count={8} />
                </div>

                {/* Map Container */}
                <div className="flex-1 relative">
                    <Skeleton className="absolute inset-0" />

                    {/* Map Controls Skeleton */}
                    <div className="absolute top-4 right-4 space-y-2">
                        <Skeleton className="w-8 h-8 rounded" />
                        <Skeleton className="w-8 h-16 rounded" />
                    </div>

                    {/* Scale Skeleton */}
                    <div className="absolute bottom-4 left-4">
                        <Skeleton className="h-4 w-24 rounded" />
                    </div>

                    {/* Stats Panel Skeleton */}
                    <div className="absolute bottom-4 right-4 bg-[var(--color-bg-surface)]/80 border border-white/10 rounded-xl p-4 w-64">
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-24" />
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-6 w-12" />
                                </div>
                                <div className="space-y-1">
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-6 w-12" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
