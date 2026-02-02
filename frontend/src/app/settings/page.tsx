'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import { themes, type ThemeName } from '@/lib/themes';
import { useAuth } from '@/components/AuthProvider';
import { useSubscription } from '@/components/providers/SubscriptionProvider';
import { PRICING_TIERS } from '@/lib/pricing';

function ManageSubscriptionButton() {
    const [loading, setLoading] = useState(false);

    const handlePortal = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/stripe/portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ returnUrl: window.location.href }),
            });
            const { url } = await res.json();
            if (url) window.location.href = url;
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handlePortal}
            disabled={loading}
            className="btn btn-outline btn-sm"
        >
            {loading && <span className="loading loading-spinner loading-xs"></span>}
            Manage Subscription
        </button>
    );
}

type Currency = 'USD' | 'CAD' | 'AUD';
type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
type PriceDisplay = 'change' | 'percent' | 'both';

interface Preferences {
    currency: Currency;
    dateFormat: DateFormat;
    priceDisplay: PriceDisplay;
    emailAlerts: boolean;
    priceAlerts: boolean;
    newsDigest: boolean;
    weeklyReport: boolean;
}

const defaultPreferences: Preferences = {
    currency: 'CAD',
    dateFormat: 'YYYY-MM-DD',
    priceDisplay: 'both',
    emailAlerts: true,
    priceAlerts: false,
    newsDigest: true,
    weeklyReport: false,
};

