/**
 * Cron Job: Update Metal Prices
 * Triggered by Vercel Cron every 15 minutes.
 * Updates commodity prices for Gold, Silver, Copper, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 1 minute max

const METAL_SYMBOLS = [
    { commodity: 'Gold', symbol: 'GC=F' },
    { commodity: 'Silver', symbol: 'SI=F' },
    { commodity: 'Copper', symbol: 'HG=F' },
    { commodity: 'Platinum', symbol: 'PL=F' },
    { commodity: 'Palladium', symbol: 'PA=F' },
    { commodity: 'Nickel', symbol: 'NI=F' },
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

export async function GET(request: NextRequest) {
    if (!verifyCronRequest(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    let updatedCount = 0;
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

        for (const metal of METAL_SYMBOLS) {
            try {
                const response = await fetch(
                    `https://query1.finance.yahoo.com/v8/finance/chart/${metal.symbol}?interval=1d&range=1d`,
                    { next: { revalidate: 0 } }
                );

                if (!response.ok) {
                    console.warn(`[CRON/metals] Failed to fetch ${metal.commodity}`);
                    errorCount++;
                    continue;
                }

                const data = await response.json();
                const quote = data?.chart?.result?.[0]?.meta;

                if (!quote?.regularMarketPrice) {
                    errorCount++;
                    continue;
                }

                const price = quote.regularMarketPrice;
                const prevClose = quote.previousClose || quote.chartPreviousClose;
                const changePercent = prevClose ? ((price - prevClose) / prevClose) * 100 : null;

                // Upsert metal price
                const { error: upsertError } = await supabase
                    .from('metal_prices')
                    .upsert(
                        {
                            commodity: metal.commodity,
                            symbol: metal.symbol,
                            price,
                            currency: 'USD',
                            change_percent: changePercent,
                            day_high: quote.regularMarketDayHigh,
                            day_low: quote.regularMarketDayLow,
                            prev_close: prevClose,
                            source: 'yfinance',
                            fetched_at: new Date().toISOString(),
                        },
                        { onConflict: 'commodity' }
                    );

                if (upsertError) {
                    console.error(`[CRON/metals] Update failed for ${metal.commodity}:`, upsertError);
                    errorCount++;
                } else {
                    updatedCount++;
                }

                // Rate limiting between requests
                await new Promise((resolve) => setTimeout(resolve, 200));
            } catch (err) {
                console.error(`[CRON/metals] Error processing ${metal.commodity}:`, err);
                errorCount++;
            }
        }

        return NextResponse.json({
            success: true,
            updated: updatedCount,
            errors: errorCount,
            total: METAL_SYMBOLS.length,
            durationMs: Date.now() - startTime,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[CRON/metals] Fatal error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
