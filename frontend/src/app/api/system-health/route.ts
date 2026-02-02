import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
    try {
        // Get most recent update times from each data source
        const [stocksResult, metalsResult, newsResult] = await Promise.all([
            // Latest stock update
            supabase
                .from('companies')
                .select('last_updated')
                .not('last_updated', 'is', null)
                .order('last_updated', { ascending: false })
                .limit(1)
                .single(),

            // Latest metal price update
            supabase
                .from('metal_prices')
                .select('fetched_at')
                .order('fetched_at', { ascending: false })
                .limit(1)
                .single(),

            // Latest news update
            supabase
                .from('news')
                .select('fetched_at')
                .order('fetched_at', { ascending: false })
                .limit(1)
                .single(),
        ]);

        const lastStockUpdate = stocksResult.data?.last_updated || null;
        const lastMetalUpdate = metalsResult.data?.fetched_at || null;
        const lastNewsUpdate = newsResult.data?.fetched_at || null;

        // Determine overall status
        const now = new Date();
        const STALE_THRESHOLD_MINUTES = 60; // Data older than 60 min is stale
        const DEGRADED_THRESHOLD_MINUTES = 30; // Data older than 30 min is degraded

        const isStale = (dateStr: string | null) => {
            if (!dateStr) return true;
            const date = new Date(dateStr);
            const diffMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
            return diffMinutes > STALE_THRESHOLD_MINUTES;
        };

        const isDegraded = (dateStr: string | null) => {
            if (!dateStr) return true;
            const date = new Date(dateStr);
            const diffMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
            return diffMinutes > DEGRADED_THRESHOLD_MINUTES;
        };

        // Check each data source
        const stocksStale = isStale(lastStockUpdate);
        const metalsStale = isStale(lastMetalUpdate);
        const stocksDegraded = isDegraded(lastStockUpdate);
        const metalsDegraded = isDegraded(lastMetalUpdate);

        let status: 'healthy' | 'degraded' | 'stale';
        if (stocksStale && metalsStale) {
            status = 'stale';
        } else if (stocksDegraded || metalsDegraded) {
            status = 'degraded';
        } else {
            status = 'healthy';
        }

        return NextResponse.json({
            status,
            lastStockUpdate,
            lastMetalUpdate,
            lastNewsUpdate,
            details: {
                stocks: {
                    lastUpdate: lastStockUpdate,
                    isStale: stocksStale,
                    isDegraded: stocksDegraded,
                },
                metals: {
                    lastUpdate: lastMetalUpdate,
                    isStale: metalsStale,
                    isDegraded: metalsDegraded,
                },
                news: {
                    lastUpdate: lastNewsUpdate,
                },
            },
        });
    } catch (error) {
        console.error('System health API error:', error);
        return NextResponse.json({
            status: 'stale',
            lastStockUpdate: null,
            lastMetalUpdate: null,
            lastNewsUpdate: null,
            error: 'Failed to check system health',
        });
    }
}