export default function SettingsPage() {
    const { themeName, setTheme, availableThemes } = useTheme();
    const { user, loading: authLoading } = useAuth();
    const { tier, status } = useSubscription();
    const router = useRouter();

    const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Load preferences from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('rc_preferences');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setPreferences({ ...defaultPreferences, ...parsed });
            } catch {
                // Use defaults
            }
        }
    }, []);

    // Save preferences to localStorage
    const savePreferences = (newPrefs: Preferences) => {
        setPreferences(newPrefs);
        localStorage.setItem('rc_preferences', JSON.stringify(newPrefs));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const updatePreference = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
        const newPrefs = { ...preferences, [key]: value };
        savePreferences(newPrefs);
    };

    return (
        <main className="min-h-screen pt-20 px-4 md:px-8 pb-12">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2 text-white">Settings</h1>
                        <p className="text-[var(--color-text-secondary)]">
                            Customize your Resource Capital experience
                        </p>
                    </div>
                    {saved && (
                        <span className="text-sm text-emerald-400 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Saved
                        </span>
                    )}
                </div>

                {/* Subscription Section */}
                <section className="glass-card p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-white">Subscription</h2>
                        {/* @ts-ignore */}
                        <span className={`badge ${PRICING_TIERS[tier?.toUpperCase()]?.badgeColor || 'badge-ghost'} font-bold`}>
                            {/* @ts-ignore */}
                            {PRICING_TIERS[tier?.toUpperCase()]?.name || 'Loading...'}
                        </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--color-bg-surface)] p-4 rounded-xl border border-[var(--color-border)]">
                        <div>
                            <p className="text-sm text-[var(--color-text-secondary)] mb-1">Current Plan</p>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-white uppercase">{tier}</span>
                                {status === 'active' && <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">Active</span>}
                                {status === 'canceled' && <span className="text-xs text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full">Canceled</span>}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            {tier === 'silver' ? (
                                <Link href="/pricing" className="btn btn-primary btn-sm">
                                    Upgrade Plan
                                </Link>
                            ) : (
                                <ManageSubscriptionButton />
                            )}
                        </div>
                    </div>
                </section>

                {/* Theme Section */}
                <section className="glass-card p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-white">Accent Color</h2>
                    <p className="mb-6 text-[var(--color-text-secondary)]">
                        Choose an accent color for buttons, links, and highlights
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {(Object.keys(availableThemes) as ThemeName[]).map((name) => {
                            const theme = themes[name];
                            const isSelected = themeName === name;

                            return (
                                <button
                                    key={name}
                                    onClick={() => setTheme(name)}
                                    className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${isSelected
                                        ? 'border-white/30 bg-white/5'
                                        : 'border-transparent hover:border-white/10 hover:bg-white/[0.02]'
                                        }`}
                                >
                                    {/* Accent color swatch (solid) */}
                                    <div
                                        className="w-10 h-10 rounded-full mb-3"
                                        style={{
                                            background: theme.accent,
                                            boxShadow: isSelected ? `0 0 20px ${theme.accentMuted}` : 'none'
                                        }}
                                    />

                                    {/* Theme Info */}
                                    <h3 className="font-semibold text-white mb-0.5">
                                        {theme.label}
                                    </h3>
                                    <p className="text-xs text-[var(--color-text-muted)]">
                                        {theme.description}
                                    </p>

                                    {/* Selected indicator */}
                                    {isSelected && (
                                        <div
                                            className="absolute top-2 right-2 w-2 h-2 rounded-full"
                                            style={{ background: theme.accent }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Preview */}
                    <div className="mt-6 p-4 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
                        <p className="text-sm text-[var(--color-text-secondary)] mb-3">Preview</p>
                        <div className="flex flex-wrap gap-3 items-center">
                            <button className="btn-primary text-sm">Primary Button</button>
                            <button className="btn-secondary text-sm">Secondary</button>
                            <span className="text-accent font-medium">Accent Link</span>
                        </div>
                    </div>
                </section>

                {/* Display Preferences */}
                <section className="glass-card p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-white">Display Preferences</h2>

                    <div className="space-y-6">
                        {/* Currency */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                                Default Currency
                            </label>
                            <div className="flex gap-3">
                                {(['CAD', 'USD', 'AUD'] as Currency[]).map((currency) => (
                                    <button
                                        key={currency}
                                        onClick={() => updatePreference('currency', currency)}
                                        className={`px-4 py-2 rounded-lg border transition-all ${preferences.currency === currency
                                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                                            : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]'
                                            }`}
                                    >
                                        {currency}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date Format */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                                Date Format
                            </label>
                            <select
                                value={preferences.dateFormat}
                                onChange={(e) => updatePreference('dateFormat', e.target.value as DateFormat)}
                                className="px-4 py-2.5 bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50"
                            >
                                <option value="YYYY-MM-DD">2026-01-20 (ISO)</option>
                                <option value="MM/DD/YYYY">01/20/2026 (US)</option>
                                <option value="DD/MM/YYYY">20/01/2026 (EU)</option>
                            </select>
                        </div>

                        {/* Price Display */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                                Price Change Display
                            </label>
                            <div className="flex flex-wrap gap-3">
                                {([
                                    { value: 'change', label: '$0.15' },
                                    { value: 'percent', label: '+2.5%' },
                                    { value: 'both', label: '$0.15 (+2.5%)' },
                                ] as { value: PriceDisplay; label: string }[]).map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => updatePreference('priceDisplay', option.value)}
                                        className={`px-4 py-2 rounded-lg border transition-all ${preferences.priceDisplay === option.value
                                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                                            : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Notification Preferences */}
                <section className="glass-card p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-white">Notifications</h2>
                    <p className="mb-6 text-[var(--color-text-secondary)]">
                        Configure how you receive updates and alerts
                    </p>

                    <div className="space-y-4">
                        {[
                            { key: 'emailAlerts' as const, label: 'Email Alerts', desc: 'Receive important account notifications via email' },
                            { key: 'priceAlerts' as const, label: 'Price Alerts', desc: 'Get notified when stocks hit your target prices' },
                            { key: 'newsDigest' as const, label: 'Daily News Digest', desc: 'Receive a daily summary of mining news' },
                            { key: 'weeklyReport' as const, label: 'Weekly Report', desc: 'Get a weekly summary of market activity' },
                        ].map((item) => (
                            <div
                                key={item.key}
                                className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-bg-surface)]"
                            >
                                <div>
                                    <p className="font-medium text-white">{item.label}</p>
                                    <p className="text-sm text-[var(--color-text-muted)]">{item.desc}</p>
                                </div>
                                <button
                                    onClick={() => updatePreference(item.key, !preferences[item.key])}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${preferences[item.key]
                                        ? 'bg-[var(--color-accent)]'
                                        : 'bg-neutral-700'
                                        }`}
                                >
                                    <span
                                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${preferences[item.key] ? 'left-7' : 'left-1'
                                            }`}
                                    />
                                </button>
                            </div>
                        ))}
                    </div>

                    {!user && (
                        <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <p className="text-amber-400 text-sm">
                                <Link href="/login" className="underline hover:no-underline">Sign in</Link> to enable email notifications
                            </p>
                        </div>
                    )}
                </section>

                {/* Account Links */}
                {user && (
                    <section className="glass-card p-6">
                        <h2 className="text-xl font-semibold mb-4 text-white">Account</h2>
                        <div className="space-y-3">
                            <Link
                                href="/profile"
                                className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span className="text-white group-hover:text-[var(--color-accent)] transition-colors">Edit Profile</span>
                                </div>
                                <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                            <Link
                                href="/update-password"
                                className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                    </svg>
                                    <span className="text-white group-hover:text-[var(--color-accent)] transition-colors">Change Password</span>
                                </div>
                                <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}
