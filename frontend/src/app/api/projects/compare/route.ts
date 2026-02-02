import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.API_URL || 'http://127.0.0.1:8000';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const projectIds = searchParams.get('project_ids');

    if (!projectIds) {
        return NextResponse.json(
            { error: 'project_ids parameter is required' },
            { status: 400 }
        );
    }

    try {
        const res = await fetch(
            `${API_BASE}/api/projects/compare?project_ids=${projectIds}`,
            { cache: 'no-store' }
        );

        if (!res.ok) {
            return NextResponse.json(
                { error: 'Failed to compare projects' },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Compare fetch error:', error);
        return NextResponse.json(
            { error: 'Comparison service unavailable' },
            { status: 503 }
        );
    }
}
