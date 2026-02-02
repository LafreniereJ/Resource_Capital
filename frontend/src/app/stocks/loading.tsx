import { Skeleton, SkeletonStatsRow, SkeletonFilters, SkeletonTable } from '@/components/ui/Skeleton';

export default function StocksLoading() {
    return (
        <div className="min-h-screen bg-[var(--color-bg-base)] text-gray-200 font-sans overflow-x-hidden">
            {/* Premium Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 blur-[120px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/5 blur-[120px]"></div>
                <div className="absolute top-[30%] right-[20%] w-[30%] h-[30%] rounded-full bg-purple-600/3 blur-[100px]"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 px-6 max-w-[1800px] mx-auto py-8">
                {/* Hero Header Skeleton */}
                <div className="mb-12">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="space-y-4">
                            <Skeleton className="h-6 w-24 rounded-full" />
                            <Skeleton className="h-12 w-64" />
                            <Skeleton className="h-4 w-96 max-w-full" />
                        </div>
                        <Skeleton className="w-full md:w-96 h-12 rounded-xl" />
                    </div>
                </div>

                {/* Stats Row Skeleton */}
                <div className="mb-8">
                    <SkeletonStatsRow count={4} />
                </div>

                {/* Commodity Filters Skeleton */}
                <div className="mb-6">
                    <SkeletonFilters count={7} />
                </div>

                {/* Data Table Skeleton */}
                <SkeletonTable rows={15} columns={8} />
            </div>
        </div>
    );
}
