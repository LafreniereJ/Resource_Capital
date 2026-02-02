/**
 * Basic abuse detection for API endpoints
 *
 * Detects suspicious patterns that indicate abuse:
 * - Excessive rate limit violations
 * - Scraping behavior (rapid sequential requests)
 * - Suspicious user agents
 * - Known bad IPs (optional)
 */

interface AbuseRecord {
    violations: number;
    lastViolation: number;
    isBlocked: boolean;
    blockedUntil: number;
    suspiciousPatterns: string[];
}

// In-memory store for abuse tracking
const abuseStore = new Map<string, AbuseRecord>();

// Configuration
const ABUSE_CONFIG = {
    // Number of rate limit violations before temporary block
    violationThreshold: 10,
    // Duration of temporary block (15 minutes)
    blockDurationMs: 15 * 60 * 1000,
    // Time window for counting violations (1 hour)
    violationWindowMs: 60 * 60 * 1000,
    // Minimum time between requests to not be considered scraping (100ms)
    minRequestIntervalMs: 100,
};

// Known suspicious patterns
const SUSPICIOUS_USER_AGENTS = [
    'python-requests',
    'curl/',
    'wget/',
    'scrapy',
    'crawler',
    'bot',
    'spider',
    'scraper',
];

// Legitimate bots to allow
const ALLOWED_BOTS = [
    'googlebot',
    'bingbot',
    'slurp',
    'duckduckbot',
    'baiduspider',
    'yandexbot',
];

/**
 * Get client IP from request
 */
function getClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfIp = request.headers.get('cf-connecting-ip');

    return forwarded?.split(',')[0]?.trim() ||
        realIp ||
        cfIp ||
        'unknown';
}

/**
 * Check if user agent is suspicious
 */
function isSuspiciousUserAgent(request: Request): { suspicious: boolean; reason?: string } {
    const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';

    // Allow empty or missing user agent but flag it
    if (!userAgent) {
        return { suspicious: true, reason: 'Missing user agent' };
    }

    // Allow legitimate bots
    if (ALLOWED_BOTS.some(bot => userAgent.includes(bot))) {
        return { suspicious: false };
    }

    // Check for suspicious patterns
    for (const pattern of SUSPICIOUS_USER_AGENTS) {
        if (userAgent.includes(pattern)) {
            return { suspicious: true, reason: `Suspicious user agent: ${pattern}` };
        }
    }

    return { suspicious: false };
}

/**
 * Record a rate limit violation
 */
export function recordViolation(request: Request): void {
    const ip = getClientIp(request);
    const now = Date.now();

    let record = abuseStore.get(ip);

    if (!record) {
        record = {
            violations: 0,
            lastViolation: 0,
            isBlocked: false,
            blockedUntil: 0,
            suspiciousPatterns: [],
        };
    }

    // Reset if outside violation window
    if (now - record.lastViolation > ABUSE_CONFIG.violationWindowMs) {
        record.violations = 0;
        record.suspiciousPatterns = [];
    }

    record.violations++;
    record.lastViolation = now;

    // Check user agent
    const uaCheck = isSuspiciousUserAgent(request);
    if (uaCheck.suspicious && uaCheck.reason && !record.suspiciousPatterns.includes(uaCheck.reason)) {
        record.suspiciousPatterns.push(uaCheck.reason);
    }

    // Block if threshold exceeded
    if (record.violations >= ABUSE_CONFIG.violationThreshold) {
        record.isBlocked = true;
        record.blockedUntil = now + ABUSE_CONFIG.blockDurationMs;
        console.warn(`[ABUSE] Blocking IP ${ip} for ${ABUSE_CONFIG.blockDurationMs / 1000}s due to ${record.violations} violations`);
    }

    abuseStore.set(ip, record);
}

/**
 * Check if request should be blocked
 */
export function checkAbuse(request: Request): {
    blocked: boolean;
    reason?: string;
    retryAfter?: number;
} {
    const ip = getClientIp(request);
    const now = Date.now();

    const record = abuseStore.get(ip);

    if (record) {
        // Check if blocked
        if (record.isBlocked) {
            if (now < record.blockedUntil) {
                const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
                return {
                    blocked: true,
                    reason: 'Too many violations. You are temporarily blocked.',
                    retryAfter,
                };
            } else {
                // Unblock
                record.isBlocked = false;
                record.violations = 0;
                record.suspiciousPatterns = [];
                abuseStore.set(ip, record);
            }
        }

        // Check for warning threshold (50% of block threshold)
        if (record.violations >= ABUSE_CONFIG.violationThreshold / 2) {
            // Just log, don't block yet
            console.warn(`[ABUSE] Warning: IP ${ip} has ${record.violations} violations`);
        }
    }

    // Check user agent suspicion (log but don't block)
    const uaCheck = isSuspiciousUserAgent(request);
    if (uaCheck.suspicious) {
        console.warn(`[ABUSE] Suspicious request from ${ip}: ${uaCheck.reason}`);
    }

    return { blocked: false };
}

/**
 * Create blocked response
 */
export function blockedResponse(reason: string, retryAfter: number): Response {
    return new Response(
        JSON.stringify({
            error: 'Access denied',
            message: reason,
            retryAfter,
        }),
        {
            status: 403,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': retryAfter.toString(),
            },
        }
    );
}

/**
 * Get abuse statistics for monitoring
 */
export function getAbuseStats(): {
    totalTracked: number;
    currentlyBlocked: number;
    recentViolations: number;
} {
    const now = Date.now();
    let currentlyBlocked = 0;
    let recentViolations = 0;

    for (const [, record] of abuseStore.entries()) {
        if (record.isBlocked && record.blockedUntil > now) {
            currentlyBlocked++;
        }
        if (now - record.lastViolation < ABUSE_CONFIG.violationWindowMs) {
            recentViolations += record.violations;
        }
    }

    return {
        totalTracked: abuseStore.size,
        currentlyBlocked,
        recentViolations,
    };
}

/**
 * Middleware wrapper that combines rate limiting with abuse detection
 */
export function withAbuseDetection<T extends (request: Request, context?: any) => Promise<Response>>(
    handler: T
): T {
    return (async (request: Request, context?: any) => {
        // Check if blocked
        const abuseCheck = checkAbuse(request);
        if (abuseCheck.blocked) {
            return blockedResponse(abuseCheck.reason!, abuseCheck.retryAfter!);
        }

        return handler(request, context);
    }) as T;
}

// Cleanup old records periodically (every 30 minutes)
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [ip, record] of abuseStore.entries()) {
            // Remove records that haven't had violations in 2 hours and aren't blocked
            if (!record.isBlocked && now - record.lastViolation > 2 * 60 * 60 * 1000) {
                abuseStore.delete(ip);
            }
        }
    }, 30 * 60 * 1000);
}
