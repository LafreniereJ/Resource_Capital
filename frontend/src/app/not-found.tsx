'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[#050510] flex items-center justify-center px-6">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-500/5 blur-[120px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 blur-[120px]"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 text-center max-w-md"
            >
                {/* 404 Display */}
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-violet-500/10 blur-3xl rounded-full"></div>
                    <h1 className="relative text-[150px] font-bold leading-none tracking-tighter">
                        <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-gray-300 to-gray-600">
                            404
                        </span>
                    </h1>
                </div>

                <h2 className="text-2xl font-bold text-white mb-4">
                    Page Not Found
                </h2>
                <p className="text-gray-400 mb-8">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>

                <div className="flex items-center justify-center gap-4">
                    <Link
                        href="/"
                        className="px-6 py-3 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 rounded-xl text-violet-300 font-medium transition-colors"
                    >
                        Go Home
                    </Link>
                    <Link
                        href="/stocks"
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 font-medium transition-colors"
                    >
                        Browse Stocks
                    </Link>
                </div>

                {/* Helpful Links */}
                <div className="mt-12 pt-8 border-t border-white/5">
                    <p className="text-xs text-gray-600 uppercase tracking-wider mb-4">Popular Pages</p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <Link href="/stocks" className="text-sm text-gray-500 hover:text-violet-400 transition-colors">
                            Stock Screener
                        </Link>
                        <span className="text-gray-700">•</span>
                        <Link href="/news" className="text-sm text-gray-500 hover:text-violet-400 transition-colors">
                            News
                        </Link>
                        <span className="text-gray-700">•</span>
                        <Link href="/map" className="text-sm text-gray-500 hover:text-violet-400 transition-colors">
                            Project Map
                        </Link>
                        <span className="text-gray-700">•</span>
                        <Link href="/companies" className="text-sm text-gray-500 hover:text-violet-400 transition-colors">
                            Companies
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
