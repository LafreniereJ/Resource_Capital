import { Skeleton } from '@/components/ui/Skeleton';

export default function CompareLoading() {
    return (
        <div className="min-h-screen bg-[#050510] text-gray-200 font-sans overflow-x-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 blur-[120px]"></div>
            </div>

            <div className="relative z-10 px-6 max-w-7xl mx-auto py-8">
                {/* Header */}
                <div className="mb-8 space-y-4">
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-4 w-96 max-w-full" />
                </div>

                {/* Search Box */}
                <div className="mb-8">
                    <Skeleton className="h-14 w-full max-w-xl rounded-2xl" />
                </div>

                {/* Selection Pills */}
                <div className="mb-8">
                    <div className="flex flex-wrap gap-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-48 rounded-xl" />
                        ))}
                        <Skeleton className="h-12 w-36 rounded-xl" />
                    </div>
                </div>

                {/* Compare Button */}
                <div className="mb-10">
                    <Skeleton className="h-12 w-48 rounded-xl" />
                </div>

                {/* Comparison Table Skeleton */}
                <div className="bg-[#0A0A15]/60 border border-white/10 rounded-2xl overflow-hidden">
                    {/* Header Row */}
                    <div className="grid grid-cols-4 border-b border-white/5 bg-white/[0.02]">
                        <div className="p-4 border-r border-white/5">
                            <Skeleton className="h-5 w-20" />
                        </div>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="p-4 border-r border-white/5 last:border-r-0">
                                <div className="space-y-2">
                                    <Skeleton className="h-5 w-32" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Data Rows */}
                    {Array.from({ length: 8 }).map((_, rowIdx) => (
                        <div key={rowIdx} className="grid grid-cols-4 border-b border-white/5 last:border-b-0">
                            <div className="p-4 border-r border-white/5 bg-white/[0.01]">
                                <Skeleton className="h-4 w-24" />
                            </div>
                            {Array.from({ length: 3 }).map((_, colIdx) => (
                                <div key={colIdx} className="p-4 border-r border-white/5 last:border-r-0">
                                    <Skeleton className="h-5 w-20" />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
