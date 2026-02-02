'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-client'

interface AuthContextType {
    user: User | null
    session: Session | null
    loading: boolean
    isConfigured: boolean
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>
    signUp: (email: string, password: string) => Promise<{ error: Error | null }>
    signInWithGoogle: () => Promise<{ error: Error | null }>
    signOut: () => Promise<void>
    resetPassword: (email: string) => Promise<{ error: Error | null }>
    updatePassword: (password: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()
    const isConfigured = supabase !== null

    useEffect(() => {
        // If Supabase is not configured, skip auth setup
        if (!supabase) {
            setLoading(false)
            return
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUser(session?.user ?? null)
            setLoading(false)
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session)
                setUser(session?.user ?? null)
                setLoading(false)
            }
        )

        return () => subscription.unsubscribe()
    }, [supabase])

    const signIn = async (email: string, password: string) => {
        if (!supabase) {
            return { error: new Error('Supabase not configured') }
        }
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        return { error }
    }

    const signUp = async (email: string, password: string) => {
        if (!supabase) {
            return { error: new Error('Supabase not configured') }
        }
        const { error } = await supabase.auth.signUp({
            email,
            password,
        })
        return { error }
    }

    const signInWithGoogle = async () => {
        if (!supabase) {
            return { error: new Error('Supabase not configured') }
        }
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
        return { error }
    }

    const signOut = async () => {
        if (!supabase) return
        await supabase.auth.signOut()
    }

    const resetPassword = async (email: string) => {
        if (!supabase) {
            return { error: new Error('Supabase not configured') }
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/update-password`,
        })
        return { error }
    }

    const updatePassword = async (password: string) => {
        if (!supabase) {
            return { error: new Error('Supabase not configured') }
        }
        const { error } = await supabase.auth.updateUser({ password })
        return { error }
    }

    return (
        <AuthContext.Provider value={{
            user,
            session,
            loading,
            isConfigured,
            signIn,
            signUp,
            signInWithGoogle,
            signOut,
            resetPassword,
            updatePassword
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
