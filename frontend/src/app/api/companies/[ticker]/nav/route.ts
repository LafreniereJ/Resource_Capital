import { NextResponse } from 'next/server';

const API_BASE = process.env.API_URL || 'http://127.0.0.1:8000';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ ticker: string }> }
) {
    const { ticker } = await params;

    try {
        const res = await fetch(`${API_BASE}/api/companies/${ticker}/nav`, {
            cache: 'no-store',
        });

        if (!res.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch company NAV' },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Company NAV fetch error:', error);
        return NextResponse.json(
            { error: 'NAV service unavailable' },
            { status: 503 }
        );
    }
}
