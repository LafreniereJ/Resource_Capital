import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
    try {
        // Get all companies with price data
        const { data: companies, error } = await supabase
            .from('companies')
            .select(`
                id, ticker, name, commodity,
                current_price, day_change_percent,
                day_volume, avg_volume,
                market_cap
            `)
            .not('current_price', 'is', null);

        if (error) {
            console.error('Error fetching companies:', error);
            return NextResponse.json(
                { error: 'Failed to fetch signals' },
                { status: 500 }
            );
        }

        // Filter for stocks with valid change percent
        const withChange = (companies || []).filter(c => c.day_change_percent !== null);

        // Sort by change percent
        const sortedByChange = [...withChange].sort(
            (a, b) => (b.day_change_percent || 0) - (a.day_change_percent || 0)
        );

        // Top gainers (positive change, top 10)
        const gainers = sortedByChange
            .filter(c => (c.day_change_percent || 0) > 0)
            .slice(0, 10);

        // Top losers (negative change, bottom 10)
        const losers = sortedByChange
            .filter(c => (c.day_change_percent || 0) < 0)
            .slice(-10)
            .reverse();

        // Volume spikes (day_volume > 2x avg_volume)
        const volumeSpikes = (companies || [])
            .filter(c => {
                if (!c.day_volume || !c.avg_volume || c.avg_volume === 0) return false;
                return c.day_volume > c.avg_volume * 2;
            })
            .sort((a, b) => {
                const ratioA = (a.day_volume || 0) / (a.avg_volume || 1);
                const ratioB = (b.day_volume || 0) / (b.avg_volume || 1);
                return ratioB - ratioA;
            })
            .slice(0, 10)
            .map(c => ({
                ...c,
                volume_ratio: c.avg_volume ? (c.day_volume || 0) / c.avg_volume : 0,
            }));

        return NextResponse.json({
            gainers,
            losers,
            volumeSpikes,
            stats: {
                total: companies?.length || 0,
                advancing: gainers.length,
                declining: losers.length,
                volumeSpikes: volumeSpikes.length,
            },
        });
    } catch (error) {
        console.error('Signals API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
