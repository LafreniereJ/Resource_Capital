'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase-client'

export default function VerifyEmailPage() {
    const { user, signOut } = useAuth()
    const [resending, setResending] = useState(false)
    const [resent, setResent] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    // Check if user is already verified
    const isVerified = user?.email_confirmed_at != null

    // Auto-redirect if verified
    useEffect(() => {
        if (isVerified) {
            window.location.href = '/'
        }
    }, [isVerified])

    const handleResendEmail = async () => {
        if (!user?.email || !supabase) return

        setResending(true)
        setError(null)

        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: user.email,
        })

        if (error) {
            setError(error.message)
        } else {
            setResent(true)
        }
        setResending(false)
    }

    const handleSignOut = async () => {
        await signOut()
        window.location.href = '/login'
    }

    if (isVerified) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 px-4">
                <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold text-white">Resource Capital</span>
                    </Link>
                </div>

                {/* Card */}
                <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 rounded-2xl p-8 shadow-2xl">
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-2 text-center">Verify your email</h1>
                    <p className="text-neutral-400 mb-6 text-center">
                        We sent a verification link to{' '}
                        <span className="text-white font-medium">{user?.email}</span>
                    </p>

                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {resent && (
                        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm text-center">
                            Verification email sent! Check your inbox.
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="p-4 bg-neutral-800/50 rounded-xl">
                            <h3 className="font-medium text-white mb-2">Next steps:</h3>
                            <ol className="text-sm text-neutral-400 space-y-2">
                                <li className="flex items-start gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                                    Check your email inbox
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                                    Click the verification link
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                                    Return here to access your account
                                </li>
                            </ol>
                        </div>

                        <button
                            onClick={handleResendEmail}
                            disabled={resending || resent}
                            className="w-full py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {resending ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Sending...
                                </span>
                            ) : resent ? (
                                'Email sent!'
                            ) : (
                                'Resend verification email'
                            )}
                        </button>

                        <p className="text-center text-neutral-500 text-sm">
                            Didn&apos;t receive the email? Check your spam folder.
                        </p>

                        <div className="pt-4 border-t border-neutral-800">
                            <button
                                onClick={handleSignOut}
                                className="w-full py-2 text-neutral-400 hover:text-white font-medium transition-colors text-sm"
                            >
                                Sign out and use a different email
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center mt-8 text-neutral-500 text-sm">
                    © 2026 Resource Capital. All rights reserved.
                </p>
            </div>
        </div>
    )
}
