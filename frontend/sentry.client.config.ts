/**
 * Sentry Client-side Configuration
 *
 * This file configures Sentry for browser-side error tracking.
 * Initialize Sentry as early as possible in the application lifecycle.
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

        // Session replay - capture 10% of sessions, but 100% of sessions with errors
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,

        // Debug mode for development
        debug: process.env.NODE_ENV === 'development',

        // Ignore specific errors that aren't actionable
        ignoreErrors: [
            // Browser extensions
            /^chrome-extension:/,
            /^moz-extension:/,
            // Network errors
            'Network request failed',
            'Failed to fetch',
            'Load failed',
            'ChunkLoadError',
            // User cancellations
            'AbortError',
            'The operation was aborted',
            // React hydration (usually not bugs)
            /Hydration failed/,
            /Text content does not match/,
            /There was an error while hydrating/,
            // ResizeObserver (benign browser bug)
            'ResizeObserver loop limit exceeded',
            'ResizeObserver loop completed with undelivered notifications',
        ],

        // Filter breadcrumbs to reduce noise
        beforeBreadcrumb(breadcrumb) {
            // Filter out noisy console breadcrumbs
            if (breadcrumb.category === 'console') {
                if (breadcrumb.level === 'debug' || breadcrumb.level === 'log') {
                    return null;
                }
            }
            return breadcrumb;
        },

        // Clean up events before sending
        beforeSend(event) {
            // Remove user IP (privacy)
            if (event.user) {
                delete event.user.ip_address;
            }

            // Don't send events in development unless explicitly enabled
            if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
                console.log('[Sentry] Would send event:', event.exception?.values?.[0]?.value);
                return null;
            }

            return event;
        },

        // Integrations
        integrations: [
            // Replay integration for session recording
            Sentry.replayIntegration({
                maskAllText: false,
                blockAllMedia: false,
            }),
        ],
    });
}
