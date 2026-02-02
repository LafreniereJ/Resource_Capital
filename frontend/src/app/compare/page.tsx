'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { BackgroundEffects } from '@/components/ui/BackgroundEffects';
import { Search, X, Plus, Loader2, BarChart3, TrendingUp, Clock, DollarSign, Download, FileText, Trash2 } from 'lucide-react';

interface Project {
    project_id: number;
    name: string;
    company: string;
    ticker: string;
    location: string | null;
    stage: string | null;
    commodity: string | null;
    npv_million: number | null;
    irr_percent: number | null;
    payback_years: number | null;
    aisc_per_oz: number | null;
    initial_capex_million: number | null;
    mine_life_years: number | null;
    study_type: string | null;
    nav_million: number | null;
    nav_method: string | null;
}

interface ComparisonData {
    projects: Project[];
    metal_prices_used: Record<string, { price: number; currency: string }>;
    compared_at: string;
}

interface SearchResult {
    id: number;
    name: string;
    company_name: string;
    ticker: string;
    commodity: string | null;
    stage: string | null;
}

// Commodity colors for badges
const COMMODITY_COLORS: Record<string, string> = {
    gold: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    silver: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    copper: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    uranium: 'bg-green-500/10 text-green-400 border-green-500/20',
    lithium: 'bg-[var(--color-accent-muted)] text-[var(--color-accent-light)] border-[var(--color-accent)]/20',
    default: 'bg-[var(--color-accent-muted)] text-[var(--color-accent)] border-[var(--color-accent)]/20',
};

