'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { BackgroundEffects } from '@/components/ui/BackgroundEffects';
import Map, { Marker, Popup, NavigationControl, ScaleControl, GeolocateControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Map as MapIcon, Filter, Layers, Building2, X, ChevronDown, Loader2 } from 'lucide-react';

interface ProjectMarker {
    id: number;
    name: string;
    company_name: string;
    ticker: string;
    latitude: number;
    longitude: number;
    commodity: string | null;
    stage: string | null;
    location: string | null;
    // Production data
    gold_oz?: number;
    silver_oz?: number;
    copper_lbs?: number;
    production_display?: string;
}

// Commodity colors
const COMMODITY_COLORS: Record<string, string> = {
    gold: '#F59E0B',
    silver: '#9CA3AF',
    copper: '#B45309',
    platinum: '#6366F1',
    palladium: '#8B5CF6',
    nickel: '#10B981',
    uranium: '#22C55E',
    lithium: '#3B82F6',
    zinc: '#64748B',
    lead: '#78716C',
    iron: '#DC2626',
    coal: '#1F2937',
    diamonds: '#E879F9',
    default: '#06B6D4',
};

// Stage colors for secondary filtering
const STAGE_COLORS: Record<string, string> = {
    producing: '#10B981',
    development: '#3B82F6',
    exploration: '#F59E0B',
    permitting: '#8B5CF6',
    default: '#6B7280',
};

