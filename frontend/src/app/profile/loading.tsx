export default function ProfileLoading() {
    return (
        <main className="min-h-screen pt-20 px-4 md:px-8 pb-12">
            <div className="max-w-4xl mx-auto">
                {/* Header Skeleton */}
                <div className="mb-8">
                    <div className="h-9 bg-neutral-800 rounded w-48 mb-3 animate-pulse"></div>
                    <div className="h-5 bg-neutral-800 rounded w-72 animate-pulse"></div>
                </div>

                {/* Profile Card Skeleton */}
                <div className="glass-card p-6 mb-6">
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-full bg-neutral-800 animate-pulse"></div>
                            <div>
                                <div className="h-6 bg-neutral-800 rounded w-40 mb-2 animate-pulse"></div>
                                <div className="h-4 bg-neutral-800 rounded w-48 mb-2 animate-pulse"></div>
                                <div className="h-3 bg-neutral-800 rounded w-24 animate-pulse"></div>
                            </div>
                        </div>
                        <div className="h-10 bg-neutral-800 rounded w-28 animate-pulse"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="p-4 rounded-xl bg-neutral-800/50">
                                <div className="h-3 bg-neutral-700 rounded w-16 mb-2 animate-pulse"></div>
                                <div className="h-5 bg-neutral-700 rounded w-32 animate-pulse"></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Account Section Skeleton */}
                <div className="glass-card p-6 mb-6">
                    <div className="h-6 bg-neutral-800 rounded w-24 mb-4 animate-pulse"></div>
                    <div className="space-y-4">
                        {[1, 2].map((i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-neutral-800/50">
                                <div>
                                    <div className="h-5 bg-neutral-700 rounded w-28 mb-2 animate-pulse"></div>
                                    <div className="h-4 bg-neutral-700 rounded w-40 animate-pulse"></div>
                                </div>
                                <div className="h-4 bg-neutral-700 rounded w-24 animate-pulse"></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Links Skeleton */}
                <div className="glass-card p-6">
                    <div className="h-6 bg-neutral-800 rounded w-28 mb-4 animate-pulse"></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-neutral-800/50">
                                <div className="w-10 h-10 rounded-lg bg-neutral-700 animate-pulse"></div>
                                <div>
                                    <div className="h-5 bg-neutral-700 rounded w-20 mb-2 animate-pulse"></div>
                                    <div className="h-4 bg-neutral-700 rounded w-32 animate-pulse"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    )
}
