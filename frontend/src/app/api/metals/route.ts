import { NextResponse } from 'next/server';
import { getMetalPrices } from '@/lib/db';

interface MetalPrice {
    id: number;
    commodity: string;
    symbol: string;
    price: number;
    currency: string;
    change_percent: number | null;
    day_high: number | null;
    day_low: number | null;
    prev_close: number | null;
    source: string;
    fetched_at: string;
}

export async function GET() {
    try {
        const metals = await getMetalPrices() as MetalPrice[];

        // Transform to frontend-friendly format
        const formatted = metals.map(m => ({
            name: capitalizeFirst(m.commodity),
            symbol: m.symbol,
            price: m.price,
            change: m.change_percent ?? 0,
            currency: m.currency,
            dayHigh: m.day_high,
            dayLow: m.day_low,
            prevClose: m.prev_close,
            source: m.source,
            updatedAt: m.fetched_at
        }));

        return NextResponse.json({
            success: true,
            data: formatted,
            count: formatted.length
        });
    } catch (error) {
        console.error('Error fetching metal prices:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch metal prices' },
            { status: 500 }
        );
    }
}

function capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
