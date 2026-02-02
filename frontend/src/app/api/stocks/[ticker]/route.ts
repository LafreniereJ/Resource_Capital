import { NextRequest, NextResponse } from 'next/server';
import { getStockDetail } from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ ticker: string }> }
) {
    try {
        const { ticker } = await params;
        const data = getStockDetail(ticker.toUpperCase());

        if (!data) {
            return NextResponse.json(
                { success: false, error: 'Stock not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching stock detail:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch stock detail' },
            { status: 500 }
        );
    }
}
