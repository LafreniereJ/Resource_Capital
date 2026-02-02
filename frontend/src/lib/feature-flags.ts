/**
 * Internal Feature Flags System
 *
 * Simple feature flags for gradual rollouts and A/B testing.
 * Flags can be controlled via environment variables or admin dashboard.
 *
 * Usage:
 * ```
 * import { isFeatureEnabled, FEATURES } from '@/lib/feature-flags';
 *
 * if (isFeatureEnabled(FEATURES.NEW_SCREENER)) {
 *   // Show new screener
 * }
 * ```
 */

export interface FeatureFlag {
    /** Unique identifier for the feature */
    id: string;
    /** Human-readable name */
    name: string;
    /** Description of what this flag controls */
    description: string;
    /** Is this feature enabled by default? */
    defaultEnabled: boolean;
    /** Percentage of users who should see this feature (0-100) */
    rolloutPercentage: number;
    /** Tiers that have access to this feature */
    enabledForTiers: ('free' | 'pro' | 'institutional')[];
    /** Is this flag still in development? */
    isDevelopment: boolean;
}

/**
 * Feature flag definitions
 */
export const FEATURE_FLAGS: Record<string, FeatureFlag> = {
    // Sprint 6 features (upcoming)
    ADVANCED_SCREENER: {
        id: 'advanced_screener',
        name: 'Advanced Screener',
        description: 'Multi-filter stock screener with saved queries',
        defaultEnabled: false,
        rolloutPercentage: 0,
        enabledForTiers: ['pro', 'institutional'],
        isDevelopment: true,
    },
    PEER_COMPARISON: {
        id: 'peer_comparison',
        name: 'Peer Comparison Widget',
        description: 'Compare company metrics with peers on detail pages',
        defaultEnabled: false,
        rolloutPercentage: 0,
        enabledForTiers: ['pro', 'institutional'],
        isDevelopment: true,
    },
    COMMODITY_CORRELATION: {
        id: 'commodity_correlation',
        name: 'Commodity Correlation Charts',
        description: 'Stock vs gold/silver/copper price correlations',
        defaultEnabled: false,
        rolloutPercentage: 0,
        enabledForTiers: ['pro', 'institutional'],
        isDevelopment: true,
    },

    // Sprint 7 features
    SENTIMENT_SCORING: {
        id: 'sentiment_scoring',
        name: 'News Sentiment Scoring',
        description: 'AI-powered bull/bear indicators on news articles',
        defaultEnabled: false,
        rolloutPercentage: 0,
        enabledForTiers: ['pro', 'institutional'],
        isDevelopment: true,
    },
    SIMILAR_COMPANIES: {
        id: 'similar_companies',
        name: 'Similar Companies',
        description: 'AI-powered company recommendations',
        defaultEnabled: false,
        rolloutPercentage: 0,
        enabledForTiers: ['free', 'pro', 'institutional'],
        isDevelopment: true,
    },

    // General features
    DARK_MODE: {
        id: 'dark_mode',
        name: 'Dark Mode',
        description: 'Enable dark mode toggle in settings',
        defaultEnabled: true, // Already using dark theme
        rolloutPercentage: 100,
        enabledForTiers: ['free', 'pro', 'institutional'],
        isDevelopment: false,
    },
    EXPORT_CSV: {
        id: 'export_csv',
        name: 'CSV Export',
        description: 'Export data to CSV format',
        defaultEnabled: false,
        rolloutPercentage: 0,
        enabledForTiers: ['pro', 'institutional'],
        isDevelopment: false,
    },
    API_ACCESS: {
        id: 'api_access',
        name: 'API Access',
        description: 'Access to public REST API',
        defaultEnabled: false,
        rolloutPercentage: 0,
        enabledForTiers: ['institutional'],
        isDevelopment: false,
    },
    WATCHLIST_ALERTS: {
        id: 'watchlist_alerts',
        name: 'Watchlist Alerts',
        description: 'Email notifications for watchlist changes',
        defaultEnabled: false,
        rolloutPercentage: 0,
        enabledForTiers: ['pro', 'institutional'],
        isDevelopment: true,
    },
};

