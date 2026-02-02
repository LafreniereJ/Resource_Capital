'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart3, Newspaper, TrendingUp, Search, Menu, X,
    ChevronDown, Building2, Globe, Loader2, FileText, LayoutDashboard,
    GitCompare, Handshake, Map, Settings, User, LogOut, SlidersHorizontal,
    Calculator, Bell
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

interface SearchResult {
    type: 'company' | 'news';
    id: number;
    ticker?: string;
    name: string;
    subtitle?: string;
    url: string;
}

const NAV_ITEMS = [
    { href: '/', label: 'Home', icon: LayoutDashboard },
    { href: '/screener', label: 'Screener', icon: SlidersHorizontal },
    { href: '/simulator', label: 'Simulator', icon: Calculator },
    { href: '/alerts', label: 'Alerts', icon: Bell },
    { href: '/map', label: 'Map', icon: Map },
    { href: '/compare', label: 'Compare', icon: GitCompare },
    { href: '/transactions', label: 'M&A', icon: Handshake },
    { href: '/news', label: 'News', icon: Newspaper },
    { href: '/reports', label: 'Reports', icon: FileText },
    { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading: authLoading, signOut } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };

    // Debounced search
    useEffect(() => {
        if (!searchQuery || searchQuery.length < 2) {
            setSearchResults([]);
            setSelectedIndex(-1);
            return;
        }

        const timer = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults(data.results || []);
                    setSelectedIndex(-1);
                }
            } catch (error) {
                console.error('Search failed:', error);
            } finally {
                setSearchLoading(false);
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, -1));
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            const result = searchResults[selectedIndex];
            if (result) {
                router.push(result.url);
                closeSearch();
            }
        } else if (e.key === 'Escape') {
            closeSearch();
        }
    }, [searchResults, selectedIndex, router]);

    const closeSearch = () => {
        setSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedIndex(-1);
    };

    const handleResultClick = (url: string) => {
        router.push(url);
        closeSearch();
    };

    return (
        <>
            {/* Main Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
                <div className="max-w-[1800px] mx-auto px-4 md:px-6">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-2 group">
                            <span className="text-lg font-bold text-white tracking-tight">Resource</span>
                            <span className="text-lg font-bold gradient-text-accent tracking-tight">Capital</span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-1">
                            {NAV_ITEMS.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`relative px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${active
                                            ? 'text-white'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        {active && (
                                            <motion.div
                                                layoutId="navIndicator"
                                                className="absolute inset-0 bg-[var(--color-accent-muted)] rounded-xl border border-[var(--color-accent)]/20"
                                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                        <Icon size={16} className="relative z-10" />
                                        <span className="relative z-10">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Right Side Actions */}
                        <div className="flex items-center gap-3">
                            {/* Search Button */}
                            <button
                                onClick={() => setSearchOpen(true)}
                                className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-[var(--color-accent-muted)] hover:border-[var(--color-accent)]/30 transition-all"
                                aria-label="Search"
                            >
                                <Search size={18} />
                            </button>

                            {/* User Menu */}
                            {!authLoading && (
                                <>
                                    {user ? (
                                        <div className="relative">
                                            <button
                                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                                className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-[var(--color-accent-muted)] hover:border-[var(--color-accent)]/30 transition-all"
                                            >
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">
                                                    {user.email?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <ChevronDown size={14} className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            <AnimatePresence>
                                                {userMenuOpen && (
                                                    <>
                                                        <div
                                                            className="fixed inset-0 z-40"
                                                            onClick={() => setUserMenuOpen(false)}
                                                        />
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                            className="absolute right-0 top-full mt-2 w-56 z-50 glass-card p-2"
                                                        >
                                                            <div className="px-3 py-2 border-b border-white/5 mb-2">
                                                                <p className="text-sm text-white font-medium truncate">{user.email}</p>
                                                                <p className="text-xs text-slate-500">Signed in</p>
                                                            </div>
                                                            <Link
                                                                href="/settings"
                                                                onClick={() => setUserMenuOpen(false)}
                                                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors text-sm"
                                                            >
                                                                <Settings size={16} />
                                                                Settings
                                                            </Link>
                                                            <button
                                                                onClick={async () => {
                                                                    await signOut();
                                                                    setUserMenuOpen(false);
                                                                    router.push('/');
                                                                }}
                                                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-sm"
                                                            >
                                                                <LogOut size={16} />
                                                                Sign out
                                                            </button>
                                                        </motion.div>
                                                    </>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ) : (
                                        <Link
                                            href="/login"
                                            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-gradient-mid)] hover:brightness-110 text-white font-semibold text-sm shadow-lg shadow-[var(--color-accent-muted)] transition-all"
                                        >
                                            Sign in
                                        </Link>
                                    )}
                                </>
                            )}

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all"
                                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                            >
                                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden border-t border-white/5 bg-[#050510]/95 backdrop-blur-xl"
                        >
                            <div className="px-4 py-4 space-y-2">
                                {NAV_ITEMS.map((item) => {
                                    const Icon = item.icon;
                                    const active = isActive(item.href);
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${active
                                                ? 'text-white bg-[var(--color-accent-muted)] border border-[var(--color-accent)]/20'
                                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            <Icon size={18} />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* Search Overlay */}
            <AnimatePresence>
                {searchOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
                        onClick={closeSearch}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            className="max-w-2xl mx-auto mt-24 px-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="glass-card overflow-hidden">
                                {/* Search Input */}
                                <div className="flex items-center gap-4 p-4">
                                    {searchLoading ? (
                                        <Loader2 size={20} className="text-[var(--color-accent)] animate-spin" />
                                    ) : (
                                        <Search size={20} className="text-slate-500" />
                                    )}
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Search companies, tickers, news..."
                                        className="flex-1 bg-transparent text-white text-lg placeholder-slate-500 focus:outline-none"
                                        autoFocus
                                    />
                                    <button
                                        onClick={closeSearch}
                                        className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Search Results */}
                                {searchResults.length > 0 && (
                                    <div className="border-t border-white/5 max-h-80 overflow-y-auto">
                                        {searchResults.map((result, index) => (
                                            <button
                                                key={`${result.type}-${result.id}`}
                                                onClick={() => handleResultClick(result.url)}
                                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${selectedIndex === index
                                                    ? 'bg-[var(--color-accent-muted)] border-l-2 border-[var(--color-accent)]'
                                                    : 'hover:bg-white/5 border-l-2 border-transparent'
                                                    }`}
                                            >
                                                {result.type === 'company' ? (
                                                    <Building2 size={18} className="text-violet-400 shrink-0" />
                                                ) : (
                                                    <FileText size={18} className="text-cyan-400 shrink-0" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        {result.ticker && (
                                                            <span className="text-[var(--color-accent)] font-mono font-bold text-sm">
                                                                {result.ticker}
                                                            </span>
                                                        )}
                                                        <span className="text-white font-medium truncate">
                                                            {result.name}
                                                        </span>
                                                    </div>
                                                    {result.subtitle && (
                                                        <span className="text-xs text-slate-500">
                                                            {result.subtitle}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-slate-600 shrink-0">
                                                    {result.type === 'company' ? 'Company' : 'News'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* No Results */}
                                {searchQuery.length >= 2 && !searchLoading && searchResults.length === 0 && (
                                    <div className="border-t border-white/5 p-8 text-center">
                                        <Search size={32} className="mx-auto text-slate-700 mb-3" />
                                        <p className="text-slate-500">No results found for "{searchQuery}"</p>
                                    </div>
                                )}

                                {/* Quick Links (shown when no search) */}
                                {searchQuery.length < 2 && (
                                    <div className="border-t border-white/5 p-4">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Quick Links</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Link
                                                href="/screener"
                                                onClick={closeSearch}
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-sm"
                                            >
                                                <SlidersHorizontal size={16} className="text-purple-400" />
                                                Advanced Screener
                                            </Link>
                                            <Link
                                                href="/stocks"
                                                onClick={closeSearch}
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-sm"
                                            >
                                                <BarChart3 size={16} className="text-violet-400" />
                                                Stock List
                                            </Link>
                                            <Link
                                                href="/news"
                                                onClick={closeSearch}
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-sm"
                                            >
                                                <Newspaper size={16} className="text-cyan-400" />
                                                Latest News
                                            </Link>
                                            <Link
                                                href="/map"
                                                onClick={closeSearch}
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-sm"
                                            >
                                                <Map size={16} className="text-emerald-400" />
                                                Project Map
                                            </Link>
                                        </div>
                                        <p className="text-xs text-slate-600 mt-4 text-center">
                                            Use ↑↓ to navigate, Enter to select, Esc to close
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Spacer for fixed navbar */}
            <div className="h-16" />
        </>
    );
}
