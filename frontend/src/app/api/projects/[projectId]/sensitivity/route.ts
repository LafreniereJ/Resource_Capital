import { NextResponse } from 'next/server';

const API_BASE = process.env.API_URL || 'http://127.0.0.1:8000';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const { projectId } = await params;
    const url = new URL(request.url);
    const commodity = url.searchParams.get('commodity') || 'gold';
    const steps = url.searchParams.get('steps') || '10';

    try {
        const res = await fetch(
            `${API_BASE}/api/projects/${projectId}/sensitivity?commodity=${commodity}&steps=${steps}`,
            { cache: 'no-store' }
        );

        if (!res.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch sensitivity data' },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Sensitivity fetch error:', error);
        return NextResponse.json(
            { error: 'Sensitivity service unavailable' },
            { status: 503 }
        );
    }
}
