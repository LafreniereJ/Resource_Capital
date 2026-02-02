/**
 * Next.js Instrumentation Hook
 *
 * This file initializes monitoring tools (Sentry) at startup.
 * Runs once when the Next.js server starts.
 */

export async function register() {
    // Only initialize if Sentry DSN is configured
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
        return;
    }

    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Server-side Sentry initialization
        await import('../sentry.server.config');
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
        // Edge runtime Sentry initialization
        await import('../sentry.edge.config');
    }
}

// Handle unhandled promise rejections
export const onRequestError = process.env.NEXT_PUBLIC_SENTRY_DSN
    ? async (
        err: { digest: string } & Error,
        request: {
            path: string;
            method: string;
            headers: { [key: string]: string };
        },
        context: {
            routerKind: 'Pages Router' | 'App Router';
            routePath: string;
            routeType: 'render' | 'route' | 'action' | 'middleware';
            renderSource: 'react-server-components' | 'react-server-components-payload' | 'server-rendering';
            revalidateReason: 'on-demand' | 'stale' | undefined;
            renderType: 'dynamic' | 'dynamic-resume';
        }
    ) => {
        const { captureRequestError } = await import('@sentry/nextjs');
        captureRequestError(err, request, context);
    }
    : undefined;
