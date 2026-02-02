/**
 * Sentry Server-side Configuration
 *
 * This file configures Sentry for server-side error tracking.
 * Used for API routes, Server Components, and middleware.
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
    Sentry.init({
        dsn: SENTRY_DSN,

        // Environment & release tracking
        environment: process.env.NODE_ENV,
        release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'development',

        // Performance monitoring - sample 10% of transactions in production
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

        // Debug mode for development
        debug: false,

        // Ignore specific errors that aren't actionable
        ignoreErrors: [
            // Network timeouts
            'ETIMEDOUT',
            'ECONNRESET',
            'ECONNREFUSED',
            // User cancellations
            'AbortError',
            'The operation was aborted',
        ],

        // Clean up events before sending
        beforeSend(event) {
            // Remove sensitive data from request headers
            if (event.request?.headers) {
                delete event.request.headers.cookie;
                delete event.request.headers.authorization;
            }

            // Remove user IP (privacy)
            if (event.user) {
                delete event.user.ip_address;
            }

            return event;
        },
    });
}
