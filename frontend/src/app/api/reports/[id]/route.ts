import { NextResponse } from 'next/server';
import { getReportById, deleteReport } from '@/lib/db';
import { unlink } from 'fs/promises';
import path from 'path';

// GET /api/reports/[id] - Get single report
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const reportId = parseInt(id);

        if (isNaN(reportId)) {
            return NextResponse.json(
                { error: 'Invalid report ID' },
                { status: 400 }
            );
        }

        const report = getReportById(reportId);

        if (!report) {
            return NextResponse.json(
                { error: 'Report not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(report);
    } catch (error) {
        console.error('Error fetching report:', error);
        return NextResponse.json(
            { error: 'Failed to fetch report' },
            { status: 500 }
        );
    }
}

// DELETE /api/reports/[id] - Delete report
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const reportId = parseInt(id);

        if (isNaN(reportId)) {
            return NextResponse.json(
                { error: 'Invalid report ID' },
                { status: 400 }
            );
        }

        const report = getReportById(reportId);

        if (!report) {
            return NextResponse.json(
                { error: 'Report not found' },
                { status: 404 }
            );
        }

        // Delete file from disk
        const filePath = path.join(process.cwd(), 'public', 'reports', report.file_path);
        try {
            await unlink(filePath);
        } catch (e) {
            // File might not exist, continue with db deletion
            console.warn('Could not delete file:', filePath);
        }

        // Delete from database
        const deleted = deleteReport(reportId);

        if (!deleted) {
            return NextResponse.json(
                { error: 'Failed to delete report' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting report:', error);
        return NextResponse.json(
            { error: 'Failed to delete report' },
            { status: 500 }
        );
    }
}
