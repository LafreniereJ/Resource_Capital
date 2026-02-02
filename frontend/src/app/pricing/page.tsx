import { createClient } from '@/lib/supabase-server';
import { PRICING_TIERS } from '@/lib/pricing';
import PricingClient from './PricingClient';
import { generatePageMetadata } from '@/lib/metadata';
import { BackgroundEffects } from '@/components/ui/BackgroundEffects';

export const metadata = generatePageMetadata({
  title: 'Pricing',
  description: 'Choose the plan that fits your investment research needs. Free, Pro, and Institutional tiers available.',
  path: '/pricing',
});

export default async function PricingPage() {
  // Get current user and subscription
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let currentTier = 'free';
  let subscriptionStatus = null;

  if (user) {
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('tier, status')
      .eq('user_id', user.id)
      .single();

    if (subscription) {
      currentTier = subscription.tier || 'free';
      subscriptionStatus = subscription.status;
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] py-12 px-4 selection:bg-[var(--color-accent-muted)]">
      <BackgroundEffects />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Choose the plan that fits your investment research needs.
            Upgrade anytime as your requirements grow.
          </p>
        </div>

        {/* Pricing Cards */}
        <PricingClient
          tiers={PRICING_TIERS}
          currentTier={currentTier}
          subscriptionStatus={subscriptionStatus}
          isAuthenticated={!!user}
        />

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <FaqItem
              question="Can I cancel anytime?"
              answer="Yes, you can cancel your subscription at any time. You'll continue to have access to your current plan until the end of your billing period."
            />
            <FaqItem
              question="What payment methods do you accept?"
              answer="We accept all major credit cards (Visa, Mastercard, American Express) through our secure payment partner Stripe."
            />
            <FaqItem
              question="Is there a free trial?"
              answer="While we don't offer a free trial, the Free tier gives you access to core features. You can upgrade to Pro or Institutional anytime to unlock advanced capabilities."
            />
            <FaqItem
              question="What happens to my data if I downgrade?"
              answer="Your data is preserved when you downgrade. However, you may lose access to certain features and historical data beyond your new tier's limits."
            />
            <FaqItem
              question="Do you offer team or enterprise pricing?"
              answer="Our Institutional plan is designed for teams and organizations. For custom enterprise needs, please contact us at support@resourcecapital.com."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-[var(--color-bg-surface)]/50 border border-white/5 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-2">{question}</h3>
      <p className="text-gray-400">{answer}</p>
    </div>
  );
}
