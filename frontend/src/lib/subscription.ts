import { createClient } from './supabase-server';
import { PRICING_TIERS, SubscriptionTier, hasFeatureAccess, getFeatureLimit } from './stripe';

export interface UserSubscription {
  tier: SubscriptionTier;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

// Get current user's subscription (server-side)
export async function getUserSubscription(): Promise<UserSubscription | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!subscription) {
    return {
      tier: 'free',
      status: 'inactive',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  return {
    tier: (subscription.tier as SubscriptionTier) || 'free',
    status: subscription.status || 'inactive',
    stripeCustomerId: subscription.stripe_customer_id,
    stripeSubscriptionId: subscription.stripe_subscription_id,
    currentPeriodEnd: subscription.current_period_end
      ? new Date(subscription.current_period_end)
      : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
  };
}

// Check if user has access to a feature (server-side)
export async function checkFeatureAccess(
  requiredTier: SubscriptionTier
): Promise<boolean> {
  const subscription = await getUserSubscription();

  if (!subscription) {
    return requiredTier === 'free';
  }

  // Only active subscriptions have access to paid features
  if (subscription.status !== 'active' && requiredTier !== 'free') {
    return false;
  }

  return hasFeatureAccess(subscription.tier, requiredTier);
}

// Get user's limit for a feature (server-side)
export async function getUserFeatureLimit(
  feature: keyof (typeof PRICING_TIERS)['free']['limits']
): Promise<number> {
  const subscription = await getUserSubscription();
  const tier = subscription?.status === 'active' ? subscription.tier : 'free';
  return getFeatureLimit(tier, feature);
}

// Feature gating component wrapper
export function getUpgradeMessage(feature: string, requiredTier: SubscriptionTier): string {
  const tierName = PRICING_TIERS[requiredTier].name;
  const price = PRICING_TIERS[requiredTier].price;

  return `${feature} requires a ${tierName} subscription ($${price}/month). Upgrade to unlock this feature.`;
}

// Check remaining quota for a feature
export interface QuotaCheck {
  allowed: boolean;
  remaining: number;
  limit: number;
  message?: string;
}

export async function checkQuota(
  feature: keyof (typeof PRICING_TIERS)['free']['limits'],
  currentUsage: number
): Promise<QuotaCheck> {
  const limit = await getUserFeatureLimit(feature);

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      remaining: Infinity,
      limit: -1,
    };
  }

  // 0 means not available
  if (limit === 0) {
    return {
      allowed: false,
      remaining: 0,
      limit: 0,
      message: `This feature is not available on your current plan. Upgrade to Pro to access it.`,
    };
  }

  const remaining = Math.max(0, limit - currentUsage);
  return {
    allowed: remaining > 0,
    remaining,
    limit,
    message: remaining === 0
      ? `You've reached your limit of ${limit}. Upgrade to increase your limit.`
      : undefined,
  };
}
