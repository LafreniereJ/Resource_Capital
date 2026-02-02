import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { checkRateLimit, rateLimitResponse, addRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';

interface SearchResult {
    type: 'company' | 'news';
    id: number;
    ticker?: string;
    name: string;
    subtitle?: string;
    url: string;
}

export async function GET(request: Request) {
    // Rate limit check
    const rateLimit = checkRateLimit(request, RATE_LIMITS.search, 'api/search');
    if (!rateLimit.allowed) {
        return rateLimitResponse(RATE_LIMITS.search, rateLimit.resetTime, rateLimit.retryAfter);
    }
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();

    if (!query || query.length < 2) {
        return NextResponse.json({ results: [], query: '' });
    }

    try {
        const results: SearchResult[] = [];

        // Search companies
        const { data: companies, error: companyError } = await supabase
            .from('companies')
            .select('id, ticker, name, exchange, commodity, market_cap')
            .or(`ticker.ilike.%${query}%,name.ilike.%${query}%`)
            .order('market_cap', { ascending: false, nullsFirst: false })
            .limit(8);

        if (!companyError && companies) {
            for (const c of companies) {
                results.push({
                    type: 'company',
                    id: c.id,
                    ticker: c.ticker,
                    name: c.name,
                    subtitle: c.commodity || c.exchange,
                    url: `/companies/${c.ticker}`
                });
            }
        }

        // Search news (if we have room)
        if (results.length < 10) {
            const { data: news, error: newsError } = await supabase
                .from('news')
                .select('id, title, source, ticker')
                .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
                .order('published_at', { ascending: false })
                .limit(10 - results.length);

            if (!newsError && news) {
                for (const n of news) {
                    results.push({
                        type: 'news',
                        id: n.id,
                        ticker: n.ticker,
                        name: n.title.length > 60 ? n.title.slice(0, 60) + '...' : n.title,
                        subtitle: n.source,
                        url: `/news?article=${n.id}`
                    });
                }
            }
        }

        const response = NextResponse.json({
            results,
            query,
            count: results.length
        });
        return addRateLimitHeaders(response, RATE_LIMITS.search.maxRequests, rateLimit.remaining, rateLimit.resetTime);
    } catch (error) {
        console.error('Search error:', error);
        return NextResponse.json(
            { results: [], query, error: 'Search failed' },
            { status: 500 }
        );
    }
}
