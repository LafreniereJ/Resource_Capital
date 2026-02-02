import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.API_URL || 'http://127.0.0.1:8000';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;

    // Forward all query params to the backend
    const params = new URLSearchParams();
    for (const [key, value] of searchParams.entries()) {
        params.append(key, value);
    }

    try {
        const res = await fetch(
            `${API_BASE}/api/transactions?${params.toString()}`,
            { cache: 'no-store' }
        );

        if (!res.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch transactions' },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Transactions fetch error:', error);
        return NextResponse.json(
            { error: 'Transactions service unavailable' },
            { status: 503 }
        );
    }
}
