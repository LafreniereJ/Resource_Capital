'use client';

/**
 * Global Error Boundary
 *
 * Catches unhandled errors in the entire application.
 * Reports to Sentry and displays a user-friendly error page.
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface GlobalErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
    useEffect(() => {
        // Report to Sentry
        Sentry.captureException(error, {
            level: 'fatal',
            tags: {
                errorBoundary: 'global',
            },
            extra: {
                digest: error.digest,
            },
        });
    }, [error]);

    return (
        <html>
            <body className="min-h-screen bg-[#050510] text-white flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center">
                    {/* Error Icon */}
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
                        <AlertTriangle className="w-10 h-10 text-red-500" />
                    </div>

                    {/* Error Message */}
                    <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
                    <p className="text-slate-400 mb-6">
                        An unexpected error occurred. Our team has been notified and is working on a fix.
                    </p>

                    {/* Error Details (development only) */}
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mb-6 p-4 bg-slate-900/50 rounded-lg text-left">
                            <p className="text-sm font-mono text-red-400 break-all">
                                {error.message}
                            </p>
                            {error.digest && (
                                <p className="text-xs text-slate-500 mt-2">
                                    Digest: {error.digest}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => reset()}
                            className="flex items-center gap-2 px-5 py-2.5 bg-violet-500 hover:bg-violet-600 rounded-lg font-medium transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Try Again
                        </button>
                        <a
                            href="/"
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg font-medium transition-colors"
                        >
                            <Home className="w-4 h-4" />
                            Go Home
                        </a>
                    </div>

                    {/* Support Link */}
                    <p className="text-xs text-slate-600 mt-8">
                        If this keeps happening, please{' '}
                        <a href="mailto:support@resourcecapital.com" className="text-violet-400 hover:underline">
                            contact support
                        </a>
                    </p>
                </div>
            </body>
        </html>
    );
}
