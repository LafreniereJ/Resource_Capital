/**
 * NI 43-101 Resource & Economics Display Component
 *
 * Displays mineral reserves, resources, and project economics
 * from NI 43-101 technical reports in a clean, organized layout.
 */

import Link from 'next/link';
import { CompanyReserveSummary, CompanyEconomicsSummary } from '@/lib/db';

interface NI43101SectionProps {
    companyId: number;
    ticker: string;
    reserves: CompanyReserveSummary[];
    economics: CompanyEconomicsSummary[];
}

// Format large numbers with appropriate units
function formatNumber(value: number | null | undefined, decimals: number = 2): string {
    if (value === null || value === undefined) return '-';
    if (value >= 1000) return `${(value / 1000).toFixed(decimals)}B`;
    if (value >= 1) return `${value.toFixed(decimals)}M`;
    return `${(value * 1000).toFixed(0)}k`;
}

// Format tonnes (already in millions)
function formatTonnes(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-';
    if (value >= 1000) return `${(value / 1000).toFixed(1)}Bt`;
    return `${value.toFixed(1)}Mt`;
}

// Format grade
function formatGrade(value: number | null | undefined, unit: string | null): string {
    if (value === null || value === undefined) return '-';
    return `${value.toFixed(2)} ${unit || 'g/t'}`;
}

// Format contained metal
function formatContained(value: number | null | undefined, unit: string | null): string {
    if (value === null || value === undefined) return '-';
    const displayUnit = unit || 'Moz';
    if (displayUnit.toLowerCase().includes('moz')) {
        return `${value.toFixed(2)} Moz`;
    }
    return `${value.toFixed(2)} ${displayUnit}`;
}

// Get category display color
function getCategoryColor(category: string, isReserve: boolean): string {
    if (isReserve) {
        return 'text-amber-400';
    }
    const cat = category.toLowerCase();
    if (cat.includes('measured') && !cat.includes('indicated')) return 'text-emerald-400';
    if (cat.includes('indicated')) return 'text-cyan-400';
    if (cat.includes('inferred')) return 'text-purple-400';
    return 'text-gray-400';
}

// Get study type badge color
function getStudyTypeColor(studyType: string | null): string {
    if (!studyType) return 'bg-gray-500/20 text-gray-400';
    const type = studyType.toLowerCase();
    if (type === 'dfs' || type === 'fs') return 'bg-emerald-500/20 text-emerald-400';
    if (type === 'pfs') return 'bg-cyan-500/20 text-cyan-400';
    if (type === 'pea') return 'bg-amber-500/20 text-amber-400';
    return 'bg-gray-500/20 text-gray-400';
}

