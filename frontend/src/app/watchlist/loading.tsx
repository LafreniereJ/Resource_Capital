export default function WatchlistLoading() {
    return (
        <main className="min-h-screen pt-20 px-4 md:px-8 pb-12">
            <div className="max-w-6xl mx-auto">
                {/* Header Skeleton */}
                <div className="mb-8">
                    <div className="h-9 bg-neutral-800 rounded w-40 mb-3 animate-pulse"></div>
                    <div className="h-5 bg-neutral-800 rounded w-64 animate-pulse"></div>
                </div>

                {/* Tabs Skeleton */}
                <div className="flex gap-2 mb-6">
                    <div className="h-10 bg-neutral-800 rounded-lg w-32 animate-pulse"></div>
                    <div className="h-10 bg-neutral-800 rounded-lg w-28 animate-pulse"></div>
                </div>

                {/* Table Skeleton */}
                <div className="glass-card overflow-hidden">
                    {/* Header */}
                    <div className="bg-neutral-800/50 px-6 py-4 flex gap-4">
                        <div className="h-4 bg-neutral-700 rounded w-24 animate-pulse"></div>
                        <div className="h-4 bg-neutral-700 rounded w-20 animate-pulse"></div>
                        <div className="h-4 bg-neutral-700 rounded w-20 animate-pulse"></div>
                        <div className="ml-auto h-4 bg-neutral-700 rounded w-16 animate-pulse"></div>
                        <div className="h-4 bg-neutral-700 rounded w-16 animate-pulse"></div>
                    </div>

                    {/* Rows */}
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="px-6 py-4 border-t border-neutral-800 flex items-center gap-4">
                            <div className="flex-1">
                                <div className="h-5 bg-neutral-800 rounded w-20 mb-2 animate-pulse"></div>
                                <div className="h-4 bg-neutral-800 rounded w-48 animate-pulse"></div>
                            </div>
                            <div className="h-5 bg-neutral-800 rounded w-16 animate-pulse"></div>
                            <div className="h-6 bg-neutral-800 rounded-full w-16 animate-pulse"></div>
                            <div className="h-5 bg-neutral-800 rounded w-16 animate-pulse"></div>
                            <div className="h-5 bg-neutral-800 rounded w-16 animate-pulse"></div>
                            <div className="h-8 w-8 bg-neutral-800 rounded animate-pulse"></div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    )
}
