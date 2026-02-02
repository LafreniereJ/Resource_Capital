'use client';

import React, { useState } from 'react';
import { PRICING_TIERS } from '@/lib/pricing';
import { CheckIcon, Loader2 } from 'lucide-react';

interface PricingClientProps {
  tiers: typeof PRICING_TIERS;
  currentTier: string;
  subscriptionStatus: string | null;
  isAuthenticated: boolean;
}

export default function PricingClient({
  tiers,
  currentTier,
  subscriptionStatus,
  isAuthenticated
}: PricingClientProps) {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleCheckout = async (priceId: string, tierId: string) => {
    if (!isAuthenticated) {
      window.location.href = '/login?next=/pricing';
      return;
    }

    if (tierId === 'silver') return;

    setLoadingTier(tierId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/pricing?success=true`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`,
        }),
      });

      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (error) {
      console.error('Checkout failed', error);
    } finally {
      setLoadingTier(null);
    }
  };

  const handlePortal = async () => {
    setLoadingTier('portal');
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-8">
      {Object.values(tiers).map((tier) => {
        const isCurrent = currentTier === tier.id;
        const isGold = tier.id === 'gold';

        return (
          <div
            key={tier.id}
            className={`relative group h-full rounded-2xl p-0.5 transition-all duration-500 hover:-translate-y-1 ${isCurrent
              ? 'bg-gradient-to-b from-[var(--color-accent)] to-[var(--color-gradient-mid)]'
              : 'bg-white/10 hover:bg-white/20'
              }`}
          >
            <div className="bg-[var(--color-bg-surface)]/95 backdrop-blur-xl rounded-[14px] p-8 h-full flex flex-col relative overflow-hidden">
              {/* Popular Badge */}
              {isGold && (
                <div className="absolute top-0 right-0">
                  <div className="bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-gradient-mid)] text-white text-[10px] font-black px-4 py-1 rounded-bl-xl tracking-widest uppercase">
                    Most Popular
                  </div>
                </div>
              )}

              {/* Icon / Metal Badge */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-lg ${isGold
                ? 'bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gradient-mid)] text-white'
                : 'bg-white/5 text-gray-400 border border-white/10'
                }`}>
                <span className="text-xl font-bold">
                  {tier.id === 'silver' ? '🥈' : tier.id === 'gold' ? '🥇' : '💎'}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">{tier.name}</h2>
              <p className="text-sm text-gray-500 mb-6 line-clamp-2">
                {'description' in tier ? tier.description : 'Essential market intelligence for minor and major miners.'}
              </p>

              <div className="flex items-baseline mb-8">
                <span className="text-4xl font-black text-white">${tier.cost}</span>
                {tier.cost > 0 && <span className="text-gray-500 ml-2 font-medium">/month</span>}
              </div>

              <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

              <ul className="space-y-4 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center border border-[var(--color-accent)]/30">
                      <CheckIcon size={10} className="text-[var(--color-accent)]" />
                    </div>
                    <span className="text-sm text-gray-300 font-medium leading-tight">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                {isCurrent && tier.cost > 0 ? (
                  <button
                    onClick={handlePortal}
                    disabled={loadingTier === 'portal'}
                    className="w-full py-3.5 px-6 rounded-xl text-sm font-bold bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    {loadingTier === 'portal' && <Loader2 className="animate-spin w-4 h-4" />}
                    Manage Subscription
                  </button>
                ) : isCurrent ? (
                  <div className="w-full py-3.5 px-6 rounded-xl text-sm font-bold bg-white/5 text-gray-500 border border-white/5 flex items-center justify-center italic">
                    Current Plan
                  </div>
                ) : (
                  tier.cost > 0 && 'priceId' in tier ? (
                    <button
                      onClick={() => handleCheckout(tier.priceId!, tier.id)}
                      disabled={!!loadingTier}
                      className={`w-full py-4 px-6 rounded-xl text-sm font-black transition-all duration-300 transform active:scale-[0.98] shadow-lg shadow-[var(--color-accent)]/10 flex items-center justify-center gap-2 ${isGold
                        ? 'bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-gradient-mid)] text-white hover:brightness-110'
                        : 'bg-white text-black hover:bg-gray-200 shadow-none'
                        }`}
                    >
                      {loadingTier === tier.id && <Loader2 className="animate-spin w-4 h-4" />}
                      Get Started with {tier.name}
                    </button>
                  ) : (
                    <button className="w-full py-3.5 px-6 rounded-xl text-sm font-bold bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 transition-all flex items-center justify-center">
                      Free Forever
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
