'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2, Check, Clock, Search, Bookmark, AlertCircle } from 'lucide-react';

interface ScreenerFilters {
    search: string;
    commodities: string[];
    exchanges: string[];
    minPrice: string;
    maxPrice: string;
    minMarketCap: string;
    maxMarketCap: string;
    minChange: string;
    maxChange: string;
    minVolume: string;
    near52WeekHigh: boolean;
    near52WeekLow: boolean;
    hasProjects: boolean;
}

export interface SavedQuery {
    id: string;
    name: string;
    filters: ScreenerFilters;
    createdAt: string;
    resultCount?: number;
}

interface SavedQueriesModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFilters: ScreenerFilters;
    resultCount: number;
    onLoadQuery: (filters: ScreenerFilters) => void;
    mode: 'save' | 'load';
}

const STORAGE_KEY = 'screener_saved_queries';

export function getSavedQueries(): SavedQuery[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function setSavedQueries(queries: SavedQuery[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queries));
}

export default function SavedQueriesModal({
    isOpen,
    onClose,
    currentFilters,
    resultCount,
    onLoadQuery,
    mode
}: SavedQueriesModalProps) {
    const [savedQueries, setSavedQueriesState] = useState<SavedQuery[]>([]);
    const [queryName, setQueryName] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setSavedQueriesState(getSavedQueries());
            setQueryName('');
            setSaveSuccess(false);
            setError('');
        }
    }, [isOpen]);

    const handleSave = () => {
        if (!queryName.trim()) {
            setError('Please enter a name for your query');
            return;
        }

        const queries = getSavedQueries();

        // Check for duplicate names
        if (queries.some(q => q.name.toLowerCase() === queryName.trim().toLowerCase())) {
            setError('A query with this name already exists');
            return;
        }

        const newQuery: SavedQuery = {
            id: Date.now().toString(),
            name: queryName.trim(),
            filters: currentFilters,
            createdAt: new Date().toISOString(),
            resultCount
        };

        const updated = [newQuery, ...queries].slice(0, 10); // Max 10 saved queries
        setSavedQueries(updated);
        setSavedQueriesState(updated);
        setSaveSuccess(true);

        // Auto-close after success
        setTimeout(() => {
            onClose();
        }, 1500);
    };

    const handleDelete = (id: string) => {
        const queries = getSavedQueries().filter(q => q.id !== id);
        setSavedQueries(queries);
        setSavedQueriesState(queries);
    };

    const handleLoad = (query: SavedQuery) => {
        onLoadQuery(query.filters);
        onClose();
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
    };

    const getActiveFiltersCount = (filters: ScreenerFilters) => {
        let count = 0;
        if (filters.search) count++;
        if (filters.commodities.length > 0) count++;
        if (filters.exchanges.length > 0) count++;
        if (filters.minPrice || filters.maxPrice) count++;
        if (filters.minMarketCap || filters.maxMarketCap) count++;
        if (filters.minChange || filters.maxChange) count++;
        if (filters.minVolume) count++;
        if (filters.near52WeekHigh) count++;
        if (filters.near52WeekLow) count++;
        if (filters.hasProjects) count++;
        return count;
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-[#0A0A15] border border-white/10 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mode === 'save'
                                ? 'bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30'
                                : 'bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30'
                                }`}>
                                {mode === 'save' ? (
                                    <Save className="w-5 h-5 text-cyan-400" />
                                ) : (
                                    <Bookmark className="w-5 h-5 text-purple-400" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">
                                    {mode === 'save' ? 'Save Query' : 'Load Saved Query'}
                                </h2>
                                <p className="text-sm text-gray-500">
                                    {mode === 'save' ? 'Save your current filters' : 'Load a previously saved query'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-white/5 transition text-gray-500 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[60vh]">
                        {mode === 'save' ? (
                            <div className="space-y-4">
                                {saveSuccess ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center justify-center py-8"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4">
                                            <Check className="w-8 h-8 text-emerald-400" />
                                        </div>
                                        <p className="text-lg font-medium text-white">Query Saved!</p>
                                        <p className="text-sm text-gray-500">You can load it anytime from the dropdown</p>
                                    </motion.div>
                                ) : (
                                    <>
                                        {/* Query Name Input */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                                Query Name
                                            </label>
                                            <input
                                                type="text"
                                                value={queryName}
                                                onChange={(e) => {
                                                    setQueryName(e.target.value);
                                                    setError('');
                                                }}
                                                placeholder="e.g., Gold Gainers, Large Cap Silver..."
                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                                                autoFocus
                                            />
                                            {error && (
                                                <p className="mt-2 text-sm text-rose-400 flex items-center gap-1">
                                                    <AlertCircle size={14} />
                                                    {error}
                                                </p>
                                            )}
                                        </div>

                                        {/* Current Filters Preview */}
                                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                                Current Filters
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {currentFilters.commodities.length > 0 && (
                                                    <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-lg border border-amber-500/30">
                                                        {currentFilters.commodities.join(', ')}
                                                    </span>
                                                )}
                                                {currentFilters.exchanges.length > 0 && (
                                                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-lg border border-blue-500/30">
                                                        {currentFilters.exchanges.join(', ')}
                                                    </span>
                                                )}
                                                {(currentFilters.minPrice || currentFilters.maxPrice) && (
                                                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-lg border border-emerald-500/30">
                                                        Price: ${currentFilters.minPrice || '0'} - ${currentFilters.maxPrice || '∞'}
                                                    </span>
                                                )}
                                                {(currentFilters.minChange || currentFilters.maxChange) && (
                                                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-lg border border-purple-500/30">
                                                        Change: {currentFilters.minChange || '-∞'}% to {currentFilters.maxChange || '+∞'}%
                                                    </span>
                                                )}
                                                {currentFilters.near52WeekHigh && (
                                                    <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded-lg border border-cyan-500/30">
                                                        Near 52W High
                                                    </span>
                                                )}
                                                {currentFilters.near52WeekLow && (
                                                    <span className="px-2 py-1 bg-rose-500/20 text-rose-400 text-xs rounded-lg border border-rose-500/30">
                                                        Near 52W Low
                                                    </span>
                                                )}
                                                {getActiveFiltersCount(currentFilters) === 0 && (
                                                    <span className="text-gray-500 text-sm">No filters applied</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 mt-3">
                                                {resultCount} results with current filters
                                            </p>
                                        </div>

                                        {/* Save Button */}
                                        <button
                                            onClick={handleSave}
                                            className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-xl hover:from-cyan-400 hover:to-blue-500 transition flex items-center justify-center gap-2"
                                        >
                                            <Save size={18} />
                                            Save Query
                                        </button>
                                    </>
                                )}
                            </div>
                        ) : (
                            /* Load Mode */
                            <div className="space-y-3">
                                {savedQueries.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                                            <Search className="w-8 h-8 text-gray-600" />
                                        </div>
                                        <p className="text-gray-400">No saved queries yet</p>
                                        <p className="text-sm text-gray-600 mt-1">Save a query to load it later</p>
                                    </div>
                                ) : (
                                    savedQueries.map((query) => (
                                        <motion.div
                                            key={query.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="group p-4 bg-white/5 rounded-xl border border-white/10 hover:border-cyan-500/30 transition cursor-pointer"
                                            onClick={() => handleLoad(query)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="font-medium text-white group-hover:text-cyan-400 transition">
                                                        {query.name}
                                                    </h3>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={12} />
                                                            {formatDate(query.createdAt)}
                                                        </span>
                                                        <span>{getActiveFiltersCount(query.filters)} filters</span>
                                                        {query.resultCount !== undefined && (
                                                            <span>{query.resultCount} results</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(query.id);
                                                    }}
                                                    className="p-2 text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            {/* Filter Preview Tags */}
                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                {query.filters.commodities.slice(0, 2).map(c => (
                                                    <span key={c} className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400/80 text-[10px] rounded">
                                                        {c}
                                                    </span>
                                                ))}
                                                {query.filters.commodities.length > 2 && (
                                                    <span className="px-1.5 py-0.5 bg-gray-500/10 text-gray-500 text-[10px] rounded">
                                                        +{query.filters.commodities.length - 2}
                                                    </span>
                                                )}
                                                {query.filters.exchanges.slice(0, 2).map(e => (
                                                    <span key={e} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400/80 text-[10px] rounded">
                                                        {e}
                                                    </span>
                                                ))}
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
