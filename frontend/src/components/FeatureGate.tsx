'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { LockClosedIcon } from '@heroicons/react/24/solid';
import { PRICING_TIERS, SubscriptionTier, hasFeatureAccess } from '@/lib/stripe';

interface FeatureGateProps {
  children: ReactNode;
  requiredTier: SubscriptionTier;
  currentTier: SubscriptionTier;
  featureName?: string;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

export function FeatureGate({
  children,
  requiredTier,
  currentTier,
  featureName,
  fallback,
  showUpgradePrompt = true,
}: FeatureGateProps) {
  const hasAccess = hasFeatureAccess(currentTier, requiredTier);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  const tierInfo = PRICING_TIERS[requiredTier];

  return (
    <div className="relative">
      {/* Blurred/locked content preview */}
      <div className="filter blur-sm opacity-50 pointer-events-none select-none">
        {children}
      </div>

      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-lg">
        <div className="text-center p-6 max-w-sm">
          <LockClosedIcon className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {featureName ? `${featureName} - ` : ''}
            {tierInfo.name} Feature
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Upgrade to {tierInfo.name} (${tierInfo.price}/month) to access this feature.
          </p>
          <Link
            href="/pricing"
            className="inline-block px-6 py-2 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400 transition-colors"
          >
            View Plans
          </Link>
        </div>
      </div>
    </div>
  );
}

// Simple badge to indicate feature tier requirement
interface TierBadgeProps {
  tier: SubscriptionTier;
  size?: 'sm' | 'md';
}

export function TierBadge({ tier, size = 'sm' }: TierBadgeProps) {
  if (tier === 'free') return null;

  const colors = {
    pro: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    institutional: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span
      className={`inline-flex items-center ${sizeClasses} rounded-full border ${colors[tier]}`}
    >
      {tier === 'pro' ? 'Pro' : 'Institutional'}
    </span>
  );
}

// Upgrade CTA banner
interface UpgradeBannerProps {
  currentTier: SubscriptionTier;
  feature?: string;
  variant?: 'inline' | 'banner';
}

export function UpgradeBanner({
  currentTier,
  feature,
  variant = 'banner',
}: UpgradeBannerProps) {
  if (currentTier !== 'free') return null;

  if (variant === 'inline') {
    return (
      <div className="inline-flex items-center gap-2 text-sm">
        <span className="text-gray-400">
          {feature ? `${feature} requires Pro.` : 'Upgrade for more features.'}
        </span>
        <Link
          href="/pricing"
          className="text-amber-400 hover:text-amber-300 font-medium"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/30 rounded-lg p-4 flex items-center justify-between">
      <div>
        <h4 className="font-semibold text-white">Unlock Pro Features</h4>
        <p className="text-sm text-gray-400">
          Get real-time data, unlimited alerts, and API access.
        </p>
      </div>
      <Link
        href="/pricing"
        className="px-4 py-2 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400 transition-colors whitespace-nowrap"
      >
        Upgrade to Pro
      </Link>
    </div>
  );
}

// Usage limit indicator
interface UsageLimitProps {
  current: number;
  limit: number;
  label: string;
  showUpgrade?: boolean;
}

export function UsageLimit({
  current,
  limit,
  label,
  showUpgrade = true,
}: UsageLimitProps) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min(100, (current / limit) * 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className={isAtLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-gray-300'}>
          {isUnlimited ? (
            'Unlimited'
          ) : (
            <>
              {current} / {limit}
            </>
          )}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              isAtLimit
                ? 'bg-red-500'
                : isNearLimit
                ? 'bg-amber-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
      {isAtLimit && showUpgrade && (
        <div className="text-sm text-amber-400">
          <Link href="/pricing" className="hover:underline">
            Upgrade to increase your limit
          </Link>
        </div>
      )}
    </div>
  );
}
