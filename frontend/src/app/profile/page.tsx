'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase-client'

interface UserProfile {
    id: string
    email: string
    full_name: string | null
    company: string | null
    job_title: string | null
    phone: string | null
    avatar_url: string | null
    created_at: string
    email_confirmed_at: string | null
}

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()
    const supabase = createClient()

    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Form fields
    const [fullName, setFullName] = useState('')
    const [company, setCompany] = useState('')
    const [jobTitle, setJobTitle] = useState('')
    const [phone, setPhone] = useState('')

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login?redirect=/profile')
        }
    }, [user, authLoading, router])

    useEffect(() => {
        if (user) {
            loadProfile()
        }
    }, [user])

    const loadProfile = async () => {
        if (!user || !supabase) return

        // Get user metadata from Supabase auth
        const profileData: UserProfile = {
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || null,
            company: user.user_metadata?.company || null,
            job_title: user.user_metadata?.job_title || null,
            phone: user.user_metadata?.phone || null,
            avatar_url: user.user_metadata?.avatar_url || null,
            created_at: user.created_at,
            email_confirmed_at: user.email_confirmed_at || null,
        }

        setProfile(profileData)
        setFullName(profileData.full_name || '')
        setCompany(profileData.company || '')
        setJobTitle(profileData.job_title || '')
        setPhone(profileData.phone || '')
    }

    const handleSave = async () => {
        if (!supabase) return

        setSaving(true)
        setError(null)
        setSuccess(null)

        const { error } = await supabase.auth.updateUser({
            data: {
                full_name: fullName || null,
                company: company || null,
                job_title: jobTitle || null,
                phone: phone || null,
            }
        })

        if (error) {
            setError(error.message)
        } else {
            setSuccess('Profile updated successfully')
            setEditing(false)
            loadProfile()
        }

        setSaving(false)
    }

    const handleCancel = () => {
        if (profile) {
            setFullName(profile.full_name || '')
            setCompany(profile.company || '')
            setJobTitle(profile.job_title || '')
            setPhone(profile.phone || '')
        }
        setEditing(false)
        setError(null)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    if (authLoading) {
        return (
            <main className="min-h-screen pt-20 px-4 md:px-8 pb-12">
                <div className="max-w-4xl mx-auto">
                    <div className="animate-pulse">
                        <div className="h-8 bg-neutral-800 rounded w-48 mb-4"></div>
                        <div className="h-4 bg-neutral-800 rounded w-64 mb-8"></div>
                        <div className="glass-card p-6">
                            <div className="h-24 bg-neutral-800 rounded mb-4"></div>
                            <div className="h-12 bg-neutral-800 rounded mb-4"></div>
                            <div className="h-12 bg-neutral-800 rounded"></div>
                        </div>
                    </div>
                </div>
            </main>
        )
    }

    if (!user) {
        return null
    }

    return (
        <main className="min-h-screen pt-20 px-4 md:px-8 pb-12">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2 text-white">My Profile</h1>
                    <p className="text-[var(--color-text-secondary)]">
                        Manage your account information and preferences
                    </p>
                </div>

                {/* Status Messages */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        {success}
                    </div>
                )}

                {/* Profile Card */}
                <section className="glass-card p-6 mb-6">
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-secondary)] flex items-center justify-center text-white text-2xl font-bold">
                                {profile?.full_name
                                    ? profile.full_name.charAt(0).toUpperCase()
                                    : profile?.email?.charAt(0).toUpperCase() || '?'
                                }
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-white">
                                    {profile?.full_name || 'No name set'}
                                </h2>
                                <p className="text-[var(--color-text-secondary)]">
                                    {profile?.email}
                                </p>
                                {profile?.email_confirmed_at ? (
                                    <span className="inline-flex items-center gap-1 mt-1 text-xs text-emerald-400">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Email verified
                                    </span>
                                ) : (
                                    <Link
                                        href="/verify-email"
                                        className="inline-flex items-center gap-1 mt-1 text-xs text-amber-400 hover:text-amber-300"
                                    >
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        Verify email
                                    </Link>
                                )}
                            </div>
                        </div>

                        {!editing && (
                            <button
                                onClick={() => setEditing(true)}
                                className="btn-secondary text-sm"
                            >
                                Edit Profile
                            </button>
                        )}
                    </div>

                    {/* Profile Info / Edit Form */}
                    {editing ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-4 py-3 bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] transition-all"
                                    placeholder="Your full name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                                    Company
                                </label>
                                <input
                                    type="text"
                                    value={company}
                                    onChange={(e) => setCompany(e.target.value)}
                                    className="w-full px-4 py-3 bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] transition-all"
                                    placeholder="Your company name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                                    Job Title
                                </label>
                                <input
                                    type="text"
                                    value={jobTitle}
                                    onChange={(e) => setJobTitle(e.target.value)}
                                    className="w-full px-4 py-3 bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] transition-all"
                                    placeholder="Your job title"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full px-4 py-3 bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] transition-all"
                                    placeholder="+1 (555) 123-4567"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="btn-primary"
                                >
                                    {saving ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Saving...
                                        </span>
                                    ) : 'Save Changes'}
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={saving}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-[var(--color-bg-surface)]">
                                <p className="text-xs text-[var(--color-text-muted)] mb-1">Company</p>
                                <p className="text-white">{profile?.company || 'Not specified'}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--color-bg-surface)]">
                                <p className="text-xs text-[var(--color-text-muted)] mb-1">Job Title</p>
                                <p className="text-white">{profile?.job_title || 'Not specified'}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--color-bg-surface)]">
                                <p className="text-xs text-[var(--color-text-muted)] mb-1">Phone</p>
                                <p className="text-white">{profile?.phone || 'Not specified'}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--color-bg-surface)]">
                                <p className="text-xs text-[var(--color-text-muted)] mb-1">Member Since</p>
                                <p className="text-white">{profile?.created_at ? formatDate(profile.created_at) : '-'}</p>
                            </div>
                        </div>
                    )}
                </section>

                {/* Account Section */}
                <section className="glass-card p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-white">Account</h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-bg-surface)]">
                            <div>
                                <p className="font-medium text-white">Email Address</p>
                                <p className="text-sm text-[var(--color-text-secondary)]">{profile?.email}</p>
                            </div>
                            <span className="text-xs text-[var(--color-text-muted)]">Cannot be changed</span>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-bg-surface)]">
                            <div>
                                <p className="font-medium text-white">Password</p>
                                <p className="text-sm text-[var(--color-text-secondary)]">••••••••</p>
                            </div>
                            <Link href="/update-password" className="text-[var(--color-accent)] hover:underline text-sm">
                                Change Password
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Quick Links */}
                <section className="glass-card p-6">
                    <h2 className="text-xl font-semibold mb-4 text-white">Quick Links</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Link
                            href="/settings"
                            className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] transition-colors group"
                        >
                            <div className="w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 flex items-center justify-center">
                                <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-medium text-white group-hover:text-[var(--color-accent)] transition-colors">Settings</p>
                                <p className="text-sm text-[var(--color-text-muted)]">Customize your experience</p>
                            </div>
                        </Link>

                        <Link
                            href="/watchlist"
                            className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] transition-colors group"
                        >
                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-medium text-white group-hover:text-amber-400 transition-colors">Watchlist</p>
                                <p className="text-sm text-[var(--color-text-muted)]">Track your favorites</p>
                            </div>
                        </Link>

                        <Link
                            href="/compare"
                            className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] transition-colors group"
                        >
                            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-medium text-white group-hover:text-cyan-400 transition-colors">Compare</p>
                                <p className="text-sm text-[var(--color-text-muted)]">Analyze companies side by side</p>
                            </div>
                        </Link>

                        <Link
                            href="/reports"
                            className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] transition-colors group"
                        >
                            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-medium text-white group-hover:text-purple-400 transition-colors">Reports</p>
                                <p className="text-sm text-[var(--color-text-muted)]">Research & analysis</p>
                            </div>
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    )
}
