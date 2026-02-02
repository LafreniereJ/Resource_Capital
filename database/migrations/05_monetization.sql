-- =============================================================================
-- Sprint 4: Monetization Schema
-- =============================================================================

-- Create an enum for tiers to ensure data consistency
-- Note: Check if type exists first to avoid errors on re-run
DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM ('silver', 'gold', 'platinum');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Subscriptions table (Profile extension)
-- Linked 1:1 with auth.users
CREATE TABLE IF NOT EXISTS subscriptions (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    tier subscription_tier DEFAULT 'silver',
    status TEXT DEFAULT 'active', -- 'active', 'past_due', 'canceled', 'incomplete', 'trialing'
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can read their own subscription
CREATE POLICY "Users can view own subscription"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Service role (backend) can manage all
-- (By default, service role bypasses RLS, but explicit policy can be safer if using restricted keys)

-- Trigger to update updated_at
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup
-- Automatically creates a 'silver' subscription for every new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, tier, status)
  VALUES (new.id, 'silver', 'active');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on signup
-- Note: This trigger must be created on auth.users which usually requires superuser or doing it in the dashboard.
-- We will include it here for completeness, but it may need to be run manually in the dashboard SQL editor.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
