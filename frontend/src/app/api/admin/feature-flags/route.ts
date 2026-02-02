import { NextRequest, NextResponse } from 'next/server';
import {
    getAllFlags,
    setFlagOverride,
    clearFlagOverride,
    FEATURE_FLAGS,
} from '@/lib/feature-flags';

// In-memory rollout percentages (in production, store in database)
const rolloutOverrides: Map<string, number> = new Map();

export async function GET() {
    try {
        const flags = getAllFlags().map(flag => ({
            ...flag,
            rolloutPercentage: rolloutOverrides.get(flag.id) ?? flag.rolloutPercentage,
        }));

        return NextResponse.json({ flags });
    } catch (error) {
        console.error('Error fetching feature flags:', error);
        return NextResponse.json(
            { error: 'Failed to fetch feature flags' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { flagId, enabled } = body;

        if (!flagId || enabled === undefined) {
            return NextResponse.json(
                { error: 'Missing flagId or enabled' },
                { status: 400 }
            );
        }

        // Verify flag exists
        const flag = Object.values(FEATURE_FLAGS).find(f => f.id === flagId);
        if (!flag) {
            return NextResponse.json(
                { error: 'Unknown feature flag' },
                { status: 404 }
            );
        }

        setFlagOverride(flagId, enabled);

        return NextResponse.json({
            success: true,
            flagId,
            enabled,
        });
    } catch (error) {
        console.error('Error updating feature flag:', error);
        return NextResponse.json(
            { error: 'Failed to update feature flag' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const { flagId } = body;

        if (!flagId) {
            return NextResponse.json(
                { error: 'Missing flagId' },
                { status: 400 }
            );
        }

        clearFlagOverride(flagId);

        return NextResponse.json({
            success: true,
            flagId,
        });
    } catch (error) {
        console.error('Error clearing feature flag override:', error);
        return NextResponse.json(
            { error: 'Failed to clear override' },
            { status: 500 }
        );
    }
}
