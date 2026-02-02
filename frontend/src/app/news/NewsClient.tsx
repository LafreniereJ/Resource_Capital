'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, Clock, MapPin, Gem, ArrowRight, Zap, Globe, ChevronRight, Building2, Tag, X, ExternalLink, Loader2, BookOpen } from 'lucide-react';
import { SentimentBadge } from '@/components/SentimentBadge';
import { BackgroundEffects } from '@/components/ui/BackgroundEffects';

interface NewsArticle {
    id: number;
    ticker: string;
    title: string;
    description: string;
    source: string;
    url: string;
    published_at: string;
    image_url?: string;
    category?: string;
}

interface NewsClientProps {
    initialNews: NewsArticle[];
}

interface ArticleContent {
    title: string;
    source: string;
    published_at: string;
    time_ago: string;
    ticker?: string;
    content: string;
    content_type: 'full' | 'summary';
    image_url?: string;
    original_url: string;
    error?: string;
}

// Metal categories with colors
const METALS = [
    { id: 'all', name: 'All Metals', color: 'from-slate-500 to-slate-600', bgColor: 'bg-slate-500', keywords: [] },
    { id: 'gold', name: 'Gold', color: 'from-yellow-500 to-amber-600', bgColor: 'bg-yellow-500', keywords: ['gold', 'au', 'bullion', 'precious metal'] },
    { id: 'copper', name: 'Copper', color: 'from-orange-500 to-red-600', bgColor: 'bg-orange-500', keywords: ['copper', 'cu'] },
    { id: 'lithium', name: 'Lithium', color: 'from-cyan-400 to-blue-500', bgColor: 'bg-cyan-400', keywords: ['lithium', 'li', 'battery', 'ev'] },
    { id: 'nickel', name: 'Nickel', color: 'from-emerald-500 to-green-600', bgColor: 'bg-emerald-500', keywords: ['nickel', 'ni'] },
    { id: 'uranium', name: 'Uranium', color: 'from-lime-400 to-green-500', bgColor: 'bg-lime-400', keywords: ['uranium', 'nuclear'] },
    { id: 'silver', name: 'Silver', color: 'from-slate-300 to-slate-500', bgColor: 'bg-slate-300', keywords: ['silver', 'ag'] },
    { id: 'zinc', name: 'Zinc', color: 'from-indigo-400 to-purple-500', bgColor: 'bg-indigo-400', keywords: ['zinc', 'zn'] },
    { id: 'iron', name: 'Iron Ore', color: 'from-red-700 to-red-900', bgColor: 'bg-red-700', keywords: ['iron ore', 'iron'] },
    { id: 'potash', name: 'Potash', color: 'from-pink-400 to-rose-500', bgColor: 'bg-pink-400', keywords: ['potash', 'fertilizer'] },
];

// Canadian regions with colors
const REGIONS = [
    { id: 'all', name: 'All Regions', color: 'text-slate-400' },
    { id: 'ontario', name: 'Ontario', color: 'text-blue-400', keywords: ['ontario', 'timmins', 'sudbury', 'red lake', 'kirkland'] },
    { id: 'quebec', name: 'Quebec', color: 'text-indigo-400', keywords: ['quebec', 'abitibi', 'val-d\'or', 'chibougamau', 'rouyn'] },
    { id: 'bc', name: 'British Columbia', color: 'text-emerald-400', keywords: ['british columbia', ' bc ', 'vancouver', 'kamloops'] },
    { id: 'nunavut', name: 'Nunavut', color: 'text-cyan-400', keywords: ['nunavut', 'arctic', 'baffin'] },
    { id: 'yukon', name: 'Yukon', color: 'text-purple-400', keywords: ['yukon', 'whitehorse'] },
    { id: 'nwt', name: 'NWT', color: 'text-teal-400', keywords: ['northwest territories', 'nwt', 'yellowknife'] },
    { id: 'saskatchewan', name: 'Saskatchewan', color: 'text-amber-400', keywords: ['saskatchewan', 'saskatoon', 'athabasca'] },
    { id: 'international', name: 'International', color: 'text-rose-400', keywords: ['chile', 'peru', 'australia', 'mexico', 'argentina', 'greenland', 'indonesia', 'congo'] },
];

