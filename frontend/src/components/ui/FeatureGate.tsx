
'use client';

import React from 'react';
import { useSubscription, Tier } from '@/components/providers/SubscriptionProvider';
import { PRICING_TIERS } from '@/lib/pricing';
import Link from 'next/link';

interface FeatureGateProps {
    children: React.ReactNode;
    minTier: Tier;
    fallback?: React.ReactNode; // Custom fallback
    blur?: boolean; // If true, renders children with blur effect + CTA overlay
}

const TIER_LEVELS = {
    silver: 0,
    gold: 1,
    platinum: 2,
};

export default function FeatureGate({ children, minTier, fallback, blur }: FeatureGateProps) {
    const { tier, isLoading } = useSubscription();

    if (isLoading) return null; // Or skeleton?

    const currentLevel = TIER_LEVELS[tier] || 0;
    const requiredLevel = TIER_LEVELS[minTier];

    if (currentLevel >= requiredLevel) {
        return <>{children}</>;
    }

    const targetTierName = PRICING_TIERS[minTier.toUpperCase() as keyof typeof PRICING_TIERS]?.name || 'Premium';

    if (blur) {
        return (
            <div className="relative overflow-hidden">
                <div className="blur-sm pointer-events-none select-none opacity-50">
                    {children}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-base-100/30 z-10">
                    <div className="bg-base-100 p-6 rounded-xl shadow-lg border border-base-200 text-center max-w-sm">
                        <h3 className="font-bold text-lg mb-2">Upgrade to {targetTierName}</h3>
                        <p className="text-sm text-base-content/70 mb-4">
                            This feature is available exclusively to {targetTierName} members.
                        </p>
                        <Link href="/pricing" className="btn btn-primary btn-sm">
                            View Plans
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (fallback) return <>{fallback}</>;

    return null;
}
