/**
 * Sentry Error Tracking Configuration
 *
 * This module provides error tracking and performance monitoring.
 * Sentry DSN is required - get it from your Sentry project settings.
 */

// Sentry configuration for client-side
export const sentryConfig = {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
    environment: process.env.NODE_ENV,

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session replay (captures user sessions for debugging)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Release tracking
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'development',

    // Ignore certain errors
    ignoreErrors: [
        // Browser extensions
        /^chrome-extension:/,
        /^moz-extension:/,
        // Network errors that aren't actionable
        'Network request failed',
        'Failed to fetch',
        'Load failed',
        // User cancellations
        'AbortError',
        'The operation was aborted',
        // Hydration warnings (usually not bugs)
        /Hydration failed/,
        /Text content does not match/,
    ],

    // Don't send PII
    beforeSend(event: SentryEvent) {
        // Remove user IP addresses
        if (event.user) {
            delete event.user.ip_address;
        }
        return event;
    },
};

// Type for Sentry event
interface SentryEvent {
    user?: {
        ip_address?: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

// Check if Sentry is configured
export function isSentryEnabled(): boolean {
    return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
}

// Manual error capture helper (for use in catch blocks)
export function captureException(error: Error, context?: Record<string, unknown>): void {
    if (!isSentryEnabled()) {
        console.error('[Sentry not configured]', error, context);
        return;
    }

    // Dynamic import to avoid bundling Sentry when not used
    import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureException(error, {
            extra: context,
        });
    }).catch(() => {
        console.error('[Sentry import failed]', error, context);
    });
}

// Manual message capture (for non-error events)
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    if (!isSentryEnabled()) {
        console.log(`[Sentry ${level}]`, message);
        return;
    }

    import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureMessage(message, level);
    }).catch(() => {
        console.log(`[Sentry import failed] ${level}:`, message);
    });
}

// Set user context (call after login)
export function setUser(user: { id: string; email?: string }): void {
    if (!isSentryEnabled()) return;

    import('@sentry/nextjs').then((Sentry) => {
        Sentry.setUser({
            id: user.id,
            email: user.email,
        });
    }).catch(() => {
        // Silent fail
    });
}

// Clear user context (call after logout)
export function clearUser(): void {
    if (!isSentryEnabled()) return;

    import('@sentry/nextjs').then((Sentry) => {
        Sentry.setUser(null);
    }).catch(() => {
        // Silent fail
    });
}

// Add breadcrumb for debugging
export function addBreadcrumb(
    message: string,
    category: string = 'app',
    level: 'debug' | 'info' | 'warning' | 'error' = 'info'
): void {
    if (!isSentryEnabled()) return;

    import('@sentry/nextjs').then((Sentry) => {
        Sentry.addBreadcrumb({
            message,
            category,
            level,
        });
    }).catch(() => {
        // Silent fail
    });
}
