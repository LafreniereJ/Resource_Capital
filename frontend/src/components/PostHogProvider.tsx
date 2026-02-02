'use client';

/**
 * PostHog Analytics Provider
 *
 * Wraps the application with PostHog analytics.
 * Handles initialization, page view tracking, and Core Web Vitals.
 */

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initPostHog, trackPageView, identifyUser, resetUser, isPostHogEnabled } from '@/lib/posthog';
import { initWebVitals } from '@/lib/web-vitals';
import { useAuth } from '@/components/AuthProvider';

// Inner component that uses search params (needs Suspense boundary)
function PostHogPageViewTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!isPostHogEnabled()) return;

        // Construct full URL
        const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
        trackPageView(url);
    }, [pathname, searchParams]);

    return null;
}

// User identification component
function PostHogUserIdentifier() {
    const { user } = useAuth();

    useEffect(() => {
        if (!isPostHogEnabled()) return;

        if (user) {
            identifyUser(user.id, {
                email: user.email,
                createdAt: user.created_at,
            });
        } else {
            resetUser();
        }
    }, [user]);

    return null;
}

interface PostHogProviderProps {
    children: React.ReactNode;
}

export default function PostHogProvider({ children }: PostHogProviderProps) {
    useEffect(() => {
        initPostHog();
        // Initialize Core Web Vitals tracking
        initWebVitals();
    }, []);

    return (
        <>
            {children}
            <Suspense fallback={null}>
                <PostHogPageViewTracker />
            </Suspense>
            <PostHogUserIdentifier />
        </>
    );
}
