'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, Search, Clock, Building2, Download, ArrowRight, BookOpen, Tag,
    Upload, X, File, CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { BackgroundEffects } from '@/components/ui/BackgroundEffects';

interface Report {
    id: number;
    title: string;
    ticker: string | null;
    filename: string;
    file_path: string;
    file_size: number | null;
    created_at: string;
}

interface ReportsClientProps {
    initialReports: Report[];
}

type FilterType = 'all' | 'company' | 'market';
type UploadState = 'idle' | 'preview' | 'uploading' | 'success' | 'error';

export default function ReportsClient({ initialReports }: ReportsClientProps) {
    const [reports, setReports] = useState<Report[]>(initialReports);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<FilterType>('all');

    // Upload state
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadState, setUploadState] = useState<UploadState>('idle');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadTicker, setUploadTicker] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { success, error } = useToast();

    const filteredReports = useMemo(() => {
        let filtered = [...reports];

        if (filterType === 'company') {
            filtered = filtered.filter(r => r.ticker !== null);
        } else if (filterType === 'market') {
            filtered = filtered.filter(r => r.ticker === null);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(r =>
                r.title.toLowerCase().includes(query) ||
                r.ticker?.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [reports, filterType, searchQuery]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTimeAgo = (dateStr: string) => {
        if (!dateStr) return 'Recently';
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = Math.abs(now.getTime() - date.getTime());
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
            return formatDate(dateStr);
        } catch {
            return 'Recently';
        }
    };

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const filterOptions: { id: FilterType; name: string }[] = [
        { id: 'all', name: 'All Reports' },
        { id: 'company', name: 'Company Reports' },
        { id: 'market', name: 'Market Reports' },
    ];

    // File validation
    const validateFile = (file: File): string | null => {
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            return 'Only PDF files are allowed';
        }
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            return 'File size must be less than 50MB';
        }
        return null;
    };

    // Handle file selection
    const handleFileSelect = useCallback((file: File) => {
        const validationError = validateFile(file);
        if (validationError) {
            setUploadError(validationError);
            setUploadState('error');
            return;
        }

        setSelectedFile(file);
        // Auto-fill title from filename (remove .pdf extension)
        const suggestedTitle = file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
        setUploadTitle(suggestedTitle);
        setUploadState('preview');
        setUploadError('');
    }, []);

    // Drag and drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    }, [handleFileSelect]);

    // Handle upload
    const handleUpload = async () => {
        if (!selectedFile || !uploadTitle.trim()) return;

        setUploadState('uploading');
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', uploadTitle.trim());
        if (uploadTicker.trim()) {
            formData.append('ticker', uploadTicker.trim().toUpperCase());
        }

        try {
            // Simulate progress for better UX
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            const response = await fetch('/api/reports', {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Upload failed');
            }

            const newReport = await response.json();

            // Add to reports list
            setReports(prev => [newReport, ...prev]);

            setUploadState('success');
            success('Report uploaded', `"${uploadTitle}" has been uploaded successfully`);

            // Reset after short delay
            setTimeout(() => {
                resetUpload();
            }, 1500);

        } catch (err) {
            setUploadError(err instanceof Error ? err.message : 'Upload failed');
            setUploadState('error');
            error('Upload failed', err instanceof Error ? err.message : 'Please try again');
        }
    };

    // Reset upload state
    const resetUpload = () => {
        setShowUploadModal(false);
        setUploadState('idle');
        setSelectedFile(null);
        setUploadTitle('');
        setUploadTicker('');
        setUploadProgress(0);
        setUploadError('');
    };

    // Cancel and go back to file selection
    const handleBack = () => {
        setSelectedFile(null);
        setUploadTitle('');
        setUploadTicker('');
        setUploadState('idle');
        setUploadError('');
    };

    return (
        <div className="min-h-screen bg-[var(--color-bg-base)] text-slate-200 selection:bg-[var(--color-accent-muted)]">
            {/* Ambient Background */}
            <BackgroundEffects />

            {/* Header */}
            <header className="relative z-20 border-b border-white/5">
                <div className="max-w-[1400px] mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gradient-mid)] blur-lg opacity-50" />
                                <div className="relative p-3 bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gradient-mid)] rounded-2xl">
                                    <BookOpen className="text-white" size={28} />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-white tracking-tight">Research Reports</h1>
                                <p className="text-sm text-slate-500 font-medium mt-0.5">In-depth Analysis & Deep Dives</p>
                            </div>
                        </div>

                        {/* Search and Upload */}
                        <div className="hidden md:flex items-center gap-4">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search reports..."
                                    className="w-72 pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all"
                                />
                            </div>
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-gradient-mid)] rounded-2xl text-white font-bold hover:opacity-90 transition-opacity"
                            >
                                <Upload size={18} />
                                Upload Report
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Filter Bar */}
            <div className="relative z-10 border-b border-white/5 bg-[var(--color-bg-surface)] backdrop-blur-xl sticky top-0">
                <div className="max-w-[1400px] mx-auto px-6 py-4">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Filter:</span>
                        {filterOptions.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => setFilterType(option.id)}
                                className={`relative px-4 py-2 rounded-xl text-sm font-bold transition-all ${filterType === option.id
                                    ? 'text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10'
                                    }`}
                            >
                                {filterType === option.id && (
                                    <motion.div
                                        layoutId="filterPill"
                                        className="absolute inset-0 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-gradient-mid)] rounded-xl"
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className="relative z-10">{option.name}</span>
                            </button>
                        ))}

                        {/* Mobile upload button */}
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="md:hidden ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-xl text-white font-bold text-sm"
                        >
                            <Upload size={16} />
                            Upload
                        </button>

                        <div className="hidden md:block ml-auto">
                            <span className="text-sm text-slate-500">
                                {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="relative z-10 max-w-[1400px] mx-auto px-6 py-10">
                {filteredReports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                        <div className="p-8 bg-[var(--color-bg-surface)]/50 rounded-3xl mb-8 border border-white/5">
                            <FileText size={48} className="text-slate-700" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-3">No Reports Found</h3>
                        <p className="text-slate-500 max-w-md">
                            {reports.length === 0
                                ? 'No reports have been uploaded yet. Upload your first research report to get started.'
                                : 'No reports match your current filters. Try a different search term or filter.'}
                        </p>
                        {reports.length === 0 ? (
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="mt-8 flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold transition-all"
                            >
                                <Upload size={18} />
                                Upload First Report
                            </button>
                        ) : searchQuery || filterType !== 'all' ? (
                            <button
                                onClick={() => { setSearchQuery(''); setFilterType('all'); }}
                                className="mt-8 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold transition-all"
                            >
                                Clear Filters
                            </button>
                        ) : null}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredReports.map((report, index) => (
                            <motion.article
                                key={report.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="group relative rounded-2xl overflow-hidden bg-[var(--color-bg-surface)]/30 border border-white/5 hover:border-indigo-500/30 hover:bg-[var(--color-bg-surface)]/50 transition-all duration-300"
                            >
                                <Link href={`/reports/${report.id}`} className="block">
                                    {/* Gradient Header */}
                                    <div className="h-32 bg-gradient-to-br from-[var(--color-accent)]/20 to-[var(--color-gradient-mid)]/20 flex items-center justify-center relative overflow-hidden">
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_70%)]" />
                                        <FileText size={48} className="text-indigo-400/50 group-hover:text-indigo-400/70 transition-colors" />

                                        {/* Ticker Badge */}
                                        {report.ticker ? (
                                            <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-bold backdrop-blur-sm">
                                                <Building2 size={12} />
                                                {report.ticker}
                                            </span>
                                        ) : (
                                            <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-bold backdrop-blur-sm">
                                                <Tag size={12} />
                                                Market
                                            </span>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-5">
                                        <div className="flex items-center gap-2 mb-3 text-slate-500">
                                            <Clock size={12} />
                                            <span className="text-xs font-medium">{formatTimeAgo(report.created_at)}</span>
                                            {report.file_size && (
                                                <>
                                                    <span className="text-slate-700">•</span>
                                                    <span className="text-xs">{formatFileSize(report.file_size)}</span>
                                                </>
                                            )}
                                        </div>

                                        <h3 className="text-lg font-bold text-white mb-4 group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
                                            {report.title}
                                        </h3>

                                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                            <span className="flex items-center gap-2 text-indigo-400 text-sm font-medium group-hover:gap-3 transition-all">
                                                Read Report
                                                <ArrowRight size={16} />
                                            </span>
                                            <a
                                                href={`/reports/${report.file_path}`}
                                                download={report.filename}
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                                title="Download PDF"
                                            >
                                                <Download size={16} />
                                            </a>
                                        </div>
                                    </div>
                                </Link>
                            </motion.article>
                        ))}
                    </div>
                )}
            </main>

            {/* Upload Modal */}
            <AnimatePresence>
                {showUploadModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                        onClick={() => uploadState !== 'uploading' && resetUpload()}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-lg bg-[var(--color-bg-surface)] border border-white/10 rounded-3xl overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/20 rounded-xl">
                                        <Upload className="text-indigo-400" size={20} />
                                    </div>
                                    <h2 className="text-xl font-bold text-white">Upload Report</h2>
                                </div>
                                {uploadState !== 'uploading' && (
                                    <button
                                        onClick={resetUpload}
                                        className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </div>

                            {/* Modal Content */}
                            <div className="p-6">
                                {/* Idle State - File Selection */}
                                {uploadState === 'idle' && (
                                    <div
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`
                                            relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
                                            ${isDragging
                                                ? 'border-indigo-500 bg-indigo-500/10'
                                                : 'border-white/10 hover:border-indigo-500/50 hover:bg-white/5'
                                            }
                                        `}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleFileSelect(file);
                                            }}
                                            className="hidden"
                                        />
                                        <div className="p-4 bg-white/5 rounded-2xl inline-block mb-4">
                                            <Upload className="text-slate-400" size={32} />
                                        </div>
                                        <p className="text-white font-semibold mb-2">
                                            Drop your PDF here or click to browse
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            Maximum file size: 50MB
                                        </p>
                                    </div>
                                )}

                                {/* Preview State - Show file details and form */}
                                {uploadState === 'preview' && selectedFile && (
                                    <div className="space-y-5">
                                        {/* File Preview Card */}
                                        <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                                            <div className="p-3 bg-rose-500/20 rounded-xl">
                                                <File className="text-rose-400" size={24} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-semibold truncate">{selectedFile.name}</p>
                                                <p className="text-sm text-slate-500">{formatFileSize(selectedFile.size)}</p>
                                            </div>
                                            <button
                                                onClick={handleBack}
                                                className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                                title="Remove file"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>

                                        {/* Title Input */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                                Report Title *
                                            </label>
                                            <input
                                                type="text"
                                                value={uploadTitle}
                                                onChange={(e) => setUploadTitle(e.target.value)}
                                                placeholder="Enter report title"
                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all"
                                            />
                                        </div>

                                        {/* Ticker Input (Optional) */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                                Company Ticker <span className="text-slate-600">(optional)</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={uploadTicker}
                                                onChange={(e) => setUploadTicker(e.target.value.toUpperCase())}
                                                placeholder="e.g., ABX, NEM"
                                                maxLength={10}
                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all uppercase"
                                            />
                                            <p className="mt-1.5 text-xs text-slate-600">
                                                Link this report to a specific company
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Uploading State */}
                                {uploadState === 'uploading' && (
                                    <div className="text-center py-8">
                                        <div className="relative inline-flex items-center justify-center mb-6">
                                            <div className="absolute w-20 h-20 border-4 border-indigo-500/20 rounded-full" />
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                className="w-20 h-20"
                                            >
                                                <Loader2 className="w-20 h-20 text-indigo-500" strokeWidth={2} />
                                            </motion.div>
                                        </div>
                                        <p className="text-white font-semibold mb-2">Uploading report...</p>
                                        <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${uploadProgress}%` }}
                                                className="h-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-gradient-mid)] rounded-full"
                                            />
                                        </div>
                                        <p className="text-sm text-slate-500">{uploadProgress}%</p>
                                    </div>
                                )}

                                {/* Success State */}
                                {uploadState === 'success' && (
                                    <div className="text-center py-8">
                                        <div className="p-4 bg-emerald-500/20 rounded-2xl inline-block mb-4">
                                            <CheckCircle className="text-emerald-400" size={40} />
                                        </div>
                                        <p className="text-white font-semibold mb-2">Upload Complete!</p>
                                        <p className="text-sm text-slate-500">Your report has been uploaded successfully</p>
                                    </div>
                                )}

                                {/* Error State */}
                                {uploadState === 'error' && (
                                    <div className="text-center py-8">
                                        <div className="p-4 bg-rose-500/20 rounded-2xl inline-block mb-4">
                                            <AlertCircle className="text-rose-400" size={40} />
                                        </div>
                                        <p className="text-white font-semibold mb-2">Upload Failed</p>
                                        <p className="text-sm text-rose-400 mb-4">{uploadError}</p>
                                        <button
                                            onClick={handleBack}
                                            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-all"
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer - Only show on preview state */}
                            {uploadState === 'preview' && (
                                <div className="flex items-center justify-end gap-3 p-6 border-t border-white/5">
                                    <button
                                        onClick={handleBack}
                                        className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white font-medium transition-all"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleUpload}
                                        disabled={!uploadTitle.trim()}
                                        className="px-6 py-2.5 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-gradient-mid)] rounded-xl text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Upload Report
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