export default function MapPage() {
    const [projects, setProjects] = useState<ProjectMarker[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState<ProjectMarker | null>(null);
    const [hoveredId, setHoveredId] = useState<number | null>(null);

    // Filters
    const [commodityFilter, setCommodityFilter] = useState<string>('');
    const [stageFilter, setStageFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Map state
    const [viewState, setViewState] = useState({
        latitude: 50,
        longitude: -100,
        zoom: 3,
        bearing: 0,
        pitch: 0,
    });

    // Fetch projects - single optimized endpoint
    useEffect(() => {
        async function fetchProjects() {
            try {
                const res = await fetch('/api/projects/geo');
                if (!res.ok) return;

                const data = await res.json();
                const geoProjects = data.projects || [];

                // Transform to ProjectMarker format with production display
                const allProjects: ProjectMarker[] = geoProjects.map((p: any) => {
                    // Build production display string
                    let productionParts: string[] = [];
                    if (p.gold_oz) productionParts.push(`${(p.gold_oz / 1000).toFixed(0)}k oz Au`);
                    if (p.silver_oz) productionParts.push(`${(p.silver_oz / 1000000).toFixed(1)}M oz Ag`);
                    if (p.copper_lbs) productionParts.push(`${(p.copper_lbs / 1000000).toFixed(0)}M lbs Cu`);

                    return {
                        id: p.id,
                        name: p.name,
                        company_name: p.company_name,
                        ticker: p.ticker,
                        latitude: p.latitude,
                        longitude: p.longitude,
                        commodity: p.commodity,
                        stage: p.stage,
                        location: p.location,
                        gold_oz: p.gold_oz,
                        silver_oz: p.silver_oz,
                        copper_lbs: p.copper_lbs,
                        production_display: productionParts.length > 0 ? productionParts.join(' · ') : undefined,
                    };
                });

                setProjects(allProjects);
            } catch (error) {
                console.error('Failed to fetch projects:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchProjects();
    }, []);

    // Get unique filter options
    const commodities = useMemo(() =>
        [...new Set(projects.map(p => p.commodity).filter(Boolean))] as string[],
        [projects]
    );

    const stages = useMemo(() =>
        [...new Set(projects.map(p => p.stage).filter(Boolean))] as string[],
        [projects]
    );

    // Filtered projects
    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            if (commodityFilter && p.commodity?.toLowerCase() !== commodityFilter.toLowerCase()) {
                return false;
            }
            if (stageFilter && p.stage?.toLowerCase() !== stageFilter.toLowerCase()) {
                return false;
            }
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (!p.name.toLowerCase().includes(q) &&
                    !p.company_name.toLowerCase().includes(q) &&
                    !p.ticker.toLowerCase().includes(q)) {
                    return false;
                }
            }
            return true;
        });
    }, [projects, commodityFilter, stageFilter, searchQuery]);

    // Clear all filters
    const clearFilters = () => {
        setCommodityFilter('');
        setStageFilter('');
        setSearchQuery('');
    };

    const hasActiveFilters = commodityFilter || stageFilter || searchQuery;

    return (
        <main className="min-h-screen bg-[var(--color-bg-base)] text-gray-200 selection:bg-[var(--color-accent-muted)]">
            <BackgroundEffects />
            {/* Header */}
            <div className="fixed top-16 left-0 right-0 z-20 bg-[var(--color-bg-base)]/95 backdrop-blur-lg border-b border-white/5">
                <div className="max-w-[2000px] mx-auto px-4 py-3">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Title */}
                        <div className="flex items-center gap-3 mr-auto">
                            <div className="p-2 bg-[var(--color-accent-muted)] rounded-lg">
                                <MapIcon className="w-5 h-5 text-[var(--color-accent)]" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white">Project Map</h1>
                                <p className="text-xs text-gray-500">
                                    {loading ? 'Loading...' : (
                                        <>
                                            {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
                                            {hasActiveFilters && ` (filtered from ${projects.length})`}
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-48 bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-accent)]/50 placeholder:text-gray-600"
                            />
                        </div>

                        {/* Commodity Filter */}
                        <div className="relative">
                            <select
                                value={commodityFilter}
                                onChange={(e) => setCommodityFilter(e.target.value)}
                                className="appearance-none bg-black/30 border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-sm focus:outline-none focus:border-[var(--color-accent)]/50 cursor-pointer"
                            >
                                <option value="">All Commodities</option>
                                {commodities.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>

                        {/* Stage Filter */}
                        <div className="relative">
                            <select
                                value={stageFilter}
                                onChange={(e) => setStageFilter(e.target.value)}
                                className="appearance-none bg-black/30 border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-sm focus:outline-none focus:border-[var(--color-accent)]/50 cursor-pointer"
                            >
                                <option value="">All Stages</option>
                                {stages.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>

                        {/* Clear Filters */}
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition text-sm"
                            >
                                <X className="w-3 h-3" />
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Map Container */}
            <div className="fixed inset-0 top-[112px]">
                <Map
                    {...viewState}
                    onMove={evt => setViewState(evt.viewState)}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
                    attributionControl={false}
                >
                    {/* Navigation Controls */}
                    <NavigationControl position="bottom-right" />
                    <ScaleControl position="bottom-left" />

                    {/* Project Markers */}
                    {filteredProjects.map(project => {
                        const color = COMMODITY_COLORS[project.commodity?.toLowerCase() || 'default'] || COMMODITY_COLORS.default;
                        const isHovered = hoveredId === project.id;
                        const isSelected = selectedProject?.id === project.id;

                        return (
                            <Marker
                                key={project.id}
                                latitude={project.latitude}
                                longitude={project.longitude}
                                anchor="center"
                            >
                                <div
                                    className="cursor-pointer transition-all duration-150 relative group"
                                    style={{
                                        transform: isHovered || isSelected ? 'scale(1.3)' : 'scale(1)',
                                        zIndex: isHovered || isSelected ? 100 : 1,
                                    }}
                                    onMouseEnter={() => setHoveredId(project.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProject(project);
                                    }}
                                >
                                    {/* Marker dot */}
                                    <div
                                        className="w-5 h-5 rounded-full border-2 border-white shadow-lg"
                                        style={{
                                            backgroundColor: color,
                                            boxShadow: isHovered || isSelected
                                                ? `0 0 20px ${color}80`
                                                : `0 2px 8px rgba(0,0,0,0.4)`,
                                        }}
                                    />

                                    {/* Hover tooltip */}
                                    {isHovered && !isSelected && (
                                        <div
                                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none z-50"
                                            style={{ minWidth: '200px' }}
                                        >
                                            <div className="bg-[var(--color-bg-surface)]/95 backdrop-blur-lg border border-white/20 rounded-lg p-3 shadow-2xl">
                                                {/* Mine Name */}
                                                <h4 className="font-bold text-white text-sm mb-1 truncate">
                                                    {project.name}
                                                </h4>

                                                {/* Owner/Company */}
                                                <p className="text-xs text-gray-400 mb-2 truncate">
                                                    {project.company_name}
                                                    <span className="ml-1 text-[var(--color-accent)] font-mono">({project.ticker})</span>
                                                </p>

                                                {/* Commodity & Stage badges */}
                                                <div className="flex flex-wrap gap-1 mb-2">
                                                    {project.commodity && (
                                                        <span
                                                            className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                                                            style={{ backgroundColor: color }}
                                                        >
                                                            {project.commodity}
                                                        </span>
                                                    )}
                                                    {project.stage && (
                                                        <span
                                                            className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                                                            style={{
                                                                backgroundColor: STAGE_COLORS[project.stage.toLowerCase()] || STAGE_COLORS.default
                                                            }}
                                                        >
                                                            {project.stage}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Production output */}
                                                {project.production_display && (
                                                    <div className="border-t border-white/10 pt-2 mt-2">
                                                        <p className="text-[10px] text-gray-500 uppercase mb-0.5">Production</p>
                                                        <p className="text-xs text-amber-400 font-semibold">
                                                            {project.production_display}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Hint */}
                                                <p className="text-[9px] text-gray-600 mt-2 text-center">
                                                    Click for details
                                                </p>
                                            </div>
                                            {/* Tooltip arrow */}
                                            <div className="w-3 h-3 bg-[var(--color-bg-surface)]/95 border-r border-b border-white/20 rotate-45 mx-auto -mt-1.5" />
                                        </div>
                                    )}
                                </div>
                            </Marker>
                        );
                    })}

                    {/* Popup for selected project */}
                    {selectedProject && (
                        <Popup
                            latitude={selectedProject.latitude}
                            longitude={selectedProject.longitude}
                            anchor="bottom"
                            onClose={() => setSelectedProject(null)}
                            closeButton={true}
                            closeOnClick={false}
                            className="custom-popup"
                        >
                            <div className="p-3 min-w-[220px]">
                                <h3 className="font-bold text-gray-900 text-sm mb-1">
                                    {selectedProject.name}
                                </h3>
                                <p className="text-xs text-gray-600 mb-2">
                                    {selectedProject.company_name}
                                    <span className="ml-1 font-mono text-cyan-600">({selectedProject.ticker})</span>
                                </p>
                                <div className="flex flex-wrap gap-1 mb-3">
                                    {selectedProject.commodity && (
                                        <span
                                            className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                                            style={{ backgroundColor: COMMODITY_COLORS[selectedProject.commodity.toLowerCase()] || COMMODITY_COLORS.default }}
                                        >
                                            {selectedProject.commodity}
                                        </span>
                                    )}
                                    {selectedProject.stage && (
                                        <span
                                            className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                                            style={{ backgroundColor: STAGE_COLORS[selectedProject.stage.toLowerCase()] || STAGE_COLORS.default }}
                                        >
                                            {selectedProject.stage}
                                        </span>
                                    )}
                                </div>
                                {selectedProject.location && (
                                    <p className="text-[10px] text-gray-500 mb-2">
                                        📍 {selectedProject.location}
                                    </p>
                                )}
                                <Link
                                    href={`/companies/${selectedProject.ticker}/projects/${selectedProject.id}`}
                                    className="inline-block w-full px-3 py-1.5 bg-[var(--color-accent)] text-white text-center text-xs font-bold rounded hover:bg-[var(--color-accent-light)] transition"
                                >
                                    View Project →
                                </Link>
                            </div>
                        </Popup>
                    )}
                </Map>
            </div>

            {/* Legend */}
            <div className="fixed bottom-6 left-6 z-20 bg-[var(--color-bg-surface)]/95 backdrop-blur-lg border border-white/10 rounded-xl p-4 max-w-xs">
                <h3 className="flex items-center gap-2 text-xs font-bold text-white mb-3 uppercase tracking-wider">
                    <Layers className="w-3 h-3 text-[var(--color-accent)]" />
                    Commodities
                </h3>
                <div className="grid grid-cols-3 gap-x-4 gap-y-1.5">
                    {Object.entries(COMMODITY_COLORS)
                        .filter(([k]) => k !== 'default' && commodities.includes(k.charAt(0).toUpperCase() + k.slice(1)))
                        .map(([commodity, color]) => (
                            <button
                                key={commodity}
                                onClick={() => setCommodityFilter(commodity.charAt(0).toUpperCase() + commodity.slice(1))}
                                className={`flex items-center gap-1.5 text-left transition hover:opacity-100 ${commodityFilter.toLowerCase() === commodity ? 'opacity-100' : 'opacity-60 hover:opacity-80'
                                    }`}
                            >
                                <div
                                    className="w-2.5 h-2.5 rounded-full border border-white/20 flex-shrink-0"
                                    style={{ background: color }}
                                />
                                <span className="text-[10px] text-gray-400 capitalize truncate">{commodity}</span>
                            </button>
                        ))}
                </div>
            </div>

            {/* Stats */}
            <div className="fixed bottom-6 right-6 z-20 bg-[var(--color-bg-surface)]/95 backdrop-blur-lg border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-6">
                    <div className="text-center">
                        <p className="text-2xl font-bold font-mono text-[var(--color-accent)]">
                            {filteredProjects.length}
                        </p>
                        <p className="text-[10px] text-gray-500 uppercase">Projects</p>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="text-center">
                        <p className="text-2xl font-bold font-mono text-amber-400">
                            {new Set(filteredProjects.map(p => p.ticker)).size}
                        </p>
                        <p className="text-[10px] text-gray-500 uppercase">Companies</p>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="fixed inset-0 top-[112px] z-30 bg-[var(--color-bg-base)]/80 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">Loading project locations...</p>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredProjects.length === 0 && (
                <div className="fixed inset-0 top-[112px] z-20 flex items-center justify-center pointer-events-none">
                    <div className="text-center bg-[var(--color-bg-surface)]/95 border border-white/10 rounded-2xl p-8 max-w-md pointer-events-auto">
                        <MapIcon className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">
                            {hasActiveFilters ? 'No Matching Projects' : 'No Georeferenced Projects'}
                        </h3>
                        <p className="text-gray-500 mb-4 text-sm">
                            {hasActiveFilters
                                ? 'Try adjusting your filters or search query.'
                                : 'Projects need latitude and longitude coordinates to appear on the map.'}
                        </p>
                        {hasActiveFilters ? (
                            <button
                                onClick={clearFilters}
                                className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition text-sm"
                            >
                                Clear Filters
                            </button>
                        ) : (
                            <Link
                                href="/stocks"
                                className="inline-block px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition text-sm"
                            >
                                Browse Projects
                            </Link>
                        )}
                    </div>
                </div>
            )}

            {/* Custom Styles */}
            <style jsx global>{`
                .maplibregl-popup-content {
                    background: white;
                    border-radius: 12px;
                    padding: 0;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                }
                .maplibregl-popup-close-button {
                    font-size: 18px;
                    padding: 4px 8px;
                    color: #666;
                }
                .maplibregl-popup-close-button:hover {
                    background: transparent;
                    color: #000;
                }
                .maplibregl-popup-tip {
                    border-top-color: white;
                }
                .maplibregl-ctrl-attrib {
                    display: none;
                }
            `}</style>
        </main>
    );
}
