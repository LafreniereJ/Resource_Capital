/**
 * Supabase Browser Client
 * Use this in client components for auth operations
 * Returns null if Supabase is not configured (no env vars)
 */
import { createBrowserClient } from '@supabase/ssr'

let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Return null if Supabase is not configured
    if (!url || !key) {
        console.warn('Supabase not configured: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
        return null;
    }

    // Create singleton instance for performance
    if (!clientInstance) {
        clientInstance = createBrowserClient(url, key);
    }
    return clientInstance;
}
