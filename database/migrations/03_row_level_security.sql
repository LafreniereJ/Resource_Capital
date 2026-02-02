-- =============================================================================
-- Row-Level Security (RLS) Policies for Resource Capital
-- =============================================================================
-- This migration enables RLS on all tables with appropriate policies.
-- Run this in Supabase SQL Editor after auth is set up.
-- =============================================================================

-- =============================================================================
-- USER-SPECIFIC TABLES (Require authentication)
-- =============================================================================

-- User preferences table (stores user settings)
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    currency TEXT DEFAULT 'CAD',
    date_format TEXT DEFAULT 'MMM DD, YYYY',
    notifications_enabled BOOLEAN DEFAULT true,
    email_digest TEXT DEFAULT 'weekly' CHECK (email_digest IN ('none', 'daily', 'weekly', 'monthly')),
    theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'system')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);

-- User watchlist table (replaces localStorage)
CREATE TABLE IF NOT EXISTS user_watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('company', 'project')),
    item_id INTEGER NOT NULL, -- company.id or project.id
    ticker TEXT, -- For quick display
    name TEXT, -- For quick display
    commodity TEXT,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, item_type, item_id)
);

CREATE INDEX idx_user_watchlist_user ON user_watchlist(user_id);
CREATE INDEX idx_user_watchlist_item ON user_watchlist(item_type, item_id);

-- User recently viewed table
CREATE TABLE IF NOT EXISTS user_recently_viewed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('company', 'project', 'report')),
    item_id INTEGER NOT NULL,
    ticker TEXT,
    name TEXT,
    viewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recently_viewed_user ON user_recently_viewed(user_id);
CREATE INDEX idx_recently_viewed_time ON user_recently_viewed(viewed_at DESC);

-- User subscriptions (for Stripe integration)
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'institutional')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_stripe ON user_subscriptions(stripe_customer_id);

-- User API keys (for Pro/Institutional users)
CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL, -- Store hashed key
    key_prefix TEXT NOT NULL, -- First 8 chars for identification
    name TEXT NOT NULL,
    permissions JSONB DEFAULT '["read"]'::jsonb,
    rate_limit INTEGER DEFAULT 1000, -- Requests per hour
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_user ON user_api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON user_api_keys(key_hash);

-- =============================================================================
-- ENABLE RLS ON USER TABLES
-- =============================================================================

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recently_viewed ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES FOR USER TABLES
-- Users can only access their own data
-- =============================================================================

-- User preferences
CREATE POLICY "Users can view own preferences"
    ON user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
    ON user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
    ON user_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
    ON user_preferences FOR DELETE
    USING (auth.uid() = user_id);

-- User watchlist
CREATE POLICY "Users can view own watchlist"
    ON user_watchlist FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into own watchlist"
    ON user_watchlist FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from own watchlist"
    ON user_watchlist FOR DELETE
    USING (auth.uid() = user_id);

-- User recently viewed
CREATE POLICY "Users can view own history"
    ON user_recently_viewed FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history"
    ON user_recently_viewed FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own history"
    ON user_recently_viewed FOR DELETE
    USING (auth.uid() = user_id);

-- User subscriptions (read-only for users, admin writes via service role)
CREATE POLICY "Users can view own subscription"
    ON user_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- User API keys
CREATE POLICY "Users can view own API keys"
    ON user_api_keys FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API keys"
    ON user_api_keys FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
    ON user_api_keys FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
    ON user_api_keys FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================================================
-- ENABLE RLS ON PUBLIC DATA TABLES
-- Public tables are readable by everyone, writable by service role only
-- =============================================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE metal_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE insider_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE mineral_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_economics ENABLE ROW LEVEL SECURITY;
ALTER TABLE mine_production ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserves_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_queue ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES FOR PUBLIC DATA TABLES
-- Everyone can read, only service role can write
-- =============================================================================

-- Companies (public read)
CREATE POLICY "Public read access to companies"
    ON companies FOR SELECT
    USING (true);

