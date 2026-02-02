import { NextRequest, NextResponse } from 'next/server';
import { getCompanyByTicker, getPriceHistory } from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ ticker: string }> }
) {
    try {
        const { ticker } = await params;
        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get('date');

        // Get company first
        const company = await getCompanyByTicker(ticker.toUpperCase()) as any;
        if (!company) {
            return NextResponse.json(
                { success: false, error: 'Stock not found' },
                { status: 404 }
            );
        }

        // If no date specified, return current price
        if (!dateParam) {
            return NextResponse.json({
                success: true,
                ticker: company.ticker,
                price: company.current_price,
                date: company.last_updated,
                isCurrent: true
            });
        }

        // Get historical prices
        const priceHistory = await getPriceHistory(company.id, 730) as any[]; // 2 years of data

        if (!priceHistory || priceHistory.length === 0) {
            // Fall back to current price
            return NextResponse.json({
                success: true,
                ticker: company.ticker,
                price: company.current_price,
                date: dateParam,
                isCurrent: true,
                note: 'Historical data not available, using current price'
            });
        }

        // Find the closest price to the requested date
        const targetDate = new Date(dateParam);
        let closestPrice = priceHistory[0];
        let minDiff = Infinity;

        for (const price of priceHistory) {
            const priceDate = new Date(price.date);
            const diff = Math.abs(priceDate.getTime() - targetDate.getTime());
            if (diff < minDiff) {
                minDiff = diff;
                closestPrice = price;
            }
        }

        // Check if we found a reasonable match (within 7 days)
        const daysDiff = minDiff / (1000 * 60 * 60 * 24);
        if (daysDiff > 7) {
            return NextResponse.json({
                success: true,
                ticker: company.ticker,
                price: company.current_price,
                date: dateParam,
                isCurrent: true,
                note: `No historical data within 7 days of ${dateParam}, using current price`
            });
        }

        return NextResponse.json({
            success: true,
            ticker: company.ticker,
            price: closestPrice.close,
            date: closestPrice.date,
            requestedDate: dateParam,
            isCurrent: false
        });

    } catch (error) {
        console.error('Error fetching stock price:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch stock price' },
            { status: 500 }
        );
    }
}
