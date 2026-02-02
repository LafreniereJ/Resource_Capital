import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
    try {
        // In production, this would query the auth.users table via Supabase admin
        // For now, we'll return mock data or query user_preferences if it exists

        const users: Array<{
            id: string;
            email: string;
            created_at: string;
            last_sign_in: string | null;
            subscription_tier: 'free' | 'pro' | 'institutional';
            subscription_status: 'active' | 'canceled' | 'past_due' | null;
            api_calls_today: number;
            is_blocked: boolean;
        }> = [];

        // Try to get users from user_subscriptions if it exists
        try {
            const { data: subscriptions } = await supabase
                .from('user_subscriptions')
                .select('*');

            if (subscriptions) {
                for (const sub of subscriptions) {
                    users.push({
                        id: sub.user_id,
                        email: `user_${sub.user_id.slice(0, 8)}@example.com`,
                        created_at: sub.created_at,
                        last_sign_in: null,
                        subscription_tier: sub.tier || 'free',
                        subscription_status: sub.status || null,
                        api_calls_today: 0,
                        is_blocked: false,
                    });
                }
            }
        } catch {
            // Table might not exist yet
        }

        return NextResponse.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
}
