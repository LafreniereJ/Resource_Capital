/**
 * Sentry Edge Runtime Configuration
 *
 * This file configures Sentry for Edge runtime (middleware, edge API routes).
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
    Sentry.init({
        dsn: SENTRY_DSN,

        // Environment & release tracking
        environment: process.env.NODE_ENV,
        release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'development',

        // Lower sample rate for edge (higher volume)
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

        // Debug mode
        debug: false,

        // Clean up events before sending
        beforeSend(event) {
            // Remove sensitive headers
            if (event.request?.headers) {
                delete event.request.headers.cookie;
                delete event.request.headers.authorization;
            }

            // Remove user IP
            if (event.user) {
                delete event.user.ip_address;
            }

            return event;
        },
    });
}
