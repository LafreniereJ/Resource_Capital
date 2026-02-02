import { NextRequest, NextResponse } from 'next/server';
import { getReports, createReport } from '@/lib/db';
import { writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

// GET /api/reports - List all reports
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const ticker = searchParams.get('ticker') || undefined;

        const reports = getReports(ticker);
        return NextResponse.json(reports);
    } catch (error) {
        console.error('Error fetching reports:', error);
        return NextResponse.json(
            { error: 'Failed to fetch reports' },
            { status: 500 }
        );
    }
}

// POST /api/reports - Upload new report
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const title = formData.get('title') as string | null;
        const ticker = formData.get('ticker') as string | null;

        // Validate required fields
        if (!file) {
            return NextResponse.json(
                { error: 'File is required' },
                { status: 400 }
            );
        }

        if (!title) {
            return NextResponse.json(
                { error: 'Title is required' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            return NextResponse.json(
                { error: 'Only PDF files are allowed' },
                { status: 400 }
            );
        }

        // Validate file size (max 50MB)
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: 'File size must be less than 50MB' },
                { status: 400 }
            );
        }

        // Generate unique filename
        const uuid = randomUUID();
        const fileName = `${uuid}.pdf`;
        const filePath = path.join(process.cwd(), 'public', 'reports', fileName);

        // Save file to disk
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // Create database record
        const report = createReport({
            title,
            ticker: ticker || null,
            filename: file.name,
            file_path: fileName,
            file_size: file.size
        });

        return NextResponse.json(report, { status: 201 });
    } catch (error) {
        console.error('Error uploading report:', error);
        return NextResponse.json(
            { error: 'Failed to upload report' },
            { status: 500 }
        );
    }
}