export default function ComparePage() {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [comparison, setComparison] = useState<ComparisonData | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [allProjects, setAllProjects] = useState<SearchResult[]>([]);
    const [projectsLoading, setProjectsLoading] = useState(true);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    // Fetch all projects on mount - single optimized endpoint
    useEffect(() => {
        async function fetchProjects() {
            setProjectsLoading(true);
            try {
                const res = await fetch('/api/projects/geo');
                if (res.ok) {
                    const data = await res.json();
                    const geoProjects = data.projects || [];
                    // Transform to SearchResult format
                    const projects: SearchResult[] = geoProjects.map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        company_name: p.company_name,
                        ticker: p.ticker,
                        commodity: p.commodity,
                        stage: p.stage
                    }));
                    setAllProjects(projects);
                }
            } catch (error) {
                console.error('Failed to fetch projects:', error);
            } finally {
                setProjectsLoading(false);
            }
        }
        fetchProjects();
    }, []);

    // Filter projects based on search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults(allProjects.slice(0, 10));
            return;
        }
        const query = searchQuery.toLowerCase();
        const filtered = allProjects.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.company_name.toLowerCase().includes(query) ||
            p.ticker.toLowerCase().includes(query) ||
            p.commodity?.toLowerCase().includes(query)
        );
        setSearchResults(filtered.slice(0, 10));
    }, [searchQuery, allProjects]);

    // Compare selected projects
    const compareProjects = useCallback(async () => {
        if (selectedIds.length < 2) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/projects/compare?project_ids=${selectedIds.join(',')}`);
            if (res.ok) {
                const data = await res.json();
                setComparison(data);
            }
        } catch (error) {
            console.error('Comparison failed:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedIds]);

    // Auto-compare when selection changes
    useEffect(() => {
        if (selectedIds.length >= 2) {
            compareProjects();
        } else {
            setComparison(null);
        }
    }, [selectedIds, compareProjects]);

    const addProject = (id: number) => {
        if (!selectedIds.includes(id) && selectedIds.length < 5) {
            setSelectedIds([...selectedIds, id]);
            setSearchQuery(''); // Clear search after selection
        }
    };

    const removeProject = (id: number) => {
        setSelectedIds(selectedIds.filter(i => i !== id));
    };

    const clearAllProjects = () => {
        setSelectedIds([]);
        setComparison(null);
    };

    const getSelectedProject = (id: number) => {
        return allProjects.find(p => p.id === id);
    };

    const getCommodityColor = (commodity: string | null) => {
        if (!commodity) return COMMODITY_COLORS.default;
        return COMMODITY_COLORS[commodity.toLowerCase()] || COMMODITY_COLORS.default;
    };

    const formatValue = (value: number | null | undefined, suffix = '') => {
        if (value === null || value === undefined) return '—';
        return `${value.toLocaleString()}${suffix}`;
    };

    // Export to CSV
    const exportToCSV = () => {
        if (!comparison) return;

        const headers = ['Metric', ...comparison.projects.map(p => p.name)];
        const metrics = [
            ['Company', ...comparison.projects.map(p => p.company)],
            ['Stage', ...comparison.projects.map(p => p.stage || '')],
            ['Commodity', ...comparison.projects.map(p => p.commodity || '')],
            ['Location', ...comparison.projects.map(p => p.location || '')],
            ['Study Type', ...comparison.projects.map(p => p.study_type || '')],
            ['NAV ($M)', ...comparison.projects.map(p => p.nav_million?.toString() || '')],
            ['NPV ($M)', ...comparison.projects.map(p => p.npv_million?.toString() || '')],
            ['IRR (%)', ...comparison.projects.map(p => p.irr_percent?.toString() || '')],
            ['Payback (yrs)', ...comparison.projects.map(p => p.payback_years?.toString() || '')],
            ['AISC ($/oz)', ...comparison.projects.map(p => p.aisc_per_oz?.toString() || '')],
            ['Capex ($M)', ...comparison.projects.map(p => p.initial_capex_million?.toString() || '')],
            ['Mine Life (yrs)', ...comparison.projects.map(p => p.mine_life_years?.toString() || '')],
        ];

        const csvContent = [
            `# Resource Capital Project Comparison`,
            `# Generated: ${new Date().toISOString()}`,
            `# Gold Price: $${comparison.metal_prices_used?.gold?.price?.toLocaleString() || 'N/A'}/oz`,
            '',
            headers.join(','),
            ...metrics.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `project_comparison_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Export to PDF (simplified - creates printable HTML)
    const exportToPDF = () => {
        if (!comparison) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Project Comparison - Resource Capital</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; }
                    h1 { color: #333; margin-bottom: 5px; }
                    .subtitle { color: #666; margin-bottom: 30px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 12px 8px; text-align: center; }
                    th { background: #f5f5f5; font-weight: bold; text-transform: uppercase; font-size: 11px; }
                    td:first-child { text-align: left; font-weight: 500; }
                    tr:nth-child(even) { background: #fafafa; }
                    .nav-row { background: #e8f5e9 !important; }
                    .nav-row td { font-weight: bold; color: #2e7d32; }
                    .footer { margin-top: 30px; color: #999; font-size: 12px; }
                    @media print { body { padding: 20px; } }
                </style>
            </head>
            <body>
                <h1>Project Comparison</h1>
                <p class="subtitle">
                    ${comparison.projects.length} projects compared • 
                    Gold: $${comparison.metal_prices_used?.gold?.price?.toLocaleString() || 'N/A'}/oz • 
                    ${new Date().toLocaleDateString()}
                </p>
                <table>
                    <thead>
                        <tr>
                            <th>Metric</th>
                            ${comparison.projects.map(p => `<th>${p.name}<br><small style="color:#999">${p.ticker}</small></th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td>Company</td>${comparison.projects.map(p => `<td>${p.company}</td>`).join('')}</tr>
                        <tr><td>Stage</td>${comparison.projects.map(p => `<td>${p.stage || '—'}</td>`).join('')}</tr>
                        <tr><td>Commodity</td>${comparison.projects.map(p => `<td>${p.commodity || '—'}</td>`).join('')}</tr>
                        <tr><td>Location</td>${comparison.projects.map(p => `<td>${p.location || '—'}</td>`).join('')}</tr>
                        <tr class="nav-row"><td>NAV ($M)</td>${comparison.projects.map(p => `<td>$${p.nav_million?.toLocaleString() || '—'}</td>`).join('')}</tr>
                        <tr><td>NPV ($M)</td>${comparison.projects.map(p => `<td>$${p.npv_million?.toLocaleString() || '—'}</td>`).join('')}</tr>
                        <tr><td>IRR (%)</td>${comparison.projects.map(p => `<td>${p.irr_percent?.toFixed(1) || '—'}%</td>`).join('')}</tr>
                        <tr><td>Payback (yrs)</td>${comparison.projects.map(p => `<td>${p.payback_years?.toFixed(1) || '—'}</td>`).join('')}</tr>
                        <tr><td>AISC ($/oz)</td>${comparison.projects.map(p => `<td>$${p.aisc_per_oz?.toLocaleString() || '—'}</td>`).join('')}</tr>
                        <tr><td>Capex ($M)</td>${comparison.projects.map(p => `<td>$${p.initial_capex_million?.toLocaleString() || '—'}</td>`).join('')}</tr>
                        <tr><td>Mine Life (yrs)</td>${comparison.projects.map(p => `<td>${p.mine_life_years?.toFixed(0) || '—'}</td>`).join('')}</tr>
                    </tbody>
                </table>
                <p class="footer">Generated by Resource Capital Mining Intelligence Platform</p>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <main className="min-h-screen bg-[var(--color-bg-base)] text-gray-200 font-sans selection:bg-[var(--color-accent-muted)]">
            {/* Background */}
            <BackgroundEffects />

            <div className="relative z-10 px-6 md:px-12 py-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-600">
                        Project Comparator
                    </h1>
                    <p className="text-gray-500">Compare up to 5 mining projects side-by-side</p>
                </div>

                {/* Project Selection */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Search Panel */}
                    <div className="bg-[var(--color-bg-surface)]/60 border border-white/10 rounded-2xl p-6">
                        <h2 className="flex items-center gap-2 font-bold text-white mb-4">
                            <Plus className="w-4 h-4 text-[var(--color-accent)]" />
                            Add Projects
                        </h2>

                        {/* Search Input */}
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search by name, company, or commodity..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-accent)]/50"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Loading State */}
                        {projectsLoading && (
                            <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Loading projects...</span>
                            </div>
                        )}

                        {/* Search Results */}
                        {!projectsLoading && (
                            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                                {searchResults.length > 0 && (
                                    <p className="text-xs text-gray-600 mb-2">
                                        {searchQuery ? `${searchResults.length} results` : `Showing ${searchResults.length} of ${allProjects.length} projects`}
                                    </p>
                                )}
                                {searchResults.map(proj => {
                                    const isSelected = selectedIds.includes(proj.id);
                                    return (
                                        <button
                                            key={proj.id}
                                            onClick={() => addProject(proj.id)}
                                            disabled={isSelected || selectedIds.length >= 5}
                                            className={`w-full text-left p-3 rounded-lg transition group ${isSelected
                                                ? 'bg-cyan-500/10 border border-cyan-500/30 cursor-not-allowed'
                                                : selectedIds.length >= 5
                                                    ? 'bg-white/5 border border-white/5 opacity-50 cursor-not-allowed'
                                                    : 'bg-white/5 border border-white/5 hover:border-cyan-500/30 hover:bg-cyan-500/5'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-white truncate">{proj.name}</p>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {proj.company_name}
                                                        <span className="text-cyan-500 ml-1">({proj.ticker})</span>
                                                    </p>
                                                </div>
                                                {isSelected && (
                                                    <span className="text-[10px] text-cyan-400 font-medium ml-2 flex-shrink-0">ADDED</span>
                                                )}
                                            </div>
                                            {proj.commodity && (
                                                <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-medium border ${getCommodityColor(proj.commodity)}`}>
                                                    {proj.commodity}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                                {searchResults.length === 0 && !projectsLoading && (
                                    <div className="text-center py-8">
                                        <div className="text-3xl mb-2">🔍</div>
                                        <p className="text-gray-500 text-sm">
                                            {allProjects.length === 0 ? 'No projects available' : 'No matching projects found'}
                                        </p>
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="mt-2 text-xs text-[var(--color-accent)] hover:underline"
                                            >
                                                Clear search
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Selected Projects */}
                    <div className="lg:col-span-2 bg-[var(--color-bg-surface)]/60 border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="flex items-center gap-2 font-bold text-white">
                                <BarChart3 className="w-4 h-4 text-purple-400" />
                                Selected Projects
                                <span className="ml-1 text-sm font-normal text-gray-500">({selectedIds.length}/5)</span>
                            </h2>
                            {selectedIds.length > 0 && (
                                <button
                                    onClick={clearAllProjects}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    Clear All
                                </button>
                            )}
                        </div>

                        {selectedIds.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
                                <div className="text-4xl mb-3">📊</div>
                                <p className="text-gray-400 font-medium">No projects selected</p>
                                <p className="text-sm text-gray-600 mt-1">
                                    Select at least 2 projects to start comparing
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                {selectedIds.map((id, index) => {
                                    const proj = getSelectedProject(id);
                                    return (
                                        <div
                                            key={id}
                                            className="relative bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/20 rounded-xl p-4 group"
                                        >
                                            {/* Number badge */}
                                            <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                                                {index + 1}
                                            </div>
                                            {/* Remove button */}
                                            <button
                                                onClick={() => removeProject(id)}
                                                className="absolute top-2 right-2 p-1 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition opacity-60 group-hover:opacity-100"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            {/* Content */}
                                            <div className="pr-6">
                                                <p className="font-semibold text-white truncate">{proj?.name || `Project #${id}`}</p>
                                                <p className="text-xs text-gray-400 mt-0.5 truncate">
                                                    {proj?.company_name}
                                                    <span className="text-[var(--color-accent)] ml-1">({proj?.ticker})</span>
                                                </p>
                                                {proj?.commodity && (
                                                    <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-medium border ${getCommodityColor(proj.commodity)}`}>
                                                        {proj.commodity}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* Add more placeholder */}
                                {selectedIds.length < 5 && (
                                    <div className="border-2 border-dashed border-white/10 rounded-xl p-4 flex items-center justify-center min-h-[100px]">
                                        <p className="text-xs text-gray-600 text-center">
                                            Add {selectedIds.length < 2 ? `${2 - selectedIds.length} more` : 'up to'} {5 - selectedIds.length} project{5 - selectedIds.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Comparing indicator */}
                        {selectedIds.length >= 2 && loading && (
                            <div className="flex items-center justify-center gap-2 mt-6 py-3 bg-[var(--color-accent-muted)] rounded-lg border border-[var(--color-accent)]/20">
                                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                                <span className="text-sm text-purple-300">Comparing {selectedIds.length} projects...</span>
                            </div>
                        )}

                        {/* Hint when 1 project selected */}
                        {selectedIds.length === 1 && (
                            <p className="text-center text-sm text-gray-500 mt-4">
                                ← Add one more project to start comparing
                            </p>
                        )}
                    </div>
                </div>

                {/* Comparison Results */}
                {comparison && comparison.projects.length >= 2 && (
                    <div className="bg-[var(--color-bg-surface)]/60 border border-white/10 rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="flex items-center gap-2 font-bold text-white">
                                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                                        Comparison Results
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Comparing {comparison.projects.length} projects
                                        {comparison.metal_prices_used?.gold && (
                                            <> • Gold: ${comparison.metal_prices_used.gold.price.toLocaleString()}/oz</>
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={exportToCSV}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition text-sm font-medium"
                                    >
                                        <Download className="w-4 h-4" />
                                        CSV
                                    </button>
                                    <button
                                        onClick={exportToPDF}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-accent-muted)] border border-[var(--color-accent)]/20 text-[var(--color-accent-light)] hover:bg-[var(--color-accent)]/20 transition text-sm font-medium"
                                    >
                                        <FileText className="w-4 h-4" />
                                        PDF
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.02]">
                                        <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase sticky left-0 bg-[var(--color-bg-surface)]">Metric</th>
                                        {comparison.projects.map(proj => (
                                            <th key={proj.project_id} className="p-4 text-center text-xs font-bold text-gray-500 uppercase min-w-[150px]">
                                                <Link href={`/companies/${proj.ticker}/projects/${proj.project_id}`} className="hover:text-[var(--color-accent)] transition">
                                                    {proj.name}
                                                </Link>
                                                <p className="font-normal text-gray-600 mt-1">{proj.ticker}</p>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {/* Company */}
                                    <tr className="hover:bg-white/[0.02]">
                                        <td className="p-4 text-gray-400 sticky left-0 bg-[var(--color-bg-surface)]">Company</td>
                                        {comparison.projects.map(proj => (
                                            <td key={proj.project_id} className="p-4 text-center text-white">{proj.company}</td>
                                        ))}
                                    </tr>
                                    {/* Stage */}
                                    <tr className="hover:bg-white/[0.02]">
                                        <td className="p-4 text-gray-400 sticky left-0 bg-[var(--color-bg-surface)]">Stage</td>
                                        {comparison.projects.map(proj => (
                                            <td key={proj.project_id} className="p-4 text-center">
                                                <span className="px-2 py-1 rounded text-xs bg-[var(--color-accent-muted)] text-[var(--color-accent-light)] border border-[var(--color-accent)]/20">
                                                    {proj.stage || '—'}
                                                </span>
                                            </td>
                                        ))}
                                    </tr>
                                    {/* Commodity */}
                                    <tr className="hover:bg-white/[0.02]">
                                        <td className="p-4 text-gray-400 sticky left-0 bg-[var(--color-bg-surface)]">Commodity</td>
                                        {comparison.projects.map(proj => (
                                            <td key={proj.project_id} className="p-4 text-center">
                                                <span className="px-2 py-1 rounded text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                    {proj.commodity || '—'}
                                                </span>
                                            </td>
                                        ))}
                                    </tr>
                                    {/* Location */}
                                    <tr className="hover:bg-white/[0.02]">
                                        <td className="p-4 text-gray-400 sticky left-0 bg-[var(--color-bg-surface)]">Location</td>
                                        {comparison.projects.map(proj => (
                                            <td key={proj.project_id} className="p-4 text-center text-gray-300 text-sm">{proj.location || '—'}</td>
                                        ))}
                                    </tr>
                                    {/* Study Type */}
                                    <tr className="hover:bg-white/[0.02]">
                                        <td className="p-4 text-gray-400 sticky left-0 bg-[var(--color-bg-surface)]">Study Type</td>
                                        {comparison.projects.map(proj => (
                                            <td key={proj.project_id} className="p-4 text-center text-white">{proj.study_type || '—'}</td>
                                        ))}
                                    </tr>
                                    {/* NAV */}
                                    <tr className="hover:bg-white/[0.02] bg-emerald-500/5">
                                        <td className="p-4 font-bold text-emerald-400 sticky left-0 bg-[var(--color-bg-surface)]">
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="w-4 h-4" />
                                                NAV
                                            </div>
                                        </td>
                                        {comparison.projects.map(proj => (
                                            <td key={proj.project_id} className="p-4 text-center font-mono text-xl font-bold text-emerald-400">
                                                {proj.nav_million ? `$${formatValue(proj.nav_million)}M` : '—'}
                                            </td>
                                        ))}
                                    </tr>
                                    {/* NPV */}
                                    <tr className="hover:bg-white/[0.02]">
                                        <td className="p-4 text-gray-400 sticky left-0 bg-[var(--color-bg-surface)]">NPV (Base)</td>
                                        {comparison.projects.map(proj => (
                                            <td key={proj.project_id} className="p-4 text-center font-mono text-white">
                                                {proj.npv_million ? `$${formatValue(proj.npv_million)}M` : '—'}
                                            </td>
                                        ))}
                                    </tr>
                                    {/* IRR */}
                                    <tr className="hover:bg-white/[0.02]">
                                        <td className="p-4 text-gray-400 sticky left-0 bg-[var(--color-bg-surface)]">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4" />
                                                IRR
                                            </div>
                                        </td>
                                        {comparison.projects.map(proj => (
                                            <td key={proj.project_id} className="p-4 text-center font-mono text-white">
                                                {proj.irr_percent ? `${formatValue(proj.irr_percent, '%')}` : '—'}
                                            </td>
                                        ))}
                                    </tr>
                                    {/* Payback */}
                                    <tr className="hover:bg-white/[0.02]">
                                        <td className="p-4 text-gray-400 sticky left-0 bg-[var(--color-bg-surface)]">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                Payback
                                            </div>
                                        </td>
                                        {comparison.projects.map(proj => (
                                            <td key={proj.project_id} className="p-4 text-center font-mono text-white">
                                                {proj.payback_years ? `${formatValue(proj.payback_years)} yrs` : '—'}
                                            </td>
                                        ))}
                                    </tr>
                                    {/* AISC */}
                                    <tr className="hover:bg-white/[0.02]">
                                        <td className="p-4 text-gray-400 sticky left-0 bg-[var(--color-bg-surface)]">AISC ($/oz)</td>
                                        {comparison.projects.map(proj => (
                                            <td key={proj.project_id} className="p-4 text-center font-mono text-amber-400">
                                                {proj.aisc_per_oz ? `$${formatValue(proj.aisc_per_oz)}` : '—'}
                                            </td>
                                        ))}
                                    </tr>
                                    {/* Capex */}
                                    <tr className="hover:bg-white/[0.02]">
                                        <td className="p-4 text-gray-400 sticky left-0 bg-[var(--color-bg-surface)]">Initial Capex</td>
                                        {comparison.projects.map(proj => (
                                            <td key={proj.project_id} className="p-4 text-center font-mono text-white">
                                                {proj.initial_capex_million ? `$${formatValue(proj.initial_capex_million)}M` : '—'}
                                            </td>
                                        ))}
                                    </tr>
                                    {/* Mine Life */}
                                    <tr className="hover:bg-white/[0.02]">
                                        <td className="p-4 text-gray-400 sticky left-0 bg-[var(--color-bg-surface)]">Mine Life</td>
                                        {comparison.projects.map(proj => (
                                            <td key={proj.project_id} className="p-4 text-center font-mono text-white">
                                                {proj.mine_life_years ? `${formatValue(proj.mine_life_years)} yrs` : '—'}
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/5 bg-white/[0.02] text-center">
                            <p className="text-xs text-gray-600">
                                Compared at {new Date(comparison.compared_at).toLocaleString()}
                            </p>
                        </div>
                    </div>
                )}

                {/* Help Text */}
                {selectedIds.length < 2 && (
                    <div className="text-center py-16">
                        <div className="text-5xl mb-4">📊</div>
                        <h3 className="text-xl font-bold text-white mb-2">Start Comparing</h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                            Select 2-5 projects from the panel above to see a side-by-side comparison of
                            NPV, IRR, AISC, and other key metrics.
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
