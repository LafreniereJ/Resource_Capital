'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useToast } from '@/components/ui/Toast';

interface QueueItem {
    id: number;
    source_type: string;
    document_type: string;
    status: string;
    priority: number;
    discovered_at: string;
    company_name: string;
    ticker: string;
    source_url: string;
}

export default function AdminQueuePage() {
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const toast = useToast();

    useEffect(() => {
        fetchQueue();
    }, []);

    const fetchQueue = async () => {
        try {
            const res = await fetch('/api/admin/queue');
            const data = await res.json();
            setQueue(data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to fetch queue');
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setUploading(true);

        const formData = new FormData(e.currentTarget);

        try {
            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                toast.success('File uploaded successfully!', 'Document added to the extraction queue.');
                fetchQueue();
                (e.target as HTMLFormElement).reset();
            } else {
                const error = await res.json();
                toast.error('Upload failed', error.error);
            }
        } catch (err) {
            console.error(err);
            toast.error('Upload failed', 'Network error occurred');
        } finally {
            setUploading(false);
        }
    };

    const approveItem = async (id: number) => {
        if (!confirm('Start extraction for this item?')) return;

        try {
            const res = await fetch('/api/admin/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });

            if (res.ok) {
                toast.success('Extraction complete!', 'Document has been processed successfully.');
                fetchQueue();
            } else {
                const error = await res.json();
                toast.error('Extraction failed', error.details || error.error);
            }
        } catch (err) {
            console.error(err);
            toast.error('Extraction error', 'Network error occurred');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 py-8">

                {/* Upload Section */}
                <div className="mb-12 bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <h2 className="text-xl font-bold mb-4">Manual Ingestion</h2>
                    <form onSubmit={handleUpload} className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm text-slate-400 mb-1">Company Ticker</label>
                            <input
                                name="ticker"
                                type="text"
                                placeholder="e.g. ABX"
                                required
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div className="flex-1">
                            <label className="block text-sm text-slate-400 mb-1">Document Type</label>
                            <select
                                name="docType"
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded focus:outline-none focus:border-blue-500"
                            >
                                <option value="production_report">Production Report</option>
                                <option value="technical_report">Technical Report (43-101)</option>
                                <option value="financial">Financial Statements</option>
                            </select>
                        </div>

                        <div className="flex-[2]">
                            <label className="block text-sm text-slate-400 mb-1">File (PDF)</label>
                            <input
                                name="file"
                                type="file"
                                accept=".pdf"
                                required
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded focus:outline-none focus:border-blue-500 file:mr-4 file:py-0 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={uploading}
                            className="px-6 py-2 bg-green-600 rounded hover:bg-green-700 font-medium disabled:opacity-50"
                        >
                            {uploading ? 'Uploading...' : 'Upload & Queue'}
                        </button>
                    </form>
                </div>

                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Ingestion Queue</h1>
                    <button
                        onClick={fetchQueue}
                        className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                    >
                        Refresh
                    </button>
                </div>

                {loading ? (
                    <div>Loading...</div>
                ) : (
                    <div className="bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900 border-b border-slate-700">
                                <tr>
                                    <th className="p-4">Priority</th>
                                    <th className="p-4">Company</th>
                                    <th className="p-4">Document</th>
                                    <th className="p-4">Found</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {queue.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-700/50">
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${item.priority >= 10 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {item.priority}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold">{item.ticker}</div>
                                            <div className="text-sm text-slate-400">{item.company_name}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="capitalize">{item.document_type.replace('_', ' ')}</div>
                                            <a href={item.source_url} target="_blank" className="text-xs text-blue-400 hover:underline truncate max-w-[200px] block">
                                                {item.source_url}
                                            </a>
                                        </td>
                                        <td className="p-4 text-sm text-slate-400">
                                            {new Date(item.discovered_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded text-xs uppercase font-semibold">
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => approveItem(item.id)}
                                                className="px-3 py-1 bg-green-600 rounded text-sm hover:bg-green-700 font-medium"
                                            >
                                                Extract
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {queue.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-400">
                                            No pending documents in queue.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
