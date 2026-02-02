/**
 * Cron Job: Fetch News
 * Triggered by Vercel Cron every 15 minutes.
 * Fetches mining news from TMX Newsfile RSS feed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const NEWS_FEEDS = [
    {
        name: 'TMX Newsfile',
        url: 'https://feeds.newsfilecorp.com/feed/DataLynx',
    },
];

// Verify this is a legitimate Vercel cron request
function verifyCronRequest(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === 'development') return true;
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
    if (request.headers.get('x-vercel-cron') === '1') return true;

    return false;
}

interface RSSItem {
    title: string;
    link: string;
    description: string;
    pubDate: string;
    guid?: string;
}

async function parseRSSFeed(url: string): Promise<RSSItem[]> {
    const response = await fetch(url, { next: { revalidate: 0 } });
    const xml = await response.text();

    // Simple XML parsing (for production, use a proper XML parser)
    const items: RSSItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
        const itemXml = match[1];

        const getTag = (tag: string) => {
            const tagMatch = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
            return tagMatch ? tagMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
        };

        items.push({
            title: getTag('title'),
            link: getTag('link'),
            description: getTag('description').substring(0, 500),
            pubDate: getTag('pubDate'),
            guid: getTag('guid') || getTag('link'),
        });
    }

    return items;
}

export async function GET(request: NextRequest) {
    if (!verifyCronRequest(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    let insertedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json(
                { error: 'Missing Supabase credentials' },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get list of tracked company tickers for filtering
        const { data: companies } = await supabase
            .from('companies')
            .select('ticker, name');

        const trackedTickers = new Set(
            companies?.map((c) => c.ticker.toLowerCase()) || []
        );

        for (const feed of NEWS_FEEDS) {
            try {
                console.log(`[CRON/news] Fetching ${feed.name}...`);
                const items = await parseRSSFeed(feed.url);

                for (const item of items) {
                    // Check if news is relevant (mentions a tracked ticker)
                    const titleLower = item.title.toLowerCase();
                    const descLower = item.description.toLowerCase();

                    let relatedTicker: string | null = null;
                    for (const ticker of trackedTickers) {
                        if (titleLower.includes(ticker) || descLower.includes(ticker)) {
                            relatedTicker = ticker.toUpperCase();
                            break;
                        }
                    }

                    // Insert if we don't already have this article
                    const { error: insertError } = await supabase
                        .from('news')
                        .upsert(
                            {
                                title: item.title,
                                description: item.description,
                                url: item.link,
                                source: feed.name,
                                ticker: relatedTicker,
                                published_at: new Date(item.pubDate).toISOString(),
                                fetched_at: new Date().toISOString(),
                            },
                            { onConflict: 'url', ignoreDuplicates: true }
                        );

                    if (insertError) {
                        if (insertError.code === '23505') {
                            // Duplicate
                            skippedCount++;
                        } else {
                            console.error(`[CRON/news] Insert error:`, insertError);
                            errorCount++;
                        }
                    } else {
                        insertedCount++;
                    }
                }
            } catch (err) {
                console.error(`[CRON/news] Error fetching ${feed.name}:`, err);
                errorCount++;
            }
        }

        return NextResponse.json({
            success: true,
            inserted: insertedCount,
            skipped: skippedCount,
            errors: errorCount,
            durationMs: Date.now() - startTime,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[CRON/news] Fatal error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
