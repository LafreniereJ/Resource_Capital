import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { getAbuseStats } from '@/lib/abuse-detection';
import { getUsageStats } from '@/lib/rate-limit';

// Simple in-memory error store (in production, use a proper logging service)
const recentErrors: Array<{
    id: string;
    timestamp: string;
    type: string;
    message: string;
    endpoint?: string;
}> = [];

export function logError(type: string, message: string, endpoint?: string) {
    recentErrors.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toISOString(),
        type,
        message,
        endpoint,
    });
    // Keep only last 100 errors
    if (recentErrors.length > 100) {
        recentErrors.pop();
    }
}

export async function GET() {
    try {
        // Fetch data counts from Supabase
        const [
            companiesResult,
            projectsResult,
            newsResult,
            pricesResult,
        ] = await Promise.all([
            supabase.from('companies').select('id', { count: 'exact', head: true }),
            supabase.from('projects').select('id', { count: 'exact', head: true }),
            supabase.from('news').select('id', { count: 'exact', head: true }),
            supabase.from('companies').select('id', { count: 'exact', head: true }).not('current_price', 'is', null),
        ]);

        // Get last update times
        const { data: lastCompanyUpdate } = await supabase
            .from('companies')
            .select('last_updated')
            .order('last_updated', { ascending: false })
            .limit(1)
            .single();

        const { data: lastNewsUpdate } = await supabase
            .from('news')
            .select('fetched_at')
            .order('fetched_at', { ascending: false })
            .limit(1)
            .single();

        // Get abuse stats from the in-memory store
        const abuseStats = getAbuseStats();
        const usageStats = getUsageStats();

        // Format last update times
        const formatTimeAgo = (dateStr: string | null): string | null => {
            if (!dateStr) return null;
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours}h ago`;
            return date.toLocaleDateString();
        };

        // Simulated user stats (in production, query your auth/user tables)
        // These would come from Supabase auth or a users table
        const userStats = {
            total: 0,
            newToday: 0,
            newThisWeek: 0,
            activeToday: 0,
        };

        // Try to get actual user count if auth tables are accessible
        try {
            const { count } = await supabase
                .from('user_preferences')
                .select('*', { count: 'exact', head: true });
            if (count !== null) {
                userStats.total = count;
            }
        } catch {
            // user_preferences table might not exist yet
        }

        const stats = {
            users: userStats,
            subscriptions: {
                free: userStats.total, // All users are free until Stripe is set up
                pro: 0,
                institutional: 0,
                totalMRR: 0,
            },
            system: {
                cpuUsage: Math.floor(Math.random() * 30 + 10), // Simulated - would come from monitoring service
                memoryUsage: Math.floor(Math.random() * 40 + 20),
                dbConnections: Math.floor(Math.random() * 20 + 5),
                lastPriceUpdate: formatTimeAgo(lastCompanyUpdate?.last_updated),
                lastNewsUpdate: formatTimeAgo(lastNewsUpdate?.fetched_at),
            },
            abuse: {
                totalTracked: abuseStats.totalTracked,
                currentlyBlocked: abuseStats.currentlyBlocked,
                recentViolations: abuseStats.recentViolations,
            },
            data: {
                totalCompanies: companiesResult.count || 0,
                totalProjects: projectsResult.count || 0,
                totalNews: newsResult.count || 0,
                companiesWithPrices: pricesResult.count || 0,
            },
            usage: usageStats,
        };

        return NextResponse.json({
            stats,
            recentErrors: recentErrors.slice(0, 10),
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard data' },
            { status: 500 }
        );
    }
}