/**
 * Shorthand for feature flag IDs
 */
export const FEATURES = {
    ADVANCED_SCREENER: 'advanced_screener',
    PEER_COMPARISON: 'peer_comparison',
    COMMODITY_CORRELATION: 'commodity_correlation',
    SENTIMENT_SCORING: 'sentiment_scoring',
    SIMILAR_COMPANIES: 'similar_companies',
    DARK_MODE: 'dark_mode',
    EXPORT_CSV: 'export_csv',
    API_ACCESS: 'api_access',
    WATCHLIST_ALERTS: 'watchlist_alerts',
} as const;

// In-memory overrides (set via admin dashboard)
const flagOverrides: Map<string, boolean> = new Map();

/**
 * Get environment variable override for a feature
 */
function getEnvOverride(flagId: string): boolean | null {
    if (typeof process === 'undefined') return null;

    const envKey = `NEXT_PUBLIC_FF_${flagId.toUpperCase()}`;
    const envValue = process.env[envKey];

    if (envValue === 'true' || envValue === '1') return true;
    if (envValue === 'false' || envValue === '0') return false;
    return null;
}

/**
 * Check if a feature is enabled for the current user
 */
export function isFeatureEnabled(
    flagId: string,
    options: {
        userId?: string;
        userTier?: 'free' | 'pro' | 'institutional';
    } = {}
): boolean {
    const flag = FEATURE_FLAGS[flagId] || Object.values(FEATURE_FLAGS).find(f => f.id === flagId);

    if (!flag) {
        console.warn(`Unknown feature flag: ${flagId}`);
        return false;
    }

    // Check for admin override first
    const adminOverride = flagOverrides.get(flag.id);
    if (adminOverride !== undefined) {
        return adminOverride;
    }

    // Check for environment variable override
    const envOverride = getEnvOverride(flag.id);
    if (envOverride !== null) {
        return envOverride;
    }

    // Development features are only enabled in development
    if (flag.isDevelopment && process.env.NODE_ENV === 'production') {
        return false;
    }

    // Check tier access
    const userTier = options.userTier || 'free';
    if (!flag.enabledForTiers.includes(userTier)) {
        return false;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
        if (flag.rolloutPercentage === 0) {
            return flag.defaultEnabled;
        }

        // Consistent hashing for user-based rollout
        if (options.userId) {
            const hash = simpleHash(options.userId + flag.id);
            const bucket = hash % 100;
            return bucket < flag.rolloutPercentage;
        }

        // Random for anonymous users
        return Math.random() * 100 < flag.rolloutPercentage;
    }

    return flag.defaultEnabled;
}

/**
 * Simple hash function for consistent user bucketing
 */
function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

/**
 * Set an admin override for a feature flag
 */
export function setFlagOverride(flagId: string, enabled: boolean): void {
    flagOverrides.set(flagId, enabled);
}

/**
 * Clear an admin override
 */
export function clearFlagOverride(flagId: string): void {
    flagOverrides.delete(flagId);
}

/**
 * Get all flag overrides
 */
export function getFlagOverrides(): Record<string, boolean> {
    return Object.fromEntries(flagOverrides);
}

/**
 * Get all feature flags with their current status
 */
export function getAllFlags(options: {
    userId?: string;
    userTier?: 'free' | 'pro' | 'institutional';
} = {}): Array<FeatureFlag & { isEnabled: boolean; hasOverride: boolean }> {
    return Object.values(FEATURE_FLAGS).map(flag => ({
        ...flag,
        isEnabled: isFeatureEnabled(flag.id, options),
        hasOverride: flagOverrides.has(flag.id),
    }));
}

/**
 * React hook for feature flags (client-side)
 */
export function useFeatureFlag(
    flagId: string,
    options: {
        userId?: string;
        userTier?: 'free' | 'pro' | 'institutional';
    } = {}
): boolean {
    // In a real implementation, this would use React state and listen for updates
    return isFeatureEnabled(flagId, options);
}
