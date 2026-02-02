/**
 * PostHog Analytics Configuration
 *
 * Product analytics for understanding user behavior.
 * Get your API key from: PostHog Dashboard > Project Settings
 */

import posthog from 'posthog-js';

// Configuration
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

// Check if PostHog is configured
export function isPostHogEnabled(): boolean {
    return Boolean(POSTHOG_KEY) && typeof window !== 'undefined';
}

// Initialize PostHog (call once in app initialization)
export function initPostHog(): void {
    if (!isPostHogEnabled()) {
        console.log('[PostHog] Not configured - analytics disabled');
        return;
    }

    posthog.init(POSTHOG_KEY!, {
        api_host: POSTHOG_HOST,

        // Privacy settings
        persistence: 'localStorage',
        autocapture: true,
        capture_pageview: false, // We'll manually track page views for better control
        capture_pageleave: true,

        // Respect Do Not Track
        respect_dnt: true,

        // Disable in development unless explicitly enabled
        loaded: (posthog) => {
            if (process.env.NODE_ENV === 'development' && !process.env.POSTHOG_DEBUG) {
                posthog.opt_out_capturing();
                console.log('[PostHog] Opted out in development');
            }
        },

        // Session recording (optional - can be enabled later)
        disable_session_recording: true,

        // Don't send IP addresses (privacy)
        ip: false,

        // Bootstrap with feature flags (optional)
        bootstrap: {
            distinctID: undefined,
            featureFlags: {},
        },
    });
}

// Track page view
export function trackPageView(url: string, properties?: Record<string, unknown>): void {
    if (!isPostHogEnabled()) return;

    posthog.capture('$pageview', {
        $current_url: url,
        ...properties,
    });
}

// Track custom event
export function trackEvent(
    eventName: string,
    properties?: Record<string, unknown>
): void {
    if (!isPostHogEnabled()) return;

    posthog.capture(eventName, properties);
}

// Identify user (call after login)
export function identifyUser(
    userId: string,
    traits?: {
        email?: string;
        name?: string;
        tier?: 'free' | 'pro' | 'institutional';
        createdAt?: string;
        [key: string]: unknown;
    }
): void {
    if (!isPostHogEnabled()) return;

    posthog.identify(userId, traits);
}

// Reset user (call after logout)
export function resetUser(): void {
    if (!isPostHogEnabled()) return;

    posthog.reset();
}

// Set user properties (without identifying)
export function setUserProperties(properties: Record<string, unknown>): void {
    if (!isPostHogEnabled()) return;

    posthog.people.set(properties);
}

// Feature flag helpers
export function isFeatureEnabled(flagName: string): boolean {
    if (!isPostHogEnabled()) return false;

    return posthog.isFeatureEnabled(flagName) ?? false;
}

export function getFeatureFlagValue(flagName: string): string | boolean | undefined {
    if (!isPostHogEnabled()) return undefined;

    return posthog.getFeatureFlag(flagName);
}

// Group analytics (for company/team features)
export function setGroup(groupType: string, groupKey: string, groupProperties?: Record<string, unknown>): void {
    if (!isPostHogEnabled()) return;

    posthog.group(groupType, groupKey, groupProperties);
}

// ===== Pre-defined Event Helpers =====

// Stock events
export function trackStockView(ticker: string, companyName: string): void {
    trackEvent('stock_viewed', {
        ticker,
        company_name: companyName,
    });
}

export function trackStockSearch(query: string, resultsCount: number): void {
    trackEvent('stock_searched', {
        query,
        results_count: resultsCount,
    });
}

// Screener events
export function trackScreenerFilter(filters: Record<string, unknown>, resultsCount: number): void {
    trackEvent('screener_filtered', {
        ...filters,
        results_count: resultsCount,
    });
}

export function trackScreenerQuerySaved(queryName: string): void {
    trackEvent('screener_query_saved', {
        query_name: queryName,
    });
}

// Alert events
export function trackAlertCreated(alertType: string, ticker: string): void {
    trackEvent('alert_created', {
        alert_type: alertType,
        ticker,
    });
}

// Comparison events
export function trackComparisonStarted(tickers: string[]): void {
    trackEvent('comparison_started', {
        tickers,
        count: tickers.length,
    });
}

// Simulator events
export function trackSimulationRun(holdings: number, totalInvestment: number): void {
    trackEvent('simulation_run', {
        holdings_count: holdings,
        total_investment: totalInvestment,
    });
}

// Report events
export function trackReportViewed(reportId: number, reportTitle: string): void {
    trackEvent('report_viewed', {
        report_id: reportId,
        report_title: reportTitle,
    });
}

// Subscription events
export function trackUpgradeClicked(fromTier: string, toTier: string, location: string): void {
    trackEvent('upgrade_clicked', {
        from_tier: fromTier,
        to_tier: toTier,
        location,
    });
}

export function trackSubscriptionStarted(tier: string, price: number): void {
    trackEvent('subscription_started', {
        tier,
        price,
    });
}
