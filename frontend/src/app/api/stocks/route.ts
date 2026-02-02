import { NextRequest, NextResponse } from 'next/server';
import { getStocks } from '@/lib/db';
import { checkRateLimit, rateLimitResponse, addRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
    // Rate limit check
    const rateLimit = checkRateLimit(request, RATE_LIMITS.public, 'api/stocks');
    if (!rateLimit.allowed) {
        return rateLimitResponse(RATE_LIMITS.public, rateLimit.resetTime, rateLimit.retryAfter);
    }

    try {
        const { searchParams } = new URL(request.url);

        const filters = {
            commodity: searchParams.get('commodity') || undefined,
            exchange: searchParams.get('exchange') || undefined,
            minMarketCap: searchParams.get('minMarketCap') ? Number(searchParams.get('minMarketCap')) : undefined,
            maxMarketCap: searchParams.get('maxMarketCap') ? Number(searchParams.get('maxMarketCap')) : undefined,
            sortBy: (searchParams.get('sortBy') as any) || 'market_cap',
            sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
            limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 50,
            offset: searchParams.get('offset') ? Number(searchParams.get('offset')) : 0,
        };

        const stocks = getStocks(filters);

        const response = NextResponse.json({
            success: true,
            data: stocks,
            count: stocks.length,
            filters
        });
        return addRateLimitHeaders(response, RATE_LIMITS.public.maxRequests, rateLimit.remaining, rateLimit.resetTime);
    } catch (error) {
        console.error('Error fetching stocks:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch stocks' },
            { status: 500 }
        );
    }
}
