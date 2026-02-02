'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';

interface User {
    id: string;
    email: string;
    created_at: string;
    last_sign_in: string | null;
    subscription_tier: 'free' | 'pro' | 'institutional';
    subscription_status: 'active' | 'canceled' | 'past_due' | null;
    api_calls_today: number;
    is_blocked: boolean;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTier, setFilterTier] = useState<string>('all');
    const toast = useToast();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (!res.ok) throw new Error('Failed to fetch users');
            const data = await res.json();
            setUsers(data.users || []);
        } catch (err) {
            console.error('Error fetching users:', err);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const toggleBlockUser = async (userId: string, currentlyBlocked: boolean) => {
        if (!confirm(`Are you sure you want to ${currentlyBlocked ? 'unblock' : 'block'} this user?`)) return;

        try {
            const res = await fetch('/api/admin/users/block', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, blocked: !currentlyBlocked }),
            });

            if (res.ok) {
                toast.success(`User ${currentlyBlocked ? 'unblocked' : 'blocked'} successfully`);
                fetchUsers();
            } else {
                throw new Error('Failed');
            }
        } catch {
            toast.error('Failed to update user');
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = searchQuery === '' ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.id.includes(searchQuery);
        const matchesTier = filterTier === 'all' || user.subscription_tier === filterTier;
        return matchesSearch && matchesTier;
    });

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Never';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-8 bg-slate-700 rounded w-48"></div>
                <div className="h-12 bg-slate-700 rounded"></div>
                <div className="space-y-2">
                    {[...Array(10)].map((_, i) => (
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
                    <h1 className="text-2xl font-bold">User Management</h1>
                    <p className="text-slate-400 text-sm">{users.length} total users</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center">
                <div className="flex-1 max-w-md">
                    <input
                        type="text"
                        placeholder="Search by email or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                </div>
                <select
                    value={filterTier}
                    onChange={(e) => setFilterTier(e.target.value)}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                >
                    <option value="all">All Tiers</option>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="institutional">Institutional</option>
                </select>
                <button
                    onClick={fetchUsers}
                    className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                    Refresh
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <div className="text-2xl font-bold">{users.filter(u => u.subscription_tier === 'free').length}</div>
                    <div className="text-sm text-slate-400">Free Users</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <div className="text-2xl font-bold text-yellow-400">{users.filter(u => u.subscription_tier === 'pro').length}</div>
                    <div className="text-sm text-slate-400">Pro Users</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <div className="text-2xl font-bold text-purple-400">{users.filter(u => u.subscription_tier === 'institutional').length}</div>
                    <div className="text-sm text-slate-400">Institutional</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <div className="text-2xl font-bold text-red-400">{users.filter(u => u.is_blocked).length}</div>
                    <div className="text-sm text-slate-400">Blocked</div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                <table className="w-full">
                    <thead className="bg-slate-900">
                        <tr>
                            <th className="text-left p-4 text-slate-400 font-medium text-sm">User</th>
                            <th className="text-left p-4 text-slate-400 font-medium text-sm">Tier</th>
                            <th className="text-left p-4 text-slate-400 font-medium text-sm">Status</th>
                            <th className="text-left p-4 text-slate-400 font-medium text-sm">Created</th>
                            <th className="text-left p-4 text-slate-400 font-medium text-sm">Last Login</th>
                            <th className="text-left p-4 text-slate-400 font-medium text-sm">API Calls</th>
                            <th className="text-right p-4 text-slate-400 font-medium text-sm">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-slate-400">
                                    {searchQuery || filterTier !== 'all'
                                        ? 'No users match your filters'
                                        : 'No users found'}
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-700/50">
                                    <td className="p-4">
                                        <div className="font-medium">{user.email}</div>
                                        <div className="text-xs text-slate-500 font-mono">{user.id.slice(0, 8)}...</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            user.subscription_tier === 'institutional'
                                                ? 'bg-purple-500/20 text-purple-400'
                                                : user.subscription_tier === 'pro'
                                                ? 'bg-yellow-500/20 text-yellow-400'
                                                : 'bg-slate-600/50 text-slate-300'
                                        }`}>
                                            {user.subscription_tier}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {user.is_blocked ? (
                                            <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                                                Blocked
                                            </span>
                                        ) : user.subscription_status === 'active' ? (
                                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 bg-slate-600/50 text-slate-400 rounded text-xs font-medium">
                                                {user.subscription_status || 'Free'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-slate-400">
                                        {formatDate(user.created_at)}
                                    </td>
                                    <td className="p-4 text-sm text-slate-400">
                                        {formatDate(user.last_sign_in)}
                                    </td>
                                    <td className="p-4">
                                        <span className="text-sm font-mono">{user.api_calls_today}</span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => toggleBlockUser(user.id, user.is_blocked)}
                                                className={`px-3 py-1 rounded text-xs font-medium ${
                                                    user.is_blocked
                                                        ? 'bg-green-600 hover:bg-green-700'
                                                        : 'bg-red-600 hover:bg-red-700'
                                                }`}
                                            >
                                                {user.is_blocked ? 'Unblock' : 'Block'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    // View user details - could open modal or navigate
                                                    toast.info('User details', `Viewing ${user.email}`);
                                                }}
                                                className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-xs font-medium"
                                            >
                                                View
                                            </button>
                                        </div>
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
