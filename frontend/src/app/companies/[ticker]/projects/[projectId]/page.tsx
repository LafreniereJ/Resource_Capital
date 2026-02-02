import { getProjectById, getProjectMetrics, getCompanyByTicker } from '@/lib/db';
import Link from 'next/link';
import NavCard from '@/components/NavCard';
import SensitivitySlider from '@/components/SensitivitySlider';
import { generateProjectMetadata } from '@/lib/metadata';

interface ProjectPageProps {
    params: Promise<{ ticker: string; projectId: string }>;
}

export async function generateMetadata({ params }: ProjectPageProps) {
    const { ticker, projectId } = await params;
    const company = await getCompanyByTicker(ticker.toUpperCase()) as { name: string; ticker: string } | null;
    const project = await getProjectById(parseInt(projectId)) as { name: string } | null;

    if (!company || !project) {
        return { title: 'Project Not Found | Resource Capital' };
    }

    return generateProjectMetadata(project.name, company.name, company.ticker);
}

export default async function ProjectPage({ params }: ProjectPageProps) {
    const { ticker, projectId } = await params;
    const company = await getCompanyByTicker(ticker.toUpperCase()) as any;
    const project = await getProjectById(parseInt(projectId)) as any;

    if (!company || !project) {
        return (
            <div className="min-h-screen bg-[var(--color-bg-base)] flex flex-col items-center justify-center text-gray-400">
                <h1 className="text-2xl font-bold text-white mb-2">Project Not Found</h1>
                <p>Could not find project ID: {projectId}</p>
                <Link href={`/companies/${ticker}`} className="mt-4 text-[var(--color-accent)] hover:underline">
                    Return to Company
                </Link>
            </div>
        );
    }

    const metrics = await getProjectMetrics(parseInt(projectId)) as any[];

    // Group metrics by category
    const productionMetrics = metrics.filter(m =>
        m.metric_name?.toLowerCase().includes('production') ||
        m.metric_name?.toLowerCase().includes('output') ||
        m.metric_name?.toLowerCase().includes('tonnes')
    );

    const costMetrics = metrics.filter(m =>
        m.metric_name?.toLowerCase().includes('cost') ||
        m.metric_name?.toLowerCase().includes('aisc') ||
        m.metric_name?.toLowerCase().includes('expense')
    );

    const resourceMetrics = metrics.filter(m =>
        m.metric_name?.toLowerCase().includes('resource') ||
        m.metric_name?.toLowerCase().includes('reserve') ||
        m.metric_name?.toLowerCase().includes('grade')
    );

    const otherMetrics = metrics.filter(m =>
        !productionMetrics.includes(m) &&
        !costMetrics.includes(m) &&
        !resourceMetrics.includes(m)
    );

    return (
        <main className="min-h-screen bg-[var(--color-bg-base)] text-gray-200 font-sans overflow-x-hidden selection:bg-[var(--color-accent-muted)]">
            {/* Premium Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/5 blur-[120px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-600/5 blur-[120px]"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
            </div>

            <div className="relative z-10 px-6 md:px-12 py-8 max-w-6xl mx-auto">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
                    <Link href="/stocks" className="hover:text-[var(--color-accent)] transition">Screener</Link>
                    <span>→</span>
                    <Link href={`/companies/${ticker}`} className="hover:text-[var(--color-accent)] transition">{company.name}</Link>
                    <span>→</span>
                    <span className="text-white">{project.name}</span>
                </div>

                {/* Project Header */}
                <div className="mb-10">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 blur-xl opacity-30"></div>
                            <div className="relative w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg">
                                ⛏️
                            </div>
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-600">
                                {project.name}
                            </h1>
                            <p className="text-gray-500">
                                Owned by <Link href={`/companies/${ticker}`} className="text-[var(--color-accent)] hover:underline">{company.name}</Link>
                            </p>
                        </div>
                    </div>

                    {/* Project Tags */}
                    <div className="flex flex-wrap items-center gap-3">
                        {project.commodity && (
                            <span className="px-4 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-sm font-bold">
                                {project.commodity}
                            </span>
                        )}
                        {project.stage && (
                            <span className="px-4 py-2 rounded-xl bg-[var(--color-accent-muted)] text-[var(--color-accent-light)] border border-[var(--color-accent)]/20 text-sm font-bold">
                                {project.stage}
                            </span>
                        )}
                        {project.location && (
                            <span className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-sm">
                                📍 {project.location}
                            </span>
                        )}
                    </div>
                </div>

                {/* NAV Card and Sensitivity Slider */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                    <NavCard projectId={parseInt(projectId)} />
                    <SensitivitySlider projectId={parseInt(projectId)} />
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    <div className="bg-[var(--color-bg-surface)]/60 border border-white/5 rounded-xl p-4">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Metrics</p>
                        <p className="text-2xl font-bold text-white font-mono">{metrics.length}</p>
                    </div>
                    <div className="bg-[var(--color-bg-surface)]/60 border border-white/5 rounded-xl p-4">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Production Data</p>
                        <p className="text-2xl font-bold text-white font-mono">{productionMetrics.length}</p>
                    </div>
                    <div className="bg-[var(--color-bg-surface)]/60 border border-white/5 rounded-xl p-4">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Cost Data</p>
                        <p className="text-2xl font-bold text-white font-mono">{costMetrics.length}</p>
                    </div>
                    <div className="bg-[var(--color-bg-surface)]/60 border border-white/5 rounded-xl p-4">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Resource Data</p>
                        <p className="text-2xl font-bold text-white font-mono">{resourceMetrics.length}</p>
                    </div>
                </div>

                {/* Metrics Sections */}
                <div className="space-y-8">
                    {/* Production Metrics */}
                    {productionMetrics.length > 0 && (
                        <div className="bg-[var(--color-bg-surface)]/60 border border-white/10 rounded-2xl overflow-hidden">
                            <div className="p-6 border-b border-white/5">
                                <h2 className="flex items-center gap-2 font-bold text-white">
                                    <span className="w-1 h-5 bg-emerald-500 rounded-full"></span>
                                    Production Metrics
                                </h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-white/[0.02]">
                                        <tr className="border-b border-white/5">
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Metric</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Value</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Unit</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {productionMetrics.map((m, idx) => (
                                            <tr key={idx} className="hover:bg-white/[0.02] transition">
                                                <td className="px-6 py-4 text-white font-medium">{m.metric_name}</td>
                                                <td className="px-6 py-4 text-right font-mono text-emerald-400 font-bold">
                                                    {m.metric_value?.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">{m.unit || '—'}</td>
                                                <td className="px-6 py-4 text-gray-600 text-xs">{m.filing_date?.split('T')[0] || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Cost Metrics */}
                    {costMetrics.length > 0 && (
                        <div className="bg-[var(--color-bg-surface)]/60 border border-white/10 rounded-2xl overflow-hidden">
                            <div className="p-6 border-b border-white/5">
                                <h2 className="flex items-center gap-2 font-bold text-white">
                                    <span className="w-1 h-5 bg-amber-500 rounded-full"></span>
                                    Cost Metrics
                                </h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-white/[0.02]">
                                        <tr className="border-b border-white/5">
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Metric</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Value</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Unit</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {costMetrics.map((m, idx) => (
                                            <tr key={idx} className="hover:bg-white/[0.02] transition">
                                                <td className="px-6 py-4 text-white font-medium">{m.metric_name}</td>
                                                <td className="px-6 py-4 text-right font-mono text-amber-400 font-bold">
                                                    {m.metric_value?.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">{m.unit || '—'}</td>
                                                <td className="px-6 py-4 text-gray-600 text-xs">{m.filing_date?.split('T')[0] || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Resource Metrics */}
                    {resourceMetrics.length > 0 && (
                        <div className="bg-[var(--color-bg-surface)]/60 border border-white/10 rounded-2xl overflow-hidden">
                            <div className="p-6 border-b border-white/5">
                                <h2 className="flex items-center gap-2 font-bold text-white">
                                    <span className="w-1 h-5 bg-[var(--color-gradient-mid)] rounded-full"></span>
                                    Resource & Reserve Estimates
                                </h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-white/[0.02]">
                                        <tr className="border-b border-white/5">
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Metric</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Value</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Unit</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {resourceMetrics.map((m, idx) => (
                                            <tr key={idx} className="hover:bg-white/[0.02] transition">
                                                <td className="px-6 py-4 text-white font-medium">{m.metric_name}</td>
                                                <td className="px-6 py-4 text-right font-mono text-purple-400 font-bold">
                                                    {m.metric_value?.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">{m.unit || '—'}</td>
                                                <td className="px-6 py-4 text-gray-600 text-xs">{m.filing_date?.split('T')[0] || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Other Metrics */}
                    {otherMetrics.length > 0 && (
                        <div className="bg-[var(--color-bg-surface)]/60 border border-white/10 rounded-2xl overflow-hidden">
                            <div className="p-6 border-b border-white/5">
                                <h2 className="flex items-center gap-2 font-bold text-white">
                                    <span className="w-1 h-5 bg-[var(--color-accent)] rounded-full"></span>
                                    Other Extracted Data
                                </h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-white/[0.02]">
                                        <tr className="border-b border-white/5">
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Metric</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Value</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Unit</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Confidence</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {otherMetrics.map((m, idx) => (
                                            <tr key={idx} className="hover:bg-white/[0.02] transition">
                                                <td className="px-6 py-4 text-white font-medium">{m.metric_name}</td>
                                                <td className="px-6 py-4 text-right font-mono text-[var(--color-accent)] font-bold">
                                                    {m.metric_value?.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">{m.unit || '—'}</td>
                                                <td className="px-6 py-4 text-gray-600 text-xs">{m.filing_date?.split('T')[0] || '—'}</td>
                                                <td className="px-6 py-4 text-right">
                                                    {m.confidence_score && (
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${m.confidence_score > 0.8 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                                            }`}>
                                                            {(m.confidence_score * 100).toFixed(0)}%
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* No Metrics Message */}
                    {metrics.length === 0 && (
                        <div className="bg-[var(--color-bg-surface)]/60 border border-white/10 rounded-2xl p-12 text-center">
                            <div className="text-4xl mb-4">📊</div>
                            <h3 className="text-xl font-bold text-white mb-2">No Metrics Extracted Yet</h3>
                            <p className="text-gray-500 max-w-md mx-auto">
                                Run the document ingestion pipeline on technical reports or quarterly filings for this project to extract production, cost, and resource metrics.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
