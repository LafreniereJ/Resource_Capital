'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Map, RefreshCw, Home } from 'lucide-react';

export default function MapError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Map page error:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-[#050510] text-gray-200">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-red-500/5 blur-[120px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-[120px]"></div>
            </div>

            <div className="relative z-10 px-6 py-8 max-w-7xl mx-auto">
                {/* Header */}
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-emerald-400 mb-8 transition">
                    ← Dashboard
                </Link>

                <div className="mb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
                        <span className="w-2 h-2 rounded-full bg-red-400"></span>
                        <span className="text-xs font-medium text-red-300 uppercase tracking-widest">Error</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4 text-white">
                        Project Map
                    </h1>
                </div>

                {/* Error Content */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center max-w-lg mx-auto"
                >
                    <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                        <Map className="w-8 h-8 text-red-400" />
                    </div>

                    <h2 className="text-xl font-bold text-white mb-3">
                        Unable to Load Map
                    </h2>
                    <p className="text-gray-400 mb-6">
                        We couldn&apos;t load the project map. This might be due to a mapping service issue or missing project location data.
                    </p>

                    {process.env.NODE_ENV === 'development' && error.message && (
                        <div className="mb-6 p-3 bg-black/30 border border-red-500/20 rounded-lg text-left">
                            <p className="text-xs text-red-300/70 font-mono break-all">
                                {error.message}
                            </p>
                        </div>
                    )}

                    <div className="flex items-center justify-center gap-3">
                        <button
                            onClick={reset}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-red-300 font-medium transition-colors"
                        >
                            <RefreshCw size={16} />
                            Retry
                        </button>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 font-medium transition-colors"
                        >
                            <Home size={16} />
                            Home
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
