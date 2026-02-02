import { supabase } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Note: ingestion_queue table may not exist in the schema
    // This is an admin feature - return empty if table doesn't exist
    const { data: queue, error } = await supabase
      .from('extraction_queue')  // Using extraction_queue from schema
      .select(`
                id,
                extraction_type,
                status,
                priority,
                created_at,
                source,
                url,
                companies!inner(name, ticker)
            `)
      .in('status', ['pending', 'processing', 'failed'])
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Queue query error:', error);
      return NextResponse.json([]);
    }

    // Transform to match expected format
    const transformed = (queue || []).map(q => ({
      id: q.id,
      source_type: q.source,
      document_type: q.extraction_type,
      status: q.status?.toUpperCase(),
      priority: q.priority,
      discovered_at: q.created_at,
      company_name: (q.companies as any)?.name,
      ticker: (q.companies as any)?.ticker,
      source_url: q.url
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Error fetching ingestion queue:', error);
    return NextResponse.json([]);
  }
}
