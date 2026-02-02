'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, X, Loader2, Building2, FileText, Map, TrendingUp,
    BarChart3, Newspaper, GitCompare, Settings, Clock, Command,
    ArrowRight
} from 'lucide-react';

interface SearchResult {
    type: 'company' | 'news' | 'page';
    id: number | string;
    ticker?: string;
    name: string;
    subtitle?: string;
    url: string;
    icon?: React.ElementType;
}

const QUICK_ACTIONS: SearchResult[] = [
    { type: 'page', id: 'screener', name: 'Stock Screener', subtitle: 'Filter and search stocks', url: '/screener', icon: BarChart3 },
    { type: 'page', id: 'map', name: 'Project Map', subtitle: 'Interactive mining map', url: '/map', icon: Map },
    { type: 'page', id: 'compare', name: 'Compare Companies', subtitle: 'Side-by-side analysis', url: '/compare', icon: GitCompare },
    { type: 'page', id: 'news', name: 'Mining News', subtitle: 'Latest industry news', url: '/news', icon: Newspaper },
    { type: 'page', id: 'settings', name: 'Settings', subtitle: 'App configuration', url: '/settings', icon: Settings },
];

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    // Load recent searches from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('rc-recent-searches');
            if (saved) {
                setRecentSearches(JSON.parse(saved).slice(0, 5));
            }
        }
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Global keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                if (!isOpen) {
                    // This should be handled by parent - emit event
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Debounced search
    useEffect(() => {
        if (!query || query.length < 2) {
            setResults([]);
            setSelectedIndex(0);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                if (res.ok) {
                    const data = await res.json();
                    const apiResults: SearchResult[] = (data.results || []).map((r: any) => ({
                        ...r,
                        icon: r.type === 'company' ? Building2 : FileText,
                    }));

                    // Filter quick actions that match query
                    const matchingActions = QUICK_ACTIONS.filter(
                        a => a.name.toLowerCase().includes(query.toLowerCase())
                    );

                    setResults([...matchingActions, ...apiResults]);
                    setSelectedIndex(0);
                }
            } catch (error) {
                console.error('Search failed:', error);
            } finally {
                setLoading(false);
            }
        }, 150);

        return () => clearTimeout(timer);
    }, [query]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        const items = query.length >= 2 ? results : QUICK_ACTIONS;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                const selected = items[selectedIndex];
                if (selected) {
                    navigateTo(selected);
                }
                break;
            case 'Escape':
                e.preventDefault();
                onClose();
                break;
        }
    }, [results, selectedIndex, query, onClose]);

    const navigateTo = (item: SearchResult) => {
        // Save to recent searches if it's a company
        if (item.type === 'company' && item.ticker) {
            const newRecent = [item.ticker, ...recentSearches.filter(s => s !== item.ticker)].slice(0, 5);
            setRecentSearches(newRecent);
            localStorage.setItem('rc-recent-searches', JSON.stringify(newRecent));
        }

        router.push(item.url);
        onClose();
    };

    const displayItems = query.length >= 2 ? results : QUICK_ACTIONS;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="max-w-2xl mx-auto mt-[15vh] px-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="glass-card overflow-hidden shadow-2xl">
                        {/* Search Input */}
                        <div className="flex items-center gap-3 p-4 border-b border-white/5">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent-muted)]">
                                {loading ? (
                                    <Loader2 size={16} className="text-[var(--color-accent)] animate-spin" />
                                ) : (
                                    <Search size={16} className="text-[var(--color-accent)]" />
                                )}
                            </div>
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Search companies, pages, or type a command..."
                                className="flex-1 bg-transparent text-white text-lg placeholder-gray-500 focus:outline-none font-medium"
                            />
                            <div className="flex items-center gap-2">
                                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded bg-white/5 text-xs text-gray-500 font-mono">
                                    <Command size={10} />K
                                </kbd>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Results */}
                        <div className="max-h-[50vh] overflow-y-auto">
                            {/* Section Header */}
                            <div className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wider font-semibold bg-black/20">
                                {query.length >= 2 ? (
                                    loading ? 'Searching...' : `${results.length} results`
                                ) : (
                                    'Quick Actions'
                                )}
                            </div>

                            {/* Items */}
                            {displayItems.map((item, index) => {
                                const Icon = item.icon || Building2;
                                const isSelected = index === selectedIndex;

                                return (
                                    <button
                                        key={`${item.type}-${item.id}`}
                                        onClick={() => navigateTo(item)}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                                            isSelected
                                                ? 'bg-[var(--color-accent-muted)] border-l-2 border-[var(--color-accent)]'
                                                : 'hover:bg-white/5 border-l-2 border-transparent'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                            item.type === 'company' ? 'bg-violet-500/20' :
                                            item.type === 'news' ? 'bg-cyan-500/20' : 'bg-white/5'
                                        }`}>
                                            <Icon size={16} className={
                                                item.type === 'company' ? 'text-violet-400' :
                                                item.type === 'news' ? 'text-cyan-400' : 'text-gray-400'
                                            } />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                {item.ticker && (
                                                    <span className="text-[var(--color-accent)] font-mono font-bold text-sm">
                                                        {item.ticker}
                                                    </span>
                                                )}
                                                <span className="text-white font-medium truncate">
                                                    {item.name}
                                                </span>
                                            </div>
                                            {item.subtitle && (
                                                <span className="text-xs text-gray-500 truncate block">
                                                    {item.subtitle}
                                                </span>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <ArrowRight size={14} className="text-[var(--color-accent)]" />
                                        )}
                                    </button>
                                );
                            })}

                            {/* No Results */}
                            {query.length >= 2 && !loading && results.length === 0 && (
                                <div className="p-8 text-center">
                                    <Search size={32} className="mx-auto text-gray-700 mb-3" />
                                    <p className="text-gray-500">No results for "{query}"</p>
                                    <p className="text-xs text-gray-600 mt-1">Try a different search term</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2 border-t border-white/5 bg-black/20 flex items-center justify-between text-xs text-gray-600">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 rounded bg-white/5 font-mono">↑↓</kbd>
                                    navigate
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 rounded bg-white/5 font-mono">↵</kbd>
                                    select
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 rounded bg-white/5 font-mono">esc</kbd>
                                    close
                                </span>
                            </div>
                            {recentSearches.length > 0 && query.length < 2 && (
                                <span className="text-gray-500">
                                    Recent: {recentSearches.slice(0, 3).join(', ')}
                                </span>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