// Placeholder images by category - AI-generated commodity-themed images
const PLACEHOLDER_IMAGES: Record<string, string> = {
    gold: '/assets/placeholders/gold.png',
    copper: '/assets/placeholders/copper.png',
    lithium: '/assets/placeholders/lithium.png',
    nickel: '/assets/placeholders/copper.png', // Use copper for nickel (similar industrial)
    uranium: '/assets/placeholders/uranium.png',
    silver: '/assets/placeholders/silver.png',
    zinc: '/assets/placeholders/silver.png', // Use silver for zinc (similar underground)
    iron: '/assets/placeholders/copper.png', // Use copper for iron (similar open pit)
    potash: '/assets/placeholders/mining.png',
    default: '/assets/placeholders/mining.png',
};

export default function NewsClient({ initialNews }: NewsClientProps) {
    const [news] = useState<NewsArticle[]>(initialNews);
    const [loading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMetal, setSelectedMetal] = useState('all');
    const [selectedRegion, setSelectedRegion] = useState('all');

    // Article viewer state
    const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
    const [articleContent, setArticleContent] = useState<ArticleContent | null>(null);
    const [articleLoading, setArticleLoading] = useState(false);

    // Fetch article content for on-site viewing
    const openArticle = async (article: NewsArticle) => {
        setSelectedArticle(article);
        setArticleLoading(true);
        setArticleContent(null);

        try {
            const response = await fetch(`/api/news/article/${article.id}/content`);
            if (response.ok) {
                const data = await response.json();
                setArticleContent(data);
            } else {
                // Fallback to basic article info
                setArticleContent({
                    title: article.title,
                    source: article.source,
                    published_at: article.published_at,
                    time_ago: formatTimeAgo(article.published_at),
                    ticker: article.ticker,
                    content: article.description || '',
                    content_type: 'summary',
                    original_url: article.url
                });
            }
        } catch {
            setArticleContent({
                title: article.title,
                source: article.source,
                published_at: article.published_at,
                time_ago: formatTimeAgo(article.published_at),
                ticker: article.ticker,
                content: article.description || '',
                content_type: 'summary',
                original_url: article.url
            });
        } finally {
            setArticleLoading(false);
        }
    };

    const closeArticle = () => {
        setSelectedArticle(null);
        setArticleContent(null);
    };

    // Filter news based on selected metal and region
    const filteredNews = useMemo(() => {
        let filtered = [...news];

        // Filter by metal
        if (selectedMetal !== 'all') {
            const metal = METALS.find(m => m.id === selectedMetal);
            if (metal) {
                filtered = filtered.filter(article => {
                    const text = `${article.title} ${article.description}`.toLowerCase();
                    return metal.keywords.some(kw => text.includes(kw));
                });
            }
        }

        // Filter by region
        if (selectedRegion !== 'all') {
            const region = REGIONS.find(r => r.id === selectedRegion);
            if (region && region.keywords) {
                filtered = filtered.filter(article => {
                    const text = `${article.title} ${article.description}`.toLowerCase();
                    return region.keywords!.some(kw => text.includes(kw));
                });
            }
        }

        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(article =>
                article.title.toLowerCase().includes(query) ||
                article.description?.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [news, selectedMetal, selectedRegion, searchQuery]);

    // Get featured article (first one with image)
    const featuredArticle = filteredNews.find(a => a.image_url) || filteredNews[0];
    const remainingNews = filteredNews.filter(a => a.id !== featuredArticle?.id);

    // Detect if article is "breaking" (less than 2 hours old)
    const isBreaking = (dateStr: string) => {
        const pubDate = new Date(dateStr);
        const now = new Date();
        const diffHours = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60);
        return diffHours < 2;
    };

    // Detect metal from article
    const detectMetal = (article: NewsArticle) => {
        const text = `${article.title} ${article.description}`.toLowerCase();
        for (const metal of METALS.slice(1)) {
            if (metal.keywords.some(kw => text.includes(kw))) {
                return metal;
            }
        }
        return null;
    };

    // Detect region from article
    const detectRegion = (article: NewsArticle) => {
        const text = `${article.title} ${article.description}`.toLowerCase();
        for (const region of REGIONS.slice(1)) {
            if (region.keywords && region.keywords.some(kw => text.includes(kw))) {
                return region;
            }
        }
        return null;
    };

    const formatTimeAgo = (dateStr: string) => {
        if (!dateStr) return 'Recently';

        try {
            const pubDate = new Date(dateStr);
            const now = new Date();
            const diffMs = Math.abs(now.getTime() - pubDate.getTime()); // Always positive
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
            return pubDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch {
            return 'Recently';
        }
    };

    // Strip HTML from description
    const stripHtml = (html: string) => {
        return html?.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() || '';
    };

    // Calculate read time based on word count (average 200 words per minute)
    const calculateReadTime = (text: string): string => {
        if (!text) return '1 min';
        const cleanText = stripHtml(text);
        const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
        // Articles typically have 3-5x more content than the description/summary
        const estimatedFullWordCount = wordCount * 4;
        const minutes = Math.ceil(estimatedFullWordCount / 200);
        return minutes <= 1 ? '1 min' : `${minutes} min`;
    };

    return (
        <div className="min-h-screen bg-[var(--color-bg-base)] text-slate-200 selection:bg-[var(--color-accent-muted)]">
            {/* Ambient Background */}
            <BackgroundEffects />

            {/* Header */}
            <header className="relative z-20 border-b border-white/5">
                <div className="max-w-[1800px] mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gradient-mid)] blur-lg opacity-50" />
                                <div className="relative p-3 bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gradient-mid)] rounded-2xl">
                                    <Gem className="text-white" size={28} />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-white tracking-tight">Market Intelligence</h1>
                                <p className="text-sm text-slate-500 font-medium mt-0.5">Canadian Mining & Metals • via TMX, Mining.com, Kitco</p>
                            </div>
                        </div>

                        {/* Search - Desktop */}
                        <div className="hidden md:flex items-center gap-4">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search intelligence..."
                                    className="w-80 pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-accent)]/50 focus:bg-white/10 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Search - Mobile */}
                    <div className="md:hidden mt-4">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search intelligence..."
                                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-accent)]/50 focus:bg-white/10 transition-all"
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* Metal Filter Bar */}
            <div className="relative z-10 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl sticky top-0">
                <div className="max-w-[1800px] mx-auto px-6 py-4">
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-2">Commodity:</span>
                        {METALS.map((metal) => (
                            <button
                                key={metal.id}
                                onClick={() => setSelectedMetal(metal.id)}
                                className={`relative px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 ${selectedMetal === metal.id
                                    ? 'text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10'
                                    }`}
                            >
                                {selectedMetal === metal.id && (
                                    <motion.div
                                        layoutId="metalPill"
                                        className={`absolute inset-0 bg-gradient-to-r ${metal.color} rounded-xl`}
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className="relative z-10">{metal.name}</span>
                            </button>
                        ))}

                        <div className="w-px h-8 bg-white/10 mx-4 shrink-0" />

                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-2">Region:</span>
                        <select
                            value={selectedRegion}
                            onChange={(e) => setSelectedRegion(e.target.value)}
                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-white focus:outline-none focus:border-[var(--color-accent)]/50 appearance-none cursor-pointer hover:bg-white/10 transition-all"
                        >
                            {REGIONS.map((region) => (
                                <option key={region.id} value={region.id} className="bg-slate-900">
                                    {region.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="relative z-10 max-w-[1800px] mx-auto px-6 py-10">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[60vh]">
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 rounded-full border-4 border-[var(--color-accent)]/20" />
                            <div className="absolute inset-0 rounded-full border-t-4 border-[var(--color-accent)] animate-spin" />
                        </div>
                        <p className="mt-8 text-slate-500 font-medium">Loading market intelligence...</p>
                    </div>
                ) : filteredNews.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                        <div className="p-8 bg-slate-900/50 rounded-3xl mb-8 border border-white/5">
                            <Search size={48} className="text-slate-700" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-3">No Intelligence Found</h3>
                        <p className="text-slate-500 max-w-md">No articles match your current filters. Try selecting a different commodity or region.</p>
                        <button
                            onClick={() => { setSelectedMetal('all'); setSelectedRegion('all'); setSearchQuery(''); }}
                            className="mt-8 px-8 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-light)] rounded-xl text-white font-bold transition-all"
                        >
                            Reset All Filters
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Featured Hero Article */}
                        {featuredArticle && (
                            <motion.section
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-12"
                            >
                                <div
                                    onClick={() => openArticle(featuredArticle)}
                                    className="group block relative rounded-3xl overflow-hidden bg-slate-900/50 border border-white/5 hover:border-blue-500/30 transition-all duration-500 cursor-pointer"
                                >
                                    <div className="grid lg:grid-cols-2 gap-0">
                                        {/* Image Side */}
                                        <div className="relative h-64 lg:h-[400px] overflow-hidden">
                                            {featuredArticle.image_url ? (
                                                <img
                                                    src={featuredArticle.image_url}
                                                    alt={featuredArticle.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                />
                                            ) : (
                                                <img
                                                    src={PLACEHOLDER_IMAGES[detectMetal(featuredArticle)?.id || 'default']}
                                                    alt={detectMetal(featuredArticle)?.name || 'Mining'}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-slate-950/80 lg:block hidden" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent lg:hidden" />

                                            {/* Breaking Badge */}
                                            {isBreaking(featuredArticle.published_at) && (
                                                <div className="absolute top-6 left-6">
                                                    <div className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-full animate-pulse">
                                                        <Zap size={14} className="text-white" />
                                                        <span className="text-xs font-black text-white uppercase tracking-wider">Breaking</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Content Side */}
                                        <div className="p-8 lg:p-12 flex flex-col justify-center">
                                            <div className="flex items-center gap-3 mb-4">
                                                <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                                                    <Clock size={12} />
                                                    {formatTimeAgo(featuredArticle.published_at)}
                                                </span>
                                                <span className="text-slate-700">•</span>
                                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                    {featuredArticle.source}
                                                </span>
                                                <span className="text-slate-700">•</span>
                                                <span className="flex items-center gap-1 text-xs font-medium text-blue-400/70">
                                                    <BookOpen size={11} />
                                                    {calculateReadTime(featuredArticle.description)} read
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3 mb-3">
                                                <SentimentBadge
                                                    title={featuredArticle.title}
                                                    description={featuredArticle.description}
                                                    size="md"
                                                />
                                            </div>

                                            <h2 className="text-3xl lg:text-4xl font-black text-white mb-4 leading-tight group-hover:text-blue-400 transition-colors">
                                                {featuredArticle.title}
                                            </h2>

                                            <p className="text-lg text-slate-400 mb-6 line-clamp-3 leading-relaxed">
                                                {stripHtml(featuredArticle.description)}
                                            </p>

                                            {/* Tags at bottom */}
                                            <div className="flex flex-wrap gap-2 mb-6">
                                                {detectMetal(featuredArticle) && (
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r ${detectMetal(featuredArticle)!.color} text-white`}>
                                                        <Tag size={10} />
                                                        {detectMetal(featuredArticle)!.name}
                                                    </span>
                                                )}
                                                {detectRegion(featuredArticle) && (
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 ${detectRegion(featuredArticle)!.color}`}>
                                                        <MapPin size={10} />
                                                        {detectRegion(featuredArticle)!.name}
                                                    </span>
                                                )}
                                                {featuredArticle.ticker && (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--color-accent-muted)] text-[var(--color-accent-light)]">
                                                        <Building2 size={10} />
                                                        {featuredArticle.ticker}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3 text-blue-400 font-bold group-hover:gap-4 transition-all">
                                                Read Full Analysis
                                                <ArrowRight size={20} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.section>
                        )}

                        {/* Section Headers */}
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="text-blue-500" size={24} />
                                <h2 className="text-xl font-bold text-white">Latest Intelligence</h2>
                                <span className="px-3 py-1 bg-blue-500/10 rounded-full text-xs font-bold text-blue-400">
                                    {remainingNews.length} Reports
                                </span>
                            </div>
                        </div>

                        {/* Dynamic Grid Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {remainingNews.map((article, index) => {
                                const hasImage = !!article.image_url;
                                // Make every 5th article with image span 2 columns
                                const isWide = hasImage && index % 5 === 0 && index > 0;
                                const metal = detectMetal(article);
                                const region = detectRegion(article);

                                // Text-only compact card for articles without images
                                if (!hasImage) {
                                    return (
                                        <motion.article
                                            key={article.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            className="group relative rounded-xl bg-slate-900/20 border border-white/5 hover:border-blue-500/20 hover:bg-slate-900/40 transition-all duration-300"
                                        >
                                            <div onClick={() => openArticle(article)} className="block p-4 cursor-pointer">
                                                {/* Header */}
                                                <div className="flex items-center justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{article.source}</span>
                                                        <span className="text-slate-700">•</span>
                                                        <span className="text-[10px] font-medium text-slate-500">{formatTimeAgo(article.published_at)}</span>
                                                        <span className="text-slate-700">•</span>
                                                        <span className="flex items-center gap-0.5 text-[10px] font-medium text-blue-400/60">
                                                            <BookOpen size={9} />
                                                            {calculateReadTime(article.description)}
                                                        </span>
                                                    </div>
                                                    {isBreaking(article.published_at) && (
                                                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-600/90 rounded text-[9px] font-bold text-white shrink-0">
                                                            <Zap size={8} />
                                                            NEW
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Title */}
                                                <h3 className="text-sm font-bold text-white mb-2 group-hover:text-blue-400 transition-colors leading-snug line-clamp-2">
                                                    {article.title}
                                                </h3>

                                                {/* Sentiment Badge */}
                                                <div className="mb-2">
                                                    <SentimentBadge
                                                        title={article.title}
                                                        description={article.description}
                                                        size="sm"
                                                    />
                                                </div>

                                                {/* Tags */}
                                                {(metal || region || article.ticker) && (
                                                    <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/5">
                                                        {metal && (
                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${metal.bgColor} text-white`}>
                                                                {metal.name}
                                                            </span>
                                                        )}
                                                        {region && (
                                                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/10 ${region.color}`}>
                                                                <MapPin size={7} />
                                                                {region.name}
                                                            </span>
                                                        )}
                                                        {article.ticker && (
                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400">
                                                                <Building2 size={7} />
                                                                {article.ticker}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.article>
                                    );
                                }

                                // Full image card for articles with images
                                return (
                                    <motion.article
                                        key={article.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className={`group relative rounded-2xl overflow-hidden bg-slate-900/30 border border-white/5 hover:border-blue-500/30 hover:bg-slate-900/50 transition-all duration-300 flex flex-col ${isWide ? 'md:col-span-2' : ''
                                            }`}
                                    >
                                        <div onClick={() => openArticle(article)} className="flex flex-col h-full cursor-pointer">
                                            {/* Image */}
                                            <div className={`relative overflow-hidden ${isWide ? 'h-56' : 'h-40'}`}>
                                                <img
                                                    src={article.image_url}
                                                    alt={article.title}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />

                                                {/* Breaking indicator */}
                                                {isBreaking(article.published_at) && (
                                                    <div className="absolute top-3 right-3">
                                                        <span className="flex items-center gap-1 px-2 py-1 bg-red-600/90 rounded-lg text-[10px] font-bold text-white backdrop-blur-sm">
                                                            <Zap size={10} />
                                                            NEW
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="p-5 flex flex-col flex-1">
                                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{article.source}</span>
                                                    <span className="text-slate-700">•</span>
                                                    <span className="text-[10px] font-medium text-slate-500">{formatTimeAgo(article.published_at)}</span>
                                                    <span className="text-slate-700">•</span>
                                                    <span className="flex items-center gap-0.5 text-[10px] font-medium text-blue-400/60">
                                                        <BookOpen size={9} />
                                                        {calculateReadTime(article.description)}
                                                    </span>
                                                </div>

                                                <h3 className={`font-bold text-white mb-2 group-hover:text-blue-400 transition-colors leading-snug ${isWide ? 'text-xl line-clamp-2' : 'text-sm line-clamp-3'
                                                    }`}>
                                                    {article.title}
                                                </h3>

                                                {/* Sentiment Badge */}
                                                <div className="mb-3">
                                                    <SentimentBadge
                                                        title={article.title}
                                                        description={article.description}
                                                        size="sm"
                                                    />
                                                </div>

                                                {isWide && (
                                                    <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                                                        {stripHtml(article.description)}
                                                    </p>
                                                )}

                                                {/* Tags at bottom */}
                                                {(metal || region || article.ticker) && (
                                                    <div className="mt-auto pt-4 border-t border-white/5">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {metal && (
                                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold ${metal.bgColor} text-white`}>
                                                                    {metal.name}
                                                                </span>
                                                            )}
                                                            {region && (
                                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-white/10 ${region.color}`}>
                                                                    <MapPin size={8} />
                                                                    {region.name}
                                                                </span>
                                                            )}
                                                            {article.ticker && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">
                                                                    <Building2 size={8} />
                                                                    {article.ticker}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.article>
                                );
                            })}
                        </div>
                    </>
                )}
            </main>

            {/* Article Viewer Modal */}
            <AnimatePresence>
                {selectedArticle && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        onClick={closeArticle}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 shadow-2xl mx-2 md:mx-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                onClick={closeArticle}
                                className="absolute top-4 right-4 z-10 p-2 bg-slate-800/80 hover:bg-slate-700 rounded-full backdrop-blur-sm transition-colors"
                            >
                                <X size={20} className="text-white" />
                            </button>

                            {/* Article Content */}
                            <div className="overflow-y-auto max-h-[90vh]">
                                {/* Header Image */}
                                {(articleContent?.image_url || selectedArticle.image_url) && (
                                    <div className="relative h-64 md:h-80 overflow-hidden">
                                        <img
                                            src={articleContent?.image_url || selectedArticle.image_url}
                                            alt={selectedArticle.title}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
                                    </div>
                                )}

                                {/* Content Area */}
                                <div className="p-5 md:p-8 lg:p-12">
                                    {/* Meta info */}
                                    <div className="flex flex-wrap items-center gap-3 mb-4">
                                        <span className="flex items-center gap-1 text-sm font-medium text-slate-400">
                                            <Clock size={14} />
                                            {articleContent?.time_ago || formatTimeAgo(selectedArticle.published_at)}
                                        </span>
                                        <span className="text-slate-700">•</span>
                                        <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                                            {articleContent?.source || selectedArticle.source}
                                        </span>
                                        <span className="text-slate-700">•</span>
                                        <span className="flex items-center gap-1 text-sm font-medium text-blue-400">
                                            <BookOpen size={13} />
                                            {calculateReadTime(articleContent?.content || selectedArticle.description)} read
                                        </span>
                                        {(articleContent?.ticker || selectedArticle.ticker) && (
                                            <>
                                                <span className="text-slate-700">•</span>
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-sm font-bold">
                                                    <Building2 size={12} />
                                                    {articleContent?.ticker || selectedArticle.ticker}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* Title */}
                                    <h1 className="text-3xl md:text-4xl font-black text-white mb-6 leading-tight">
                                        {articleContent?.title || selectedArticle.title}
                                    </h1>

                                    {/* Loading State */}
                                    {articleLoading && (
                                        <div className="flex items-center justify-center py-16">
                                            <Loader2 size={40} className="text-blue-500 animate-spin" />
                                        </div>
                                    )}

                                    {/* Article Content */}
                                    {!articleLoading && articleContent && (
                                        <div className="prose prose-invert prose-lg max-w-none">
                                            {articleContent.content_type === 'summary' && (
                                                <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                                    <p className="text-amber-400 text-sm">
                                                        Showing article summary. Full content may be available at the source.
                                                    </p>
                                                </div>
                                            )}
                                            {articleContent.error && (
                                                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                                    <p className="text-red-400 text-sm">{articleContent.error}</p>
                                                </div>
                                            )}
                                            <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                {articleContent.content || stripHtml(selectedArticle.description)}
                                            </div>
                                        </div>
                                    )}

                                    {/* Original Source Link */}
                                    <div className="mt-8 pt-6 border-t border-white/10">
                                        <a
                                            href={articleContent?.original_url || selectedArticle.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-light)] rounded-xl text-white font-bold transition-all"
                                        >
                                            <ExternalLink size={18} />
                                            View Original Source
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
