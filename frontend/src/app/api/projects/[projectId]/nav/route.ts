import { NextResponse } from 'next/server';

const API_BASE = process.env.API_URL || 'http://127.0.0.1:8000';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const { projectId } = await params;

    try {
        const res = await fetch(`${API_BASE}/api/projects/${projectId}/nav`, {
            cache: 'no-store',
        });

        if (!res.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch NAV data' },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('NAV fetch error:', error);
        return NextResponse.json(
            { error: 'NAV service unavailable' },
            { status: 503 }
        );
    }
}
