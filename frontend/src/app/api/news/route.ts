import { NextResponse } from 'next/server';
import { getNews } from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const ticker = searchParams.get('ticker') || undefined;
    const source = searchParams.get('source') || undefined;
    const search = searchParams.get('search') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    try {
        const offset = (page - 1) * limit;

        const news = await getNews({
            ticker,
            source,
            search,
            dateFrom,
            dateTo,
            limit,
            offset
        });

        return NextResponse.json({
            success: true,
            data: news,
            page,
            limit
        });
    } catch (error) {
        console.error('Error fetching news:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch news' },
            { status: 500 }
        );
    }
}
