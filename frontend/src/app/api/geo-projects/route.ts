import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
    try {
        // Get all projects with coordinates, joined with company info
        const { data, error } = await supabase
            .from('projects')
            .select(`
                id,
                name,
                company_id,
                latitude,
                longitude,
                commodity,
                stage,
                location,
                companies!inner(name, ticker)
            `)
            .not('latitude', 'is', null)
            .not('longitude', 'is', null);

        if (error) {
            console.error('Error fetching geo projects:', error);
            return NextResponse.json(
                { error: 'Failed to fetch projects', projects: [] },
                { status: 500 }
            );
        }

        // Transform to expected format
        const projects = (data || []).map(p => ({
            id: p.id,
            name: p.name,
            company_id: p.company_id,
            company_name: (p.companies as any)?.name || 'Unknown',
            ticker: (p.companies as any)?.ticker || '',
            latitude: p.latitude,
            longitude: p.longitude,
            commodity: p.commodity,
            stage: p.stage,
            location: p.location,
        }));

        // Get commodity distribution stats
        const commodityCounts: Record<string, number> = {};
        for (const p of projects) {
            if (p.commodity) {
                const comm = p.commodity.toLowerCase();
                if (comm.includes('gold')) commodityCounts['Gold'] = (commodityCounts['Gold'] || 0) + 1;
                else if (comm.includes('silver')) commodityCounts['Silver'] = (commodityCounts['Silver'] || 0) + 1;
                else if (comm.includes('copper')) commodityCounts['Copper'] = (commodityCounts['Copper'] || 0) + 1;
                else if (comm.includes('uranium')) commodityCounts['Uranium'] = (commodityCounts['Uranium'] || 0) + 1;
                else if (comm.includes('lithium')) commodityCounts['Lithium'] = (commodityCounts['Lithium'] || 0) + 1;
                else commodityCounts['Other'] = (commodityCounts['Other'] || 0) + 1;
            }
        }

        return NextResponse.json({
            projects,
            count: projects.length,
            commodityDistribution: commodityCounts,
        });
    } catch (error) {
        console.error('Geo projects API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', projects: [] },
            { status: 500 }
        );
    }
}
