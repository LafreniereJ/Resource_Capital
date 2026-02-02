import { NextRequest, NextResponse } from 'next/server';
import { getCompany, getAllProjects } from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ ticker: string }> }
) {
    try {
        const { ticker } = await params;
        const company = getCompany(ticker.toUpperCase()) as any;

        if (!company) {
            return NextResponse.json(
                { success: false, error: 'Company not found' },
                { status: 404 }
            );
        }

        const projects = getAllProjects(company.id);

        // Return array directly for compatibility with map page
        return NextResponse.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch projects' },
            { status: 500 }
        );
    }
}
