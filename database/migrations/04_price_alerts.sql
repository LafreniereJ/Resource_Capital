-- Migration: Create Price Alerts System
-- Run this in Supabase SQL Editor

-- =============================================================================
-- ALERTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,

    -- Alert conditions
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
        'price_above',
        'price_below',
        'change_percent_above',
        'change_percent_below',
        'volume_above',
        '52w_high_near',
        '52w_low_near'
    )),
    threshold_value DECIMAL(20, 4) NOT NULL,

    -- Alert status
    is_active BOOLEAN DEFAULT true,
    is_triggered BOOLEAN DEFAULT false,
    triggered_at TIMESTAMPTZ,
    triggered_price DECIMAL(20, 4),

    -- Notification preferences
    notify_email BOOLEAN DEFAULT true,
    notify_push BOOLEAN DEFAULT false,

    -- Metadata
    name VARCHAR(255),
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ALERT HISTORY TABLE (for tracking triggered alerts)
-- =============================================================================

CREATE TABLE IF NOT EXISTS alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES price_alerts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,

    alert_type VARCHAR(50) NOT NULL,
    threshold_value DECIMAL(20, 4) NOT NULL,
    triggered_price DECIMAL(20, 4) NOT NULL,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),

    -- Notification status
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMPTZ,
    push_sent BOOLEAN DEFAULT false,
    push_sent_at TIMESTAMPTZ
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_company_id ON price_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_ticker ON price_alerts(ticker);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_price_alerts_type ON price_alerts(alert_type);

CREATE INDEX IF NOT EXISTS idx_alert_history_user_id ON alert_history(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_alert_id ON alert_history(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_triggered_at ON alert_history(triggered_at);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own alerts
CREATE POLICY "Users can view own alerts"
    ON price_alerts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own alerts"
    ON price_alerts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
    ON price_alerts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
    ON price_alerts FOR DELETE
    USING (auth.uid() = user_id);

-- Alert history policies
CREATE POLICY "Users can view own alert history"
    ON alert_history FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can insert history
CREATE POLICY "Service can insert alert history"
    ON alert_history FOR INSERT
    WITH CHECK (true);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_alert_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_alert_updated_at ON price_alerts;
CREATE TRIGGER trigger_alert_updated_at
    BEFORE UPDATE ON price_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_alert_updated_at();

-- Function to check alerts against current prices
CREATE OR REPLACE FUNCTION check_price_alerts()
RETURNS TABLE (
    alert_id UUID,
    user_id UUID,
    ticker VARCHAR,
    alert_type VARCHAR,
    threshold_value DECIMAL,
    current_price DECIMAL,
    should_trigger BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pa.id as alert_id,
        pa.user_id,
        pa.ticker,
        pa.alert_type,
        pa.threshold_value,
        c.current_price,
        CASE
            WHEN pa.alert_type = 'price_above' AND c.current_price >= pa.threshold_value THEN true
            WHEN pa.alert_type = 'price_below' AND c.current_price <= pa.threshold_value THEN true
            WHEN pa.alert_type = 'change_percent_above' AND c.day_change_percent >= pa.threshold_value THEN true
            WHEN pa.alert_type = 'change_percent_below' AND c.day_change_percent <= pa.threshold_value THEN true
            WHEN pa.alert_type = 'volume_above' AND c.day_volume >= pa.threshold_value THEN true
            WHEN pa.alert_type = '52w_high_near' AND c.current_price >= (c.high_52w * 0.95) THEN true
            WHEN pa.alert_type = '52w_low_near' AND c.current_price <= (c.low_52w * 1.05) THEN true
            ELSE false
        END as should_trigger
    FROM price_alerts pa
    JOIN companies c ON pa.company_id = c.id
    WHERE pa.is_active = true
    AND pa.is_triggered = false
    AND c.current_price IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE price_alerts IS 'User-configured price alerts for stocks';
COMMENT ON TABLE alert_history IS 'History of triggered alerts';
COMMENT ON COLUMN price_alerts.alert_type IS 'Type of alert: price_above, price_below, change_percent_above, change_percent_below, volume_above, 52w_high_near, 52w_low_near';
COMMENT ON COLUMN price_alerts.threshold_value IS 'Value to compare against (price, percentage, or volume depending on alert_type)';
