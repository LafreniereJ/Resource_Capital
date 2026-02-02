import { NextRequest, NextResponse } from 'next/server';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

// In-memory rollout percentages (shared with parent route in production via database)
const rolloutOverrides: Map<string, number> = new Map();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { flagId, percentage } = body;

        if (!flagId || percentage === undefined) {
            return NextResponse.json(
                { error: 'Missing flagId or percentage' },
                { status: 400 }
            );
        }

        if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
            return NextResponse.json(
                { error: 'Percentage must be between 0 and 100' },
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

        rolloutOverrides.set(flagId, percentage);

        return NextResponse.json({
            success: true,
            flagId,
            percentage,
        });
    } catch (error) {
        console.error('Error updating rollout percentage:', error);
        return NextResponse.json(
            { error: 'Failed to update rollout' },
            { status: 500 }
        );
    }
}

export function getRolloutPercentage(flagId: string): number | undefined {
    return rolloutOverrides.get(flagId);
}
