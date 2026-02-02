/**
 * Simple in-memory rate limiter for API routes
 *
 * Note: This is suitable for single-instance deployments.
 * For production with multiple instances, use Redis or Upstash.
 */

interface RateLimitConfig {
    /** Time window in milliseconds */
    windowMs: number;
    /** Maximum requests per window */
    maxRequests: number;
    /** Message to return when rate limited */
    message?: string;
}

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// In-memory store (resets on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup expired entries periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of rateLimitStore.entries()) {
            if (entry.resetTime < now) {
                rateLimitStore.delete(key);
            }
        }
    }, 5 * 60 * 1000);
}

/**
 * Default rate limit configurations by endpoint type
 */
export const RATE_LIMITS = {
    // Public read endpoints - generous limits
    public: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 60, // 60 requests per minute
        message: 'Too many requests. Please try again in a minute.',
    },
    // Search endpoints - moderate limits
    search: {
        windowMs: 60 * 1000,
        maxRequests: 30, // 30 searches per minute
        message: 'Too many search requests. Please slow down.',
    },
    // Data-intensive endpoints - stricter limits
    heavy: {
        windowMs: 60 * 1000,
        maxRequests: 10, // 10 requests per minute
        message: 'This endpoint has stricter rate limits. Please wait.',
    },
    // Admin endpoints - very strict
    admin: {
        windowMs: 60 * 1000,
        maxRequests: 5, // 5 requests per minute
        message: 'Admin rate limit exceeded.',
    },
    // Auth endpoints - prevent brute force
    auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 10, // 10 attempts per 15 minutes
        message: 'Too many authentication attempts. Please try again later.',
    },
} as const;

/**
 * Get client identifier from request
 */
function getClientId(request: Request): string {
    // Try to get real IP from various headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');

    // Use first forwarded IP or fall back to other headers
    const ip = forwarded?.split(',')[0]?.trim() ||
        realIp ||
        cfConnectingIp ||
        'unknown';

    return ip;
}

/**
 * Check rate limit and return whether request should be allowed
 */
export function checkRateLimit(
    request: Request,
    config: RateLimitConfig,
    keyPrefix: string = ''
): { allowed: boolean; remaining: number; resetTime: number; retryAfter: number } {
    const clientId = getClientId(request);
    const key = `${keyPrefix}:${clientId}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    // If no entry or window expired, create new one
    if (!entry || entry.resetTime < now) {
        entry = {
            count: 1,
            resetTime: now + config.windowMs,
        };
        rateLimitStore.set(key, entry);
        return {
            allowed: true,
            remaining: config.maxRequests - 1,
            resetTime: entry.resetTime,
            retryAfter: 0,
        };
    }

    // Increment count
    entry.count++;
    rateLimitStore.set(key, entry);

    const allowed = entry.count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - entry.count);
    const retryAfter = allowed ? 0 : Math.ceil((entry.resetTime - now) / 1000);

    // Record violation for abuse detection if rate limited
    if (!allowed) {
        // Dynamic import to avoid circular dependencies
        import('./abuse-detection').then(({ recordViolation }) => {
            recordViolation(request);
        }).catch(() => {
            // Ignore if abuse detection not available
        });
    }

    return { allowed, remaining, resetTime: entry.resetTime, retryAfter };
}

/**
 * Create rate limit response with proper headers
 */
export function rateLimitResponse(
    config: RateLimitConfig,
    resetTime: number,
    retryAfter: number
): Response {
    return new Response(
        JSON.stringify({
            error: 'Rate limit exceeded',
            message: config.message || 'Too many requests',
            retryAfter,
        }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Reset': new Date(resetTime).toISOString(),
                'Retry-After': retryAfter.toString(),
            },
        }
    );
}

/**
 * Add rate limit headers to a successful response
 */
export function addRateLimitHeaders(
    response: Response,
    limit: number,
    remaining: number,
    resetTime: number
): Response {
    const newHeaders = new Headers(response.headers);
    newHeaders.set('X-RateLimit-Limit', limit.toString());
    newHeaders.set('X-RateLimit-Remaining', remaining.toString());
    newHeaders.set('X-RateLimit-Reset', new Date(resetTime).toISOString());

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
    });
}

/**
 * Rate limit wrapper for API route handlers
 *
 * Usage:
 * ```
 * export const GET = withRateLimit(
 *   async (request) => { ... },
 *   RATE_LIMITS.public,
 *   'api/stocks'
 * );
 * ```
 */
export function withRateLimit<T extends (request: Request, context?: any) => Promise<Response>>(
    handler: T,
    config: RateLimitConfig,
    keyPrefix: string
): T {
    return (async (request: Request, context?: any) => {
        const { allowed, remaining, resetTime, retryAfter } = checkRateLimit(
            request,
            config,
            keyPrefix
        );

        if (!allowed) {
            return rateLimitResponse(config, resetTime, retryAfter);
        }

        const response = await handler(request, context);
        return addRateLimitHeaders(response, config.maxRequests, remaining, resetTime);
    }) as T;
}

/**
 * Track API usage stats (for monitoring)
 */
interface UsageStats {
    totalRequests: number;
    rateLimited: number;
    byEndpoint: Record<string, { total: number; limited: number }>;
}

const usageStats: UsageStats = {
    totalRequests: 0,
    rateLimited: 0,
    byEndpoint: {},
};

export function trackUsage(endpoint: string, wasLimited: boolean): void {
    usageStats.totalRequests++;
    if (wasLimited) usageStats.rateLimited++;

    if (!usageStats.byEndpoint[endpoint]) {
        usageStats.byEndpoint[endpoint] = { total: 0, limited: 0 };
    }
    usageStats.byEndpoint[endpoint].total++;
    if (wasLimited) usageStats.byEndpoint[endpoint].limited++;
}

export function getUsageStats(): UsageStats {
    return { ...usageStats };
}
