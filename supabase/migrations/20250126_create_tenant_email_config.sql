-- 📧 TENANT EMAIL CONFIGURATION TABLE
-- Safe-by-default email routing system for multi-tenant architecture
-- Prevents accidental emails to real clients until explicitly enabled

CREATE TABLE IF NOT EXISTS tenant_email_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Email addresses (safe defaults)
    guest_relations_email TEXT NOT NULL DEFAULT 'system-fallback@guest-glow.com',
    general_manager_email TEXT NOT NULL DEFAULT 'system-fallback@guest-glow.com',
    operations_director_email TEXT NOT NULL DEFAULT 'system-fallback@guest-glow.com',
    
    -- Master switches (safe defaults - emails disabled)
    emails_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    manager_emails_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    escalation_emails_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Ensure one config per tenant
    UNIQUE(tenant_id)
);

-- 🔒 ROW LEVEL SECURITY
ALTER TABLE tenant_email_config ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access email config for their tenant
CREATE POLICY "tenant_email_config_tenant_isolation" ON tenant_email_config
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id 
            FROM user_tenant_access 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- 🔄 AUTO-UPDATE TIMESTAMP
CREATE OR REPLACE FUNCTION update_tenant_email_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_email_config_updated_at
    BEFORE UPDATE ON tenant_email_config
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_email_config_updated_at();

-- 📊 POPULATE SAFE DEFAULTS FOR EXISTING TENANTS
INSERT INTO tenant_email_config (tenant_id, guest_relations_email, general_manager_email, operations_director_email, emails_enabled, manager_emails_enabled, escalation_emails_enabled)
SELECT 
    id as tenant_id,
    'system-fallback@guest-glow.com' as guest_relations_email,
    'system-fallback@guest-glow.com' as general_manager_email,
    'system-fallback@guest-glow.com' as operations_director_email,
    FALSE as emails_enabled,
    FALSE as manager_emails_enabled,
    FALSE as escalation_emails_enabled
FROM tenants 
WHERE id NOT IN (SELECT tenant_id FROM tenant_email_config)
ON CONFLICT (tenant_id) DO NOTHING;

-- 📝 COMMENTS
COMMENT ON TABLE tenant_email_config IS 'Safe-by-default email configuration per tenant. Prevents accidental emails to real clients.';
COMMENT ON COLUMN tenant_email_config.emails_enabled IS 'Master switch - must be TRUE to send any real emails';
COMMENT ON COLUMN tenant_email_config.manager_emails_enabled IS 'Controls manager notification emails';
COMMENT ON COLUMN tenant_email_config.escalation_emails_enabled IS 'Controls SLA escalation emails';
COMMENT ON COLUMN tenant_email_config.guest_relations_email IS 'Primary contact for guest relations';
COMMENT ON COLUMN tenant_email_config.general_manager_email IS 'General manager email for escalations';
COMMENT ON COLUMN tenant_email_config.operations_director_email IS 'Operations director for final escalations';

-- 🔍 HELPER FUNCTION: Get tenant email configuration
CREATE OR REPLACE FUNCTION get_tenant_email_config(p_tenant_id UUID)
RETURNS TABLE (
    guest_relations_email TEXT,
    general_manager_email TEXT,
    operations_director_email TEXT,
    emails_enabled BOOLEAN,
    manager_emails_enabled BOOLEAN,
    escalation_emails_enabled BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tec.guest_relations_email,
        tec.general_manager_email,
        tec.operations_director_email,
        tec.emails_enabled,
        tec.manager_emails_enabled,
        tec.escalation_emails_enabled
    FROM tenant_email_config tec
    WHERE tec.tenant_id = p_tenant_id;
    
    -- If no config found, return safe defaults
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            'system-fallback@guest-glow.com'::TEXT as guest_relations_email,
            'system-fallback@guest-glow.com'::TEXT as general_manager_email,
            'system-fallback@guest-glow.com'::TEXT as operations_director_email,
            FALSE as emails_enabled,
            FALSE as manager_emails_enabled,
            FALSE as escalation_emails_enabled;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🔧 HELPER FUNCTION: Update tenant email configuration
CREATE OR REPLACE FUNCTION update_tenant_email_config(
    p_tenant_id UUID,
    p_guest_relations_email TEXT DEFAULT NULL,
    p_general_manager_email TEXT DEFAULT NULL,
    p_operations_director_email TEXT DEFAULT NULL,
    p_emails_enabled BOOLEAN DEFAULT NULL,
    p_manager_emails_enabled BOOLEAN DEFAULT NULL,
    p_escalation_emails_enabled BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    config_exists BOOLEAN;
BEGIN
    -- Check if config exists
    SELECT EXISTS(SELECT 1 FROM tenant_email_config WHERE tenant_id = p_tenant_id) INTO config_exists;
    
    IF config_exists THEN
        -- Update existing config
        UPDATE tenant_email_config SET
            guest_relations_email = COALESCE(p_guest_relations_email, guest_relations_email),
            general_manager_email = COALESCE(p_general_manager_email, general_manager_email),
            operations_director_email = COALESCE(p_operations_director_email, operations_director_email),
            emails_enabled = COALESCE(p_emails_enabled, emails_enabled),
            manager_emails_enabled = COALESCE(p_manager_emails_enabled, manager_emails_enabled),
            escalation_emails_enabled = COALESCE(p_escalation_emails_enabled, escalation_emails_enabled),
            updated_at = NOW(),
            updated_by = auth.uid()
        WHERE tenant_id = p_tenant_id;
    ELSE
        -- Insert new config with safe defaults
        INSERT INTO tenant_email_config (
            tenant_id,
            guest_relations_email,
            general_manager_email,
            operations_director_email,
            emails_enabled,
            manager_emails_enabled,
            escalation_emails_enabled,
            created_by
        ) VALUES (
            p_tenant_id,
            COALESCE(p_guest_relations_email, 'system-fallback@guest-glow.com'),
            COALESCE(p_general_manager_email, 'system-fallback@guest-glow.com'),
            COALESCE(p_operations_director_email, 'system-fallback@guest-glow.com'),
            COALESCE(p_emails_enabled, FALSE),
            COALESCE(p_manager_emails_enabled, FALSE),
            COALESCE(p_escalation_emails_enabled, FALSE),
            auth.uid()
        );
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON tenant_email_config TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_email_config(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_tenant_email_config(UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;
