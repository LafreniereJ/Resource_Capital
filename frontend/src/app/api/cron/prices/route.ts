/**
 * Cron Job: Update Stock Prices
 * Triggered by Vercel Cron every 15 minutes during TSX market hours.
 * Schedule: Mon-Fri, 9AM-4PM EST
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for Vercel Pro

// Verify this is a legitimate Vercel cron request
function verifyCronRequest(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In development, allow all requests
    if (process.env.NODE_ENV === 'development') {
        return true;
    }

    // In production, verify the secret
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
        return true;
    }

    // Vercel cron requests have this header
    if (request.headers.get('x-vercel-cron') === '1') {
        return true;
    }

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
        // Initialize Supabase with service role key for admin access
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json(
                { error: 'Missing Supabase credentials' },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get all companies
        const { data: companies, error: fetchError } = await supabase
            .from('companies')
            .select('id, ticker, exchange')
            .order('market_cap', { ascending: false, nullsFirst: false });

        if (fetchError || !companies) {
            throw new Error(`Failed to fetch companies: ${fetchError?.message}`);
        }

        console.log(`[CRON/prices] Updating ${companies.length} companies...`);

        // Process in batches to avoid rate limits
        const batchSize = 10;
        for (let i = 0; i < companies.length; i += batchSize) {
            const batch = companies.slice(i, i + batchSize);

            await Promise.all(
                batch.map(async (company) => {
                    try {
                        // Format ticker for Yahoo Finance
                        const yf_ticker = company.exchange === 'TSXV'
                            ? `${company.ticker}.V`
                            : `${company.ticker}.TO`;

                        // Fetch from Yahoo Finance (using external API or edge function)
                        // TODO: Replace with licensed data provider for production
                        const response = await fetch(
                            `https://query1.finance.yahoo.com/v8/finance/chart/${yf_ticker}?interval=1d&range=1d`,
                            { next: { revalidate: 0 } }
                        );

                        if (!response.ok) {
                            console.warn(`[CRON/prices] Failed to fetch ${yf_ticker}`);
                            errorCount++;
                            return;
                        }

                        const data = await response.json();
                        const quote = data?.chart?.result?.[0]?.meta;
                        const indicators = data?.chart?.result?.[0]?.indicators?.quote?.[0];

                        if (!quote || !indicators) {
                            errorCount++;
                            return;
                        }

                        const currentPrice = quote.regularMarketPrice || indicators.close?.[indicators.close.length - 1];
                        const prevClose = quote.previousClose || quote.chartPreviousClose;

                        if (!currentPrice) {
                            errorCount++;
                            return;
                        }

                        const dayChange = prevClose ? currentPrice - prevClose : null;
                        const dayChangePercent = prevClose ? ((dayChange || 0) / prevClose) * 100 : null;

                        // Update company record
                        const { error: updateError } = await supabase
                            .from('companies')
                            .update({
                                current_price: currentPrice,
                                prev_close: prevClose,
                                day_change: dayChange,
                                day_change_percent: dayChangePercent,
                                day_high: quote.regularMarketDayHigh,
                                day_low: quote.regularMarketDayLow,
                                day_volume: quote.regularMarketVolume,
                                last_updated: new Date().toISOString(),
                            })
                            .eq('id', company.id);

                        if (updateError) {
                            console.error(`[CRON/prices] Update failed for ${company.ticker}:`, updateError);
                            errorCount++;
                        } else {
                            updatedCount++;
                        }
                    } catch (err) {
                        console.error(`[CRON/prices] Error processing ${company.ticker}:`, err);
                        errorCount++;
                    }
                })
            );

            // Small delay between batches to avoid rate limiting
            if (i + batchSize < companies.length) {
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
        }

        const duration = Date.now() - startTime;

        return NextResponse.json({
            success: true,
            updated: updatedCount,
            errors: errorCount,
            total: companies.length,
            durationMs: duration,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[CRON/prices] Fatal error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                updated: updatedCount,
                errors: errorCount,
            },
            { status: 500 }
        );
    }
}
