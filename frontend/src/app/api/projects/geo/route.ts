import { NextResponse } from 'next/server';
import { getGeoProjects } from '@/lib/db';

/**
 * GET /api/projects/geo
 *
 * Returns all projects with coordinates for map display.
 * Optimized single query - replaces N+1 pattern of fetching per-company.
 */
export async function GET() {
    try {
        const projects = await getGeoProjects();

        return NextResponse.json({
            projects,
            count: projects.length,
        });
    } catch (error) {
        console.error('Error fetching geo projects:', error);
        return NextResponse.json(
            { error: 'Failed to fetch projects' },
            { status: 500 }
        );
    }
}
