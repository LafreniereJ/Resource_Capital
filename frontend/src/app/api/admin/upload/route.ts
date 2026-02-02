import { supabase, getCompanyByTicker } from '@/lib/db';
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const data = await request.formData();
        const file: File | null = data.get('file') as unknown as File;
        const ticker = data.get('ticker') as string;
        const docType = data.get('docType') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Identify company
        const company = await getCompanyByTicker(ticker);

        if (!company) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        // Prepare save directory
        const uploadDir = path.join(process.cwd(), '../downloads/manual_uploads');
        await mkdir(uploadDir, { recursive: true });

        // Sanitize filename and save
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const timestamp = Date.now();
        const safeName = `${ticker}_${docType}_${timestamp}.pdf`;
        const localPath = path.join(uploadDir, safeName);

        await writeFile(localPath, buffer);

        // Calculate hash for duplicate detection
        const hash = crypto.createHash('md5').update(buffer).digest('hex');

        // Insert into extraction_queue using Supabase
        const { data: result, error } = await supabase
            .from('extraction_queue')
            .insert({
                url: `manual://${safeName}`,
                source: 'manual_upload',
                extraction_type: docType,
                company_id: company.id,
                status: 'pending',
                priority: 10,
            })
            .select('id')
            .single();

        if (error) {
            console.error('Insert error:', error);
            return NextResponse.json({ error: 'Failed to queue document' }, { status: 500 });
        }

        return NextResponse.json({ success: true, id: result?.id });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
