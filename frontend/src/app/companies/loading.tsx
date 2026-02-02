import { Skeleton } from '@/components/ui/Skeleton';

export default function CompaniesLoading() {
    return (
        <main className="min-h-screen bg-[#050510] text-gray-200 font-sans overflow-x-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/8 blur-[150px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 blur-[120px]"></div>
            </div>

            <div className="relative z-10 px-6 md:px-12 py-8 max-w-7xl mx-auto">
                {/* Back Link */}
                <Skeleton className="h-4 w-24 mb-8" />

                {/* Page Header */}
                <div className="mb-10 space-y-4">
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-12 w-64" />
                    <Skeleton className="h-4 w-80 max-w-full" />
                </div>

                {/* Company Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div
                            key={i}
                            className="bg-[#0A0A15]/60 border border-white/5 rounded-2xl p-6"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <Skeleton className="w-14 h-14 rounded-xl" />
                                <Skeleton className="h-6 w-12 rounded-lg" />
                            </div>

                            <Skeleton className="h-6 w-full mb-2" />
                            <Skeleton className="h-4 w-20 mb-4" />

                            <div className="flex justify-between items-end border-t border-white/5 pt-4">
                                <div className="space-y-1">
                                    <Skeleton className="h-3 w-10" />
                                    <Skeleton className="h-5 w-16" />
                                </div>
                                <div className="space-y-1">
                                    <Skeleton className="h-3 w-12" />
                                    <Skeleton className="h-5 w-16" />
                                </div>
                                <Skeleton className="h-4 w-12" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
