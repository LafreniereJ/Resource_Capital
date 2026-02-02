import { getReportById, getCompanyByTicker } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Building2, Calendar, FileText, ExternalLink } from 'lucide-react';
import { generateReportMetadata } from '@/lib/metadata';

interface ReportPageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ReportPageProps) {
    const { id } = await params;
    const reportId = parseInt(id);
    const report = getReportById(reportId);

    if (!report) {
        return { title: 'Report Not Found | Resource Capital' };
    }

    return generateReportMetadata(report.title, reportId);
}

export default async function ReportPage({ params }: ReportPageProps) {
    const { id } = await params;
    const reportId = parseInt(id);

    if (isNaN(reportId)) {
        notFound();
    }

    const report = getReportById(reportId);

    if (!report) {
        notFound();
    }

    // Get company info if ticker exists
    const company = report.ticker ? getCompanyByTicker(report.ticker) as { id: number; name: string; ticker: string } | undefined : null;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="min-h-screen bg-[#030712] text-slate-200">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/5 blur-[150px] rounded-full" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/5 blur-[150px] rounded-full" />
            </div>

            {/* Header */}
            <header className="relative z-20 border-b border-white/5">
                <div className="max-w-[1400px] mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <Link
                            href="/reports"
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft size={20} />
                            <span className="font-medium">Back to Reports</span>
                        </Link>

                        <a
                            href={`/reports/${report.file_path}`}
                            download={report.filename}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold transition-all"
                        >
                            <Download size={18} />
                            Download PDF
                        </a>
                    </div>
                </div>
            </header>

            {/* Report Info */}
            <div className="relative z-10 border-b border-white/5 bg-slate-950/50">
                <div className="max-w-[1400px] mx-auto px-6 py-8">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                        <div className="flex-1">
                            <h1 className="text-3xl font-black text-white mb-4 leading-tight">
                                {report.title}
                            </h1>

                            <div className="flex flex-wrap items-center gap-4 text-slate-400">
                                <span className="flex items-center gap-2">
                                    <Calendar size={16} />
                                    {formatDate(report.created_at)}
                                </span>
                                {report.file_size && (
                                    <span className="flex items-center gap-2">
                                        <FileText size={16} />
                                        {formatFileSize(report.file_size)}
                                    </span>
                                )}
                                {report.ticker && (
                                    <Link
                                        href={`/companies/${report.ticker}`}
                                        className="flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-500/20 text-blue-400 font-bold hover:bg-blue-500/30 transition-all"
                                    >
                                        <Building2 size={14} />
                                        {report.ticker}
                                        {company && ` - ${company.name}`}
                                        <ExternalLink size={12} />
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PDF Viewer */}
            <main className="relative z-10">
                <div className="max-w-[1400px] mx-auto px-6 py-8">
                    <div className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
                        {/* PDF Embed - Full Height */}
                        <div className="w-full" style={{ height: 'calc(100vh - 280px)', minHeight: '600px' }}>
                            <iframe
                                src={`/reports/${report.file_path}`}
                                className="w-full h-full"
                                title={report.title}
                            />
                        </div>

                        {/* Fallback for mobile/unsupported browsers */}
                        <div className="p-6 border-t border-white/5 bg-slate-900/30">
                            <p className="text-sm text-slate-500 text-center">
                                PDF not displaying?{' '}
                                <a
                                    href={`/reports/${report.file_path}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-400 hover:text-indigo-300 font-medium"
                                >
                                    Open in new tab
                                </a>
                                {' '}or{' '}
                                <a
                                    href={`/reports/${report.file_path}`}
                                    download={report.filename}
                                    className="text-indigo-400 hover:text-indigo-300 font-medium"
                                >
                                    download the file
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
