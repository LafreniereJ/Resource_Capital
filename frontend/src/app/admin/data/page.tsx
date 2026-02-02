'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';

interface DataOverride {
    id: number;
    entity_type: 'company' | 'project' | 'news';
    entity_id: number;
    field_name: string;
    original_value: string | null;
    override_value: string;
    reason: string;
    created_by: string;
    created_at: string;
    is_active: boolean;
}

interface Company {
    id: number;
    ticker: string;
    name: string;
    current_price: number | null;
    market_cap: number | null;
}

export default function AdminDataPage() {
    const [overrides, setOverrides] = useState<DataOverride[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [searchTicker, setSearchTicker] = useState('');
    const toast = useToast();

    // Form state
    const [formData, setFormData] = useState({
        entity_type: 'company' as 'company' | 'project' | 'news',
        entity_id: '',
        field_name: '',
        override_value: '',
        reason: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [overridesRes, companiesRes] = await Promise.all([
                fetch('/api/admin/data-overrides'),
                fetch('/api/companies?limit=20'),
            ]);

            if (overridesRes.ok) {
                const data = await overridesRes.json();
                setOverrides(data.overrides || []);
            }

            if (companiesRes.ok) {
                const data = await companiesRes.json();
                setCompanies(data.data || data || []);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const res = await fetch('/api/admin/data-overrides', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                toast.success('Override created', 'Data override has been applied');
                setShowAddForm(false);
                setFormData({
                    entity_type: 'company',
                    entity_id: '',
                    field_name: '',
                    override_value: '',
                    reason: '',
                });
                fetchData();
            } else {
                throw new Error('Failed');
            }
        } catch {
            toast.error('Failed to create override');
        }
    };

    const deleteOverride = async (id: number) => {
        if (!confirm('Are you sure you want to remove this override?')) return;

        try {
            const res = await fetch(`/api/admin/data-overrides?id=${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success('Override removed');
                fetchData();
            } else {
                throw new Error('Failed');
            }
        } catch {
            toast.error('Failed to remove override');
        }
    };

    const searchCompany = async () => {
        if (!searchTicker.trim()) return;

        try {
            const res = await fetch(`/api/companies/${searchTicker.toUpperCase()}`);
            if (res.ok) {
                const company = await res.json();
                if (company) {
                    setFormData(prev => ({
                        ...prev,
                        entity_type: 'company',
                        entity_id: company.id.toString(),
                    }));
                    toast.success('Company found', `${company.name} (${company.ticker})`);
                }
            } else {
                toast.error('Company not found');
            }
        } catch {
            toast.error('Search failed');
        }
    };

    const companyFields = [
        'name', 'ticker', 'exchange', 'commodity', 'description',
        'current_price', 'market_cap', 'website', 'headquarters',
        'day_change_percent', 'high_52w', 'low_52w'
    ];

    const projectFields = [
        'name', 'location', 'stage', 'commodity', 'latitude', 'longitude',
        'status', 'ownership_percent', 'resources', 'reserves'
    ];

    const newsFields = ['title', 'description', 'source', 'ticker'];

    if (loading) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-8 bg-slate-700 rounded w-48"></div>
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 bg-slate-700 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Data Overrides</h1>
                    <p className="text-slate-400 text-sm">Manually correct bad data from automated sources</p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                    {showAddForm ? 'Cancel' : '+ Add Override'}
                </button>
            </div>

            {/* Add Override Form */}
            {showAddForm && (
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                    <h2 className="text-lg font-semibold mb-4">Create New Override</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Entity Type */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Entity Type</label>
                                <select
                                    value={formData.entity_type}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        entity_type: e.target.value as 'company' | 'project' | 'news',
                                        field_name: '',
                                    })}
                                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                                >
                                    <option value="company">Company</option>
                                    <option value="project">Project</option>
                                    <option value="news">News</option>
                                </select>
                            </div>

                            {/* Entity Search */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">
                                    {formData.entity_type === 'company' ? 'Find Company by Ticker' : 'Entity ID'}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={formData.entity_type === 'company' ? searchTicker : formData.entity_id}
                                        onChange={(e) => {
                                            if (formData.entity_type === 'company') {
                                                setSearchTicker(e.target.value);
                                            } else {
                                                setFormData({ ...formData, entity_id: e.target.value });
                                            }
                                        }}
                                        placeholder={formData.entity_type === 'company' ? 'e.g. ABX' : 'Enter ID'}
                                        className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                                    />
                                    {formData.entity_type === 'company' && (
                                        <button
                                            type="button"
                                            onClick={searchCompany}
                                            className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 text-sm"
                                        >
                                            Search
                                        </button>
                                    )}
                                </div>
                                {formData.entity_id && (
                                    <p className="text-xs text-green-400 mt-1">Selected ID: {formData.entity_id}</p>
                                )}
                            </div>

                            {/* Field Name */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Field to Override</label>
                                <select
                                    value={formData.field_name}
                                    onChange={(e) => setFormData({ ...formData, field_name: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                                    required
                                >
                                    <option value="">Select field...</option>
                                    {(formData.entity_type === 'company' ? companyFields :
                                      formData.entity_type === 'project' ? projectFields : newsFields
                                    ).map(field => (
                                        <option key={field} value={field}>{field}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Override Value */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">New Value</label>
                                <input
                                    type="text"
                                    value={formData.override_value}
                                    onChange={(e) => setFormData({ ...formData, override_value: e.target.value })}
                                    placeholder="Enter the correct value"
                                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Reason for Override</label>
                            <textarea
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                placeholder="Why is this override needed?"
                                rows={2}
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                                required
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 text-sm font-medium"
                            >
                                Apply Override
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Quick Fix Section */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h2 className="text-lg font-semibold mb-4">Quick Data Fix</h2>
                <p className="text-slate-400 text-sm mb-4">
                    Common data issues that can be fixed with one click
                </p>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={async () => {
                            try {
                                const res = await fetch('/api/admin/data-fix/normalize-tickers', { method: 'POST' });
                                if (res.ok) {
                                    const data = await res.json();
                                    toast.success('Tickers normalized', `Fixed ${data.count || 0} tickers`);
                                }
                            } catch {
                                toast.error('Fix failed');
                            }
                        }}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium"
                    >
                        🔧 Normalize TSXV Tickers
                    </button>
                    <button
                        onClick={async () => {
                            try {
                                const res = await fetch('/api/admin/data-fix/remove-duplicates', { method: 'POST' });
                                if (res.ok) {
                                    const data = await res.json();
                                    toast.success('Duplicates removed', `Cleaned ${data.count || 0} records`);
                                }
                            } catch {
                                toast.error('Fix failed');
                            }
                        }}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium"
                    >
                        🧹 Remove Duplicate News
                    </button>
                    <button
                        onClick={async () => {
                            try {
                                const res = await fetch('/api/admin/data-fix/recalculate-stats', { method: 'POST' });
                                if (res.ok) {
                                    toast.success('Stats recalculated');
                                }
                            } catch {
                                toast.error('Fix failed');
                            }
                        }}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium"
                    >
                        📊 Recalculate Market Stats
                    </button>
                </div>
            </div>

            {/* Active Overrides Table */}
            <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                <div className="p-4 border-b border-slate-700">
                    <h2 className="text-lg font-semibold">Active Overrides</h2>
                </div>
                <table className="w-full">
                    <thead className="bg-slate-900">
                        <tr>
                            <th className="text-left p-4 text-slate-400 font-medium text-sm">Entity</th>
                            <th className="text-left p-4 text-slate-400 font-medium text-sm">Field</th>
                            <th className="text-left p-4 text-slate-400 font-medium text-sm">Original → Override</th>
                            <th className="text-left p-4 text-slate-400 font-medium text-sm">Reason</th>
                            <th className="text-left p-4 text-slate-400 font-medium text-sm">Created</th>
                            <th className="text-right p-4 text-slate-400 font-medium text-sm">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {overrides.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-400">
                                    No active overrides. Data is using automated values.
                                </td>
                            </tr>
                        ) : (
                            overrides.map((override) => (
                                <tr key={override.id} className="hover:bg-slate-700/50">
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            override.entity_type === 'company'
                                                ? 'bg-blue-500/20 text-blue-400'
                                                : override.entity_type === 'project'
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-purple-500/20 text-purple-400'
                                        }`}>
                                            {override.entity_type}
                                        </span>
                                        <span className="ml-2 text-sm text-slate-400">#{override.entity_id}</span>
                                    </td>
                                    <td className="p-4">
                                        <code className="text-sm bg-slate-900 px-2 py-1 rounded">
                                            {override.field_name}
                                        </code>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm">
                                            <span className="text-red-400 line-through">
                                                {override.original_value || 'null'}
                                            </span>
                                            <span className="text-slate-500 mx-2">→</span>
                                            <span className="text-green-400">
                                                {override.override_value}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-400 max-w-xs truncate">
                                        {override.reason}
                                    </td>
                                    <td className="p-4 text-sm text-slate-400">
                                        {new Date(override.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => deleteOverride(override.id)}
                                            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs font-medium"
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