-- Projects (public read)
CREATE POLICY "Public read access to projects"
    ON projects FOR SELECT
    USING (true);

-- News (public read)
CREATE POLICY "Public read access to news"
    ON news FOR SELECT
    USING (true);

-- Metal prices (public read)
CREATE POLICY "Public read access to metal prices"
    ON metal_prices FOR SELECT
    USING (true);

-- Price history (public read)
CREATE POLICY "Public read access to price history"
    ON price_history FOR SELECT
    USING (true);

-- Financials (public read)
CREATE POLICY "Public read access to financials"
    ON financials FOR SELECT
    USING (true);

-- Insider transactions (public read)
CREATE POLICY "Public read access to insider transactions"
    ON insider_transactions FOR SELECT
    USING (true);

-- Reports (public read)
CREATE POLICY "Public read access to reports"
    ON reports FOR SELECT
    USING (true);

-- Technical reports (public read)
CREATE POLICY "Public read access to technical reports"
    ON technical_reports FOR SELECT
    USING (true);

-- Mineral estimates (public read)
CREATE POLICY "Public read access to mineral estimates"
    ON mineral_estimates FOR SELECT
    USING (true);

-- Project economics (public read)
CREATE POLICY "Public read access to project economics"
    ON project_economics FOR SELECT
    USING (true);

-- Mine production (public read)
CREATE POLICY "Public read access to mine production"
    ON mine_production FOR SELECT
    USING (true);

-- Reserves resources (public read)
CREATE POLICY "Public read access to reserves resources"
    ON reserves_resources FOR SELECT
    USING (true);

-- Earnings (public read)
CREATE POLICY "Public read access to earnings"
    ON earnings FOR SELECT
    USING (true);

-- Filings (public read)
CREATE POLICY "Public read access to filings"
    ON filings FOR SELECT
    USING (true);

-- Documents (public read)
CREATE POLICY "Public read access to documents"
    ON documents FOR SELECT
    USING (true);

-- Extraction results (public read)
CREATE POLICY "Public read access to extraction results"
    ON extraction_results FOR SELECT
    USING (true);

-- Extracted metrics (public read)
CREATE POLICY "Public read access to extracted metrics"
    ON extracted_metrics FOR SELECT
    USING (true);

-- Extraction queue (admin only - no public policy, use service role)
-- No SELECT policy means users can't see it

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to get user's subscription tier
CREATE OR REPLACE FUNCTION get_user_tier(uid UUID)
RETURNS TEXT AS $$
DECLARE
    user_tier TEXT;
BEGIN
    SELECT tier INTO user_tier
    FROM user_subscriptions
    WHERE user_id = uid AND status = 'active';

    RETURN COALESCE(user_tier, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has premium access
CREATE OR REPLACE FUNCTION has_premium_access(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_tier(uid) IN ('pro', 'institutional');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGERS FOR USER TABLES
-- =============================================================================

-- Auto-update updated_at for user tables
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Limit recently viewed to last 50 items per user
CREATE OR REPLACE FUNCTION limit_recently_viewed()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM user_recently_viewed
    WHERE id IN (
        SELECT id FROM user_recently_viewed
        WHERE user_id = NEW.user_id
        ORDER BY viewed_at DESC
        OFFSET 50
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER limit_user_recently_viewed
    AFTER INSERT ON user_recently_viewed
    FOR EACH ROW EXECUTE FUNCTION limit_recently_viewed();

-- =============================================================================
-- NOTES FOR IMPLEMENTATION
-- =============================================================================
--
-- 1. Public data tables (companies, news, etc.) are readable by anyone
--    but can only be written to using the service role key (backend)
--
-- 2. User-specific tables (watchlist, preferences, etc.) are only accessible
--    to the authenticated user who owns the data
--
-- 3. For admin operations, use the SUPABASE_SERVICE_ROLE_KEY
--    which bypasses RLS
--
-- 4. The subscription table is read-only for users; updates come from
--    Stripe webhooks using the service role
--
-- 5. API keys store only the hash; the actual key is shown once on creation
--    and never stored in plain text
--
-- =============================================================================
