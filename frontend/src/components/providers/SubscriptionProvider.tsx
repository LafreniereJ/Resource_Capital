
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { PRICING_TIERS } from '@/lib/pricing';
import { createBrowserClient } from '@supabase/ssr';

export type Tier = 'silver' | 'gold' | 'platinum';

interface SubscriptionState {
    tier: Tier;
    status: string;
    isLoading: boolean;
    checkAccess: (feature: string) => boolean;
}

const SubscriptionContext = createContext<SubscriptionState>({
    tier: 'silver',
    status: 'inactive',
    isLoading: true,
    checkAccess: () => false,
});

export function SubscriptionProvider({
    initialSubscription,
    children,
}: {
    initialSubscription?: any;
    children: React.ReactNode;
}) {
    const [tier, setTier] = useState<Tier>(initialSubscription?.tier || 'silver');
    const [status, setStatus] = useState<string>(initialSubscription?.status || 'inactive');
    const [isLoading, setIsLoading] = useState(!initialSubscription);

    useEffect(() => {
        if (initialSubscription) return;

        const fetchSubscription = async () => {
            const supabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { data } = await supabase
                    .from('subscriptions')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (data) {
                    setTier(data.tier as Tier);
                    setStatus(data.status);
                }
            }
            setIsLoading(false);
        };

        fetchSubscription();
    }, [initialSubscription]);

    const checkAccess = (feature: string) => {
        // Logic to check access based on tier features
        // For now, simpler check:
        if (tier === 'platinum') return true;
        if (tier === 'gold') {
            if (PRICING_TIERS.GOLD.features.some(f => f.includes(feature))) return true;
            // Check if feature is NOT in Platinum exclusve
        }
        // TODO: robust feature mapping
        return true;
    };

    return (
        <SubscriptionContext.Provider value={{ tier, status, isLoading, checkAccess }}>
            {children}
        </SubscriptionContext.Provider>
    );
}

export const useSubscription = () => useContext(SubscriptionContext);
