'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
    Bell, BellOff, Plus, Trash2, Edit2, X, Check, AlertTriangle,
    TrendingUp, TrendingDown, Volume2, Target, Search, ArrowUp,
    ArrowDown, Activity, Mail, Smartphone, History, RefreshCw
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { BackgroundEffects } from '@/components/ui/BackgroundEffects';
import { getUserAlerts, createAlert, updateAlert, deleteAlert, getAlertHistory, PriceAlert } from '@/lib/db';

interface AlertWithCompany extends PriceAlert {
    companies: {
        name: string;
        current_price: number;
        day_change_percent: number;
    };
}

interface Stock {
    id: number;
    ticker: string;
    name: string;
    current_price: number;
}

const ALERT_TYPES = [
    { value: 'price_above', label: 'Price Above', icon: ArrowUp, color: 'emerald' },
    { value: 'price_below', label: 'Price Below', icon: ArrowDown, color: 'rose' },
    { value: 'change_percent_above', label: 'Daily Gain Above', icon: TrendingUp, color: 'emerald' },
    { value: 'change_percent_below', label: 'Daily Loss Below', icon: TrendingDown, color: 'rose' },
    { value: 'volume_above', label: 'Volume Above', icon: Volume2, color: 'blue' },
    { value: '52w_high_near', label: 'Near 52W High', icon: Target, color: 'amber' },
    { value: '52w_low_near', label: 'Near 52W Low', icon: Target, color: 'purple' },
] as const;