export default function NI43101Section({ companyId, ticker, reserves, economics }: NI43101SectionProps) {
    // Separate reserves and resources
    const mineralReserves = reserves.filter(r => r.is_reserve === 1);
    const mineralResources = reserves.filter(r => r.is_reserve === 0);

    // Calculate totals
    const totalReserveOz = mineralReserves.reduce((sum, r) => sum + (r.total_contained || 0), 0);
    const totalResourceOz = mineralResources.reduce((sum, r) => sum + (r.total_contained || 0), 0);

    // Check if we have any data
    const hasReserves = mineralReserves.length > 0;
    const hasResources = mineralResources.length > 0;
    const hasEconomics = economics.length > 0;
    const hasData = hasReserves || hasResources || hasEconomics;

    if (!hasData) {
        return null; // Don't render if no NI 43-101 data
    }

    return (
        <div className="mb-10">
            {/* Section Header */}
            <h2 className="flex items-center gap-2 text-lg font-bold text-white mb-6">
                <span className="w-1 h-6 bg-violet-500 rounded-full"></span>
                NI 43-101 Technical Data
                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-violet-500/20 text-violet-400 rounded">
                    {hasEconomics ? economics[0]?.study_type?.toUpperCase() || 'Report' : 'Resource Estimate'}
                </span>
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Reserves & Resources Card */}
                {(hasReserves || hasResources) && (
                    <div className="bg-gradient-to-br from-violet-900/20 to-transparent border border-violet-500/20 rounded-2xl overflow-hidden">
                        <div className="p-5 border-b border-white/5">
                            <h3 className="flex items-center gap-2 font-bold text-white">
                                <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                Mineral Reserves & Resources
                            </h3>
                            {/* Summary badges */}
                            <div className="flex gap-3 mt-2">
                                {totalReserveOz > 0 && (
                                    <span className="text-xs text-amber-400">
                                        Reserves: {formatContained(totalReserveOz, 'Moz')}
                                    </span>
                                )}
                                {totalResourceOz > 0 && (
                                    <span className="text-xs text-cyan-400">
                                        Resources: {formatContained(totalResourceOz, 'Moz')}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs text-gray-500 uppercase border-b border-white/5">
                                        <th className="text-left py-3 px-4 font-medium">Category</th>
                                        <th className="text-right py-3 px-4 font-medium">Tonnes</th>
                                        <th className="text-right py-3 px-4 font-medium">Grade</th>
                                        <th className="text-right py-3 px-4 font-medium">Contained</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Reserves Section */}
                                    {hasReserves && (
                                        <>
                                            <tr className="border-b border-white/5 bg-amber-500/5">
                                                <td colSpan={4} className="py-2 px-4 text-xs font-bold text-amber-400 uppercase tracking-wide">
                                                    Mineral Reserves
                                                </td>
                                            </tr>
                                            {mineralReserves.map((reserve, idx) => (
                                                <tr key={`reserve-${idx}`} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className={`py-3 px-4 font-medium ${getCategoryColor(reserve.category, true)}`}>
                                                        {reserve.category}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-gray-300 font-mono">
                                                        {formatTonnes(reserve.total_tonnes)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-gray-300 font-mono">
                                                        {formatGrade(reserve.avg_grade, reserve.grade_unit)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-white font-mono font-bold">
                                                        {formatContained(reserve.total_contained, reserve.contained_unit)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </>
                                    )}

                                    {/* Resources Section */}
                                    {hasResources && (
                                        <>
                                            <tr className="border-b border-white/5 bg-cyan-500/5">
                                                <td colSpan={4} className="py-2 px-4 text-xs font-bold text-cyan-400 uppercase tracking-wide">
                                                    Mineral Resources
                                                </td>
                                            </tr>
                                            {mineralResources.map((resource, idx) => (
                                                <tr key={`resource-${idx}`} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className={`py-3 px-4 font-medium ${getCategoryColor(resource.category, false)}`}>
                                                        {resource.category}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-gray-300 font-mono">
                                                        {formatTonnes(resource.total_tonnes)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-gray-300 font-mono">
                                                        {formatGrade(resource.avg_grade, resource.grade_unit)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-white font-mono font-bold">
                                                        {formatContained(resource.total_contained, resource.contained_unit)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Report date footer */}
                        {(mineralReserves[0]?.latest_report_date || mineralResources[0]?.latest_report_date) && (
                            <div className="px-4 py-2 text-xs text-gray-500 border-t border-white/5">
                                Latest report: {mineralReserves[0]?.latest_report_date || mineralResources[0]?.latest_report_date}
                            </div>
                        )}
                    </div>
                )}

                {/* Economics Card */}
                {hasEconomics && (
                    <div className="bg-gradient-to-br from-amber-900/20 to-transparent border border-amber-500/20 rounded-2xl overflow-hidden">
                        <div className="p-5 border-b border-white/5">
                            <h3 className="flex items-center gap-2 font-bold text-white">
                                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Project Economics
                            </h3>
                        </div>

                        <div className="p-5">
                            {/* Primary economics display - first/best study */}
                            {economics[0] && (
                                <div className="space-y-4">
                                    {/* Study header */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-400">{economics[0].project_name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`px-2 py-0.5 text-xs font-bold rounded ${getStudyTypeColor(economics[0].study_type)}`}>
                                                    {economics[0].study_type?.toUpperCase() || 'Study'}
                                                </span>
                                                {economics[0].study_date && (
                                                    <span className="text-xs text-gray-500">
                                                        {economics[0].study_date}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Key metrics grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {economics[0].npv_million && (
                                            <div className="bg-black/20 rounded-lg p-3">
                                                <p className="text-xs text-gray-500 uppercase">
                                                    NPV{economics[0].npv_discount_rate ? ` @${economics[0].npv_discount_rate}%` : ''}
                                                </p>
                                                <p className="text-lg font-bold text-emerald-400 font-mono">
                                                    ${economics[0].npv_million.toFixed(0)}M
                                                </p>
                                            </div>
                                        )}

                                        {economics[0].irr_percent && (
                                            <div className="bg-black/20 rounded-lg p-3">
                                                <p className="text-xs text-gray-500 uppercase">IRR</p>
                                                <p className="text-lg font-bold text-cyan-400 font-mono">
                                                    {economics[0].irr_percent.toFixed(1)}%
                                                </p>
                                            </div>
                                        )}

                                        {economics[0].payback_years && (
                                            <div className="bg-black/20 rounded-lg p-3">
                                                <p className="text-xs text-gray-500 uppercase">Payback</p>
                                                <p className="text-lg font-bold text-amber-400 font-mono">
                                                    {economics[0].payback_years.toFixed(1)} yrs
                                                </p>
                                            </div>
                                        )}

                                        {economics[0].initial_capex_million && (
                                            <div className="bg-black/20 rounded-lg p-3">
                                                <p className="text-xs text-gray-500 uppercase">Initial CAPEX</p>
                                                <p className="text-lg font-bold text-purple-400 font-mono">
                                                    ${economics[0].initial_capex_million.toFixed(0)}M
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Additional metrics */}
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 pt-2 border-t border-white/5">
                                        {economics[0].mine_life_years && (
                                            <span>Mine Life: <span className="text-white">{economics[0].mine_life_years} yrs</span></span>
                                        )}
                                        {economics[0].gold_price_assumption && (
                                            <span>Au Price: <span className="text-amber-400">${economics[0].gold_price_assumption}/oz</span></span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Other studies (if multiple) */}
                            {economics.length > 1 && (
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <p className="text-xs text-gray-500 mb-2">Other Studies</p>
                                    <div className="space-y-2">
                                        {economics.slice(1, 4).map((econ, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-xs">
                                                <span className="text-gray-400">
                                                    {econ.project_name}
                                                    <span className={`ml-2 px-1.5 py-0.5 rounded ${getStudyTypeColor(econ.study_type)}`}>
                                                        {econ.study_type?.toUpperCase()}
                                                    </span>
                                                </span>
                                                <span className="text-gray-300 font-mono">
                                                    {econ.npv_million ? `$${econ.npv_million.toFixed(0)}M` : '-'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Link to full technical reports */}
            <div className="mt-4 flex justify-end">
                <Link
                    href={`/companies/${ticker}/reports`}
                    className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                >
                    View all technical reports
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </Link>
            </div>
        </div>
    );
}
