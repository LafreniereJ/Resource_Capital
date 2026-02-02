'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { MapPin, Layers, ArrowRight, Loader2 } from 'lucide-react';

// Dynamically import map component to avoid SSR issues
const MapContainer = dynamic(
    () => import('react-leaflet').then(mod => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import('react-leaflet').then(mod => mod.TileLayer),
    { ssr: false }
);
const CircleMarker = dynamic(
    () => import('react-leaflet').then(mod => mod.CircleMarker),
    { ssr: false }
);
const Tooltip = dynamic(
    () => import('react-leaflet').then(mod => mod.Tooltip),
    { ssr: false }
);

interface GeoProject {
    id: number;
    name: string;
    ticker: string;
    latitude: number;
    longitude: number;
    commodity: string | null;
    stage: string | null;
}

interface MiniHotspotMapProps {
    className?: string;
}

const COMMODITY_COLORS: Record<string, string> = {
    'Gold': '#fbbf24',
    'Silver': '#94a3b8',
    'Copper': '#f97316',
    'Uranium': '#22c55e',
    'Lithium': '#3b82f6',
    'Nickel': '#8b5cf6',
    'Zinc': '#6b7280',
    'default': '#06b6d4',
};

const COMMODITY_FILTERS = ['All', 'Gold', 'Silver', 'Copper', 'Uranium', 'Lithium'];

export default function MiniHotspotMap({ className = '' }: MiniHotspotMapProps) {
    const [projects, setProjects] = useState<GeoProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('All');
    const [mapReady, setMapReady] = useState(false);

    useEffect(() => {
        async function fetchProjects() {
            try {
                const res = await fetch('/api/geo-projects');
                if (res.ok) {
                    const data = await res.json();
                    setProjects(data.projects || []);
                }
            } catch (error) {
                console.error('Failed to fetch geo projects:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchProjects();
    }, []);

    // Filter projects
    const filteredProjects = activeFilter === 'All'
        ? projects
        : projects.filter(p => p.commodity?.toLowerCase().includes(activeFilter.toLowerCase()));

    // Get color for project
    const getColor = (commodity: string | null) => {
        if (!commodity) return COMMODITY_COLORS.default;
        for (const [key, color] of Object.entries(COMMODITY_COLORS)) {
            if (commodity.toLowerCase().includes(key.toLowerCase())) {
                return color;
            }
        }
        return COMMODITY_COLORS.default;
    };

    return (
        <div className={`rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden ${className}`}>
            {/* Header */}
            <div className="p-3 border-b border-white/5">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <MapPin className="text-emerald-400" size={16} />
                        <h2 className="font-bold text-white text-sm">Hotspot Map</h2>
                        <span className="text-xs text-gray-500 font-mono">
                            {filteredProjects.length}
                        </span>
                    </div>
                    <Link
                        href="/map"
                        className="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-1"
                    >
                        Full Map <ArrowRight size={10} />
                    </Link>
                </div>

                {/* Commodity Pills */}
                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                    {COMMODITY_FILTERS.map((commodity) => (
                        <button
                            key={commodity}
                            onClick={() => setActiveFilter(commodity)}
                            className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                                activeFilter === commodity
                                    ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)] border border-[var(--color-accent)]/20'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                            }`}
                        >
                            {commodity !== 'All' && (
                                <span
                                    className="inline-block w-2 h-2 rounded-full mr-1"
                                    style={{ backgroundColor: COMMODITY_COLORS[commodity] || COMMODITY_COLORS.default }}
                                />
                            )}
                            {commodity}
                        </button>
                    ))}
                </div>
            </div>

            {/* Map Container */}
            <div className="relative h-[240px] bg-[#0a0a0f]">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="animate-spin text-gray-500" size={24} />
                    </div>
                ) : (
                    <MapContainer
                        center={[54.0, -105.0]}
                        zoom={3}
                        style={{ height: '100%', width: '100%', background: '#0a0a0f' }}
                        zoomControl={false}
                        attributionControl={false}
                        whenReady={() => setMapReady(true)}
                    >
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        />
                        {mapReady && filteredProjects.map((project) => (
                            <CircleMarker
                                key={project.id}
                                center={[project.latitude, project.longitude]}
                                radius={5}
                                pathOptions={{
                                    color: getColor(project.commodity),
                                    fillColor: getColor(project.commodity),
                                    fillOpacity: 0.6,
                                    weight: 1,
                                }}
                            >
                                <Tooltip>
                                    <div className="text-xs">
                                        <div className="font-bold">{project.name}</div>
                                        <div className="text-gray-400">{project.ticker}</div>
                                        {project.commodity && (
                                            <div className="text-gray-400">{project.commodity}</div>
                                        )}
                                    </div>
                                </Tooltip>
                            </CircleMarker>
                        ))}
                    </MapContainer>
                )}

                {/* Map overlay gradient */}
                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-white/5 bg-black/20 flex items-center justify-between text-xs text-gray-600">
                <span className="flex items-center gap-1">
                    <Layers size={10} />
                    {projects.length} total projects
                </span>
                <span>Click map for details</span>
            </div>
        </div>
    );
}