export default function AlertsManager() {
    const { user, loading: authLoading } = useAuth();
    const [alerts, setAlerts] = useState<AlertWithCompany[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Create form state
    const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
    const [alertType, setAlertType] = useState<PriceAlert['alert_type']>('price_above');
    const [thresholdValue, setThresholdValue] = useState('');
    const [alertName, setAlertName] = useState('');
    const [notifyEmail, setNotifyEmail] = useState(true);
    const [creating, setCreating] = useState(false);

    // Load alerts
    useEffect(() => {
        async function loadAlerts() {
            if (!user) return;
            setLoading(true);
            try {
                const data = await getUserAlerts(user.id);
                setAlerts(data as AlertWithCompany[]);
            } catch (error) {
                console.error('Failed to load alerts:', error);
            } finally {
                setLoading(false);
            }
        }
        if (!authLoading) {
            loadAlerts();
        }
    }, [user, authLoading]);

    // Load stocks for search
    useEffect(() => {
        async function loadStocks() {
            try {
                const res = await fetch('/api/stocks?limit=500');
                const data = await res.json();
                setStocks(data.stocks || []);
            } catch (error) {
                console.error('Failed to load stocks:', error);
            }
        }
        loadStocks();
    }, []);

    // Filter stocks for search
    const filteredStocks = searchQuery
        ? stocks.filter(s =>
            s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 8)
        : [];

    // Handle create alert
    const handleCreate = async () => {
        if (!user || !selectedStock || !thresholdValue) return;

        setCreating(true);
        try {
            await createAlert({
                user_id: user.id,
                company_id: selectedStock.id,
                ticker: selectedStock.ticker,
                alert_type: alertType,
                threshold_value: parseFloat(thresholdValue),
                name: alertName || undefined,
                notify_email: notifyEmail,
            });

            // Reload alerts
            const data = await getUserAlerts(user.id);
            setAlerts(data as AlertWithCompany[]);

            // Reset form
            setShowCreateModal(false);
            setSelectedStock(null);
            setAlertType('price_above');
            setThresholdValue('');
            setAlertName('');
            setSearchQuery('');
        } catch (error) {
            console.error('Failed to create alert:', error);
        } finally {
            setCreating(false);
        }
    };

    // Handle toggle alert
    const handleToggle = async (alert: AlertWithCompany) => {
        try {
            await updateAlert(alert.id, { is_active: !alert.is_active });
            setAlerts(alerts.map(a =>
                a.id === alert.id ? { ...a, is_active: !a.is_active } : a
            ));
        } catch (error) {
            console.error('Failed to toggle alert:', error);
        }
    };

    // Handle delete alert
    const handleDelete = async (alertId: string) => {
        try {
            await deleteAlert(alertId);
            setAlerts(alerts.filter(a => a.id !== alertId));
        } catch (error) {
            console.error('Failed to delete alert:', error);
        }
    };

    const getAlertTypeInfo = (type: string) => {
        return ALERT_TYPES.find(t => t.value === type) || ALERT_TYPES[0];
    };

    const formatThreshold = (type: string, value: number) => {
        if (type.includes('percent')) {
            return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
        }
        if (type === 'volume_above') {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
            return value.toString();
        }
        return `$${value.toFixed(2)}`;
    };

    // Not logged in state
    if (!authLoading && !user) {
        return (
            <div className="min-h-screen bg-[var(--color-bg-base)] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                        <Bell size={32} className="text-gray-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">Sign In Required</h2>
                    <p className="text-gray-500 mb-6">Please sign in to manage your price alerts</p>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-accent)] text-white font-medium rounded-xl hover:bg-[var(--color-accent-light)] transition"
                    >
                        Sign In
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--color-bg-base)] text-gray-200 font-sans overflow-x-hidden selection:bg-[var(--color-accent-muted)]">
            <BackgroundEffects />

            <div className="relative z-10 px-6 md:px-12 py-8 max-w-5xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between mb-8"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center">
                            <Bell className="w-7 h-7 text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-600">
                                Price Alerts
                            </h1>
                            <p className="text-gray-500">
                                Get notified when stocks hit your targets
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-400 hover:to-orange-400 transition"
                    >
                        <Plus size={18} />
                        New Alert
                    </button>
                </motion.div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-3 gap-4 mb-8"
                >
                    <div className="bg-[var(--color-bg-surface)]/80 border border-white/10 rounded-xl p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Active Alerts</p>
                        <p className="text-2xl font-bold text-white">
                            {alerts.filter(a => a.is_active).length}
                        </p>
                    </div>
                    <div className="bg-[var(--color-bg-surface)]/80 border border-white/10 rounded-xl p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Triggered</p>
                        <p className="text-2xl font-bold text-amber-400">
                            {alerts.filter(a => a.is_triggered).length}
                        </p>
                    </div>
                    <div className="bg-[var(--color-bg-surface)]/80 border border-white/10 rounded-xl p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Alerts</p>
                        <p className="text-2xl font-bold text-gray-400">
                            {alerts.length}
                        </p>
                    </div>
                </motion.div>

                {/* Alerts List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-[var(--color-bg-surface)]/80 border border-white/10 rounded-2xl p-5 animate-pulse">
                                    <div className="h-6 bg-white/5 rounded w-1/3 mb-3"></div>
                                    <div className="h-4 bg-white/5 rounded w-1/2"></div>
                                </div>
                            ))}
                        </div>
                    ) : alerts.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                                <BellOff size={32} className="text-gray-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-300 mb-2">
                                No Alerts Yet
                            </h3>
                            <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                Create your first price alert to get notified when stocks hit your target prices.
                            </p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500/20 text-amber-400 font-medium rounded-xl hover:bg-amber-500/30 transition"
                            >
                                <Plus size={18} />
                                Create Alert
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {alerts.map((alert, index) => {
                                const typeInfo = getAlertTypeInfo(alert.alert_type);
                                const Icon = typeInfo.icon;

                                return (
                                    <motion.div
                                        key={alert.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={`bg-[var(--color-bg-surface)]/80 border rounded-2xl p-5 backdrop-blur-sm ${alert.is_triggered
                                            ? 'border-amber-500/30 bg-amber-500/5'
                                            : alert.is_active
                                                ? 'border-white/10'
                                                : 'border-white/5 opacity-60'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${typeInfo.color}-500/10 border border-${typeInfo.color}-500/20`}>
                                                    <Icon className={`w-6 h-6 text-${typeInfo.color}-400`} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Link
                                                            href={`/companies/${alert.ticker}`}
                                                            className="text-lg font-bold text-white hover:text-[var(--color-accent)] transition"
                                                        >
                                                            {alert.ticker}
                                                        </Link>
                                                        {alert.is_triggered && (
                                                            <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">
                                                                Triggered
                                                            </span>
                                                        )}
                                                        {!alert.is_active && (
                                                            <span className="px-2 py-0.5 text-xs bg-gray-500/20 text-gray-400 rounded-full">
                                                                Paused
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-400 mb-2">
                                                        {alert.companies?.name}
                                                    </p>
                                                    <div className="flex items-center gap-4 text-sm">
                                                        <span className={`text-${typeInfo.color}-400 font-medium`}>
                                                            {typeInfo.label}: {formatThreshold(alert.alert_type, alert.threshold_value)}
                                                        </span>
                                                        <span className="text-gray-600">•</span>
                                                        <span className="text-gray-500">
                                                            Current: ${alert.companies?.current_price?.toFixed(2) || '—'}
                                                        </span>
                                                    </div>
                                                    {alert.name && (
                                                        <p className="text-xs text-gray-600 mt-2">
                                                            {alert.name}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleToggle(alert)}
                                                    className={`p-2 rounded-lg transition ${alert.is_active
                                                        ? 'text-emerald-400 hover:bg-emerald-500/10'
                                                        : 'text-gray-600 hover:bg-white/5'
                                                        }`}
                                                    title={alert.is_active ? 'Pause alert' : 'Resume alert'}
                                                >
                                                    {alert.is_active ? <Bell size={18} /> : <BellOff size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(alert.id)}
                                                    className="p-2 text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                                                    title="Delete alert"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Create Alert Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-[var(--color-bg-surface)] border border-white/10 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/5">
                                <h2 className="text-xl font-bold text-white">Create Price Alert</h2>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-2 rounded-lg hover:bg-white/5 transition text-gray-500"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
                                {/* Stock Selection */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                        Stock
                                    </label>
                                    {selectedStock ? (
                                        <div className="flex items-center justify-between p-3 bg-[var(--color-accent-muted)] border border-[var(--color-accent)]/30 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[var(--color-accent)] font-mono font-bold">
                                                    {selectedStock.ticker}
                                                </span>
                                                <span className="text-gray-400">
                                                    {selectedStock.name}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setSelectedStock(null)}
                                                className="p-1 hover:bg-white/5 rounded"
                                            >
                                                <X size={16} className="text-gray-500" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search stocks..."
                                                className="w-full bg-white/5 border border-white/10 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500/50 transition"
                                            />
                                            {filteredStocks.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-bg-surface)] border border-white/10 rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto">
                                                    {filteredStocks.map((stock) => (
                                                        <button
                                                            key={stock.id}
                                                            onClick={() => {
                                                                setSelectedStock(stock);
                                                                setSearchQuery('');
                                                            }}
                                                            className="w-full px-4 py-3 text-left hover:bg-white/5 transition flex items-center justify-between"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[var(--color-accent)] font-mono font-bold">
                                                                    {stock.ticker}
                                                                </span>
                                                                <span className="text-gray-400 text-sm truncate">
                                                                    {stock.name}
                                                                </span>
                                                            </div>
                                                            <span className="text-gray-500 text-sm">
                                                                ${stock.current_price?.toFixed(2)}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Alert Type */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                        Alert Type
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {ALERT_TYPES.slice(0, 4).map((type) => {
                                            const Icon = type.icon;
                                            return (
                                                <button
                                                    key={type.value}
                                                    onClick={() => setAlertType(type.value)}
                                                    className={`p-3 rounded-xl border transition flex items-center gap-2 ${alertType === type.value
                                                        ? `bg-${type.color}-500/10 border-${type.color}-500/30 text-${type.color}-400`
                                                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                                                        }`}
                                                >
                                                    <Icon size={16} />
                                                    <span className="text-sm font-medium">{type.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Threshold Value */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                        {alertType.includes('percent') ? 'Percentage (%)' : alertType === 'volume_above' ? 'Volume' : 'Price ($)'}
                                    </label>
                                    <input
                                        type="number"
                                        value={thresholdValue}
                                        onChange={(e) => setThresholdValue(e.target.value)}
                                        placeholder={alertType.includes('percent') ? 'e.g., 5' : alertType === 'volume_above' ? 'e.g., 1000000' : 'e.g., 10.50'}
                                        step={alertType.includes('percent') ? '0.1' : alertType === 'volume_above' ? '1000' : '0.01'}
                                        className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500/50 transition font-mono"
                                    />
                                    {selectedStock && !alertType.includes('percent') && alertType !== 'volume_above' && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            Current price: ${selectedStock.current_price?.toFixed(2)}
                                        </p>
                                    )}
                                </div>

                                {/* Alert Name (optional) */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                        Alert Name <span className="text-gray-600">(optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={alertName}
                                        onChange={(e) => setAlertName(e.target.value)}
                                        placeholder="e.g., My target entry price"
                                        className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[var(--color-accent)]/50 transition"
                                    />
                                </div>

                                {/* Notification Preferences */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                        Notifications
                                    </label>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setNotifyEmail(!notifyEmail)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition ${notifyEmail
                                                ? 'bg-[var(--color-accent-muted)] border-[var(--color-accent)]/30 text-[var(--color-accent)]'
                                                : 'bg-white/5 border-white/10 text-gray-500'
                                                }`}
                                        >
                                            <Mail size={16} />
                                            <span className="text-sm">Email</span>
                                            {notifyEmail && <Check size={14} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-white/5 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-5 py-2.5 text-gray-400 hover:text-white transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={!selectedStock || !thresholdValue || creating}
                                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl hover:from-amber-400 hover:to-orange-400 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {creating ? (
                                        <>
                                            <RefreshCw size={16} className="animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Bell size={16} />
                                            Create Alert
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
