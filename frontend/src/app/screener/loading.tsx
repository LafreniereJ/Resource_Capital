export default function ScreenerLoading() {
    return (
        <div className="min-h-screen bg-[var(--color-bg-base)] text-gray-200 font-sans">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 blur-[120px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/5 blur-[120px]"></div>
            </div>

            <div className="relative z-10 px-4 md:px-6 max-w-[1800px] mx-auto py-8">
                {/* Header Skeleton */}
                <div className="mb-8 animate-pulse">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div>
                            <div className="h-6 w-40 bg-[var(--color-bg-surface)]/50 rounded-full mb-4"></div>
                            <div className="h-10 w-64 bg-[var(--color-bg-surface)]/50 rounded-lg mb-2"></div>
                            <div className="h-4 w-48 bg-[var(--color-bg-surface)]/30 rounded"></div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-24 bg-[var(--color-bg-surface)]/50 rounded-xl"></div>
                            <div className="h-10 w-28 bg-[var(--color-bg-surface)]/50 rounded-xl"></div>
                            <div className="h-10 w-24 bg-[var(--color-bg-surface)]/50 rounded-xl"></div>
                        </div>
                    </div>
                </div>

                {/* Filter Panel Skeleton */}
                <div className="mb-6 bg-[var(--color-bg-surface)]/80 border border-white/10 rounded-2xl p-6 animate-pulse">
                    <div className="mb-6">
                        <div className="h-3 w-16 bg-[var(--color-bg-surface)]/50 rounded mb-2"></div>
                        <div className="h-12 bg-[var(--color-bg-surface)]/30 rounded-xl"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i}>
                                <div className="h-3 w-20 bg-[var(--color-bg-surface)]/50 rounded mb-2"></div>
                                <div className="flex gap-2">
                                    {[1, 2, 3].map((j) => (
                                        <div key={j} className="h-8 w-16 bg-[var(--color-bg-surface)]/30 rounded-lg"></div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stats Skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 animate-pulse">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-[var(--color-bg-surface)]/60 border border-white/5 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-4 h-4 bg-[var(--color-bg-surface)]/50 rounded"></div>
                                <div className="h-3 w-16 bg-[var(--color-bg-surface)]/50 rounded"></div>
                            </div>
                            <div className="h-7 w-20 bg-[var(--color-bg-surface)]/30 rounded"></div>
                        </div>
                    ))}
                </div>

                {/* Table Skeleton */}
                <div className="bg-[var(--color-bg-surface)]/60 border border-white/10 rounded-2xl overflow-hidden animate-pulse">
                    {/* Header */}
                    <div className="border-b border-white/5 bg-white/[0.02] p-4 flex gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-4 w-20 bg-[var(--color-bg-surface)]/50 rounded"></div>
                        ))}
                    </div>
                    {/* Rows */}
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                        <div key={i} className="border-b border-white/5 p-4 flex gap-4 items-center">
                            <div className="h-5 w-16 bg-[var(--color-bg-surface)]/30 rounded"></div>
                            <div className="h-5 w-40 bg-[var(--color-bg-surface)]/30 rounded flex-1"></div>
                            <div className="h-5 w-20 bg-[var(--color-bg-surface)]/30 rounded"></div>
                            <div className="h-5 w-16 bg-[var(--color-bg-surface)]/30 rounded"></div>
                            <div className="h-5 w-16 bg-[var(--color-bg-surface)]/30 rounded"></div>
                            <div className="h-5 w-20 bg-[var(--color-bg-surface)]/30 rounded"></div>
                        </div>
                    ))}
                    {/* Footer */}
                    <div className="p-4 border-t border-white/5 bg-white/[0.02] flex justify-between">
                        <div className="h-4 w-32 bg-[var(--color-bg-surface)]/30 rounded"></div>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="w-8 h-8 bg-[var(--color-bg-surface)]/30 rounded-lg"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
