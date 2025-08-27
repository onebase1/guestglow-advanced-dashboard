-- 🏨 SIMPLIFIED 2-STAGE ESCALATION SYSTEM FOR EUSBETT
-- Guest Relations → GM → Auto-Close with Weekly Stats

-- Step 1: Clear existing complex escalation setup
DELETE FROM public.category_routing_configurations 
WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'eusbett');

-- Step 2: Create simple 2-manager system
INSERT INTO public.manager_configurations (
    tenant_id,
    manager_name,
    email_address,
    department,
    is_primary,
    escalation_level,
    created_at
)
SELECT 
    id as tenant_id,
    'Guest Relations Manager' as manager_name,
    'g.basera@yahoo.com' as email_address,  -- 👈 Current working email
    'Guest Relations' as department,
    true as is_primary,
    1 as escalation_level,
    NOW() as created_at
FROM public.tenants 
WHERE slug = 'eusbett'
ON CONFLICT (tenant_id, department) DO UPDATE SET
    manager_name = EXCLUDED.manager_name,
    email_address = EXCLUDED.email_address,
    is_primary = EXCLUDED.is_primary,
    escalation_level = EXCLUDED.escalation_level;

INSERT INTO public.manager_configurations (
    tenant_id,
    manager_name,
    email_address,
    department,
    is_primary,
    escalation_level,
    created_at
)
SELECT 
    id as tenant_id,
    'General Manager' as manager_name,
    'basera@btinternet.com' as email_address,  -- 👈 GM email (later gm@eusbett + erbennet@gmail)
    'Management' as department,
    false as is_primary,
    2 as escalation_level,
    NOW() as created_at
FROM public.tenants 
WHERE slug = 'eusbett'
ON CONFLICT (tenant_id, department) DO UPDATE SET
    manager_name = EXCLUDED.manager_name,
    email_address = EXCLUDED.email_address,
    is_primary = EXCLUDED.is_primary,
    escalation_level = EXCLUDED.escalation_level;

-- Step 3: Create simple category routing (all feedback goes to Guest Relations first)
INSERT INTO public.category_routing_configurations (
    tenant_id,
    feedback_category,
    manager_id,
    priority_level,
    auto_escalation_hours,
    is_active
)
SELECT 
    t.id as tenant_id,
    category,
    mc.id as manager_id,
    'normal' as priority_level,
    0.1 as auto_escalation_hours,  -- 🧪 6 minutes for testing (0.1 hours)
    true as is_active
FROM public.tenants t
CROSS JOIN (VALUES 
    ('Service Quality'),
    ('Room Cleanliness'),
    ('Food & Beverage'),
    ('Facilities'),
    ('Staff Behavior'),
    ('General Experience')
) AS categories(category)
JOIN public.manager_configurations mc ON mc.tenant_id = t.id AND mc.department = 'Guest Relations'
WHERE t.slug = 'eusbett'
ON CONFLICT (tenant_id, feedback_category) DO UPDATE SET
    manager_id = EXCLUDED.manager_id,
    auto_escalation_hours = EXCLUDED.auto_escalation_hours,
    is_active = EXCLUDED.is_active;

-- Step 4: Create escalation tracking table for weekly stats
CREATE TABLE IF NOT EXISTS public.escalation_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    feedback_id UUID NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    escalation_level INTEGER NOT NULL CHECK (escalation_level IN (1, 2, 3)),
    manager_email VARCHAR(255) NOT NULL,
    manager_department VARCHAR(100) NOT NULL,
    escalated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    auto_closed_at TIMESTAMP WITH TIME ZONE,
    response_time_minutes INTEGER,
    was_acknowledged BOOLEAN DEFAULT FALSE,
    was_resolved BOOLEAN DEFAULT FALSE,
    was_auto_closed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for weekly reporting
CREATE INDEX IF NOT EXISTS idx_escalation_stats_week_tenant 
ON public.escalation_stats(tenant_id, week_start_date, escalation_level);

-- Step 5: Create function to log escalation stats
CREATE OR REPLACE FUNCTION public.log_escalation_stat(
    p_feedback_id UUID,
    p_escalation_level INTEGER,
    p_manager_email VARCHAR(255),
    p_manager_department VARCHAR(100)
)
RETURNS UUID AS $$
DECLARE
    v_tenant_id UUID;
    v_week_start DATE;
    v_stat_id UUID;
BEGIN
    -- Get tenant ID from feedback
    SELECT tenant_id INTO v_tenant_id 
    FROM public.feedback 
    WHERE id = p_feedback_id;
    
    -- Calculate week start (Monday)
    v_week_start := DATE_TRUNC('week', CURRENT_DATE);
    
    -- Insert escalation stat
    INSERT INTO public.escalation_stats (
        tenant_id,
        feedback_id,
        week_start_date,
        escalation_level,
        manager_email,
        manager_department,
        escalated_at
    ) VALUES (
        v_tenant_id,
        p_feedback_id,
        v_week_start,
        p_escalation_level,
        p_manager_email,
        p_manager_department,
        NOW()
    ) RETURNING id INTO v_stat_id;
    
    RETURN v_stat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create function to update escalation stat when acknowledged/resolved
CREATE OR REPLACE FUNCTION public.update_escalation_stat()
RETURNS TRIGGER AS $$
DECLARE
    v_response_time INTEGER;
BEGIN
    -- Update escalation stats when feedback is acknowledged
    IF NEW.acknowledged_at IS NOT NULL AND (OLD.acknowledged_at IS NULL OR OLD.acknowledged_at != NEW.acknowledged_at) THEN
        v_response_time := EXTRACT(EPOCH FROM (NEW.acknowledged_at - NEW.created_at)) / 60;
        
        UPDATE public.escalation_stats 
        SET 
            acknowledged_at = NEW.acknowledged_at,
            was_acknowledged = TRUE,
            response_time_minutes = v_response_time
        WHERE feedback_id = NEW.id;
    END IF;
    
    -- Update escalation stats when feedback is resolved
    IF NEW.resolved_at IS NOT NULL AND (OLD.resolved_at IS NULL OR OLD.resolved_at != NEW.resolved_at) THEN
        UPDATE public.escalation_stats 
        SET 
            resolved_at = NEW.resolved_at,
            was_resolved = TRUE
        WHERE feedback_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for escalation stat updates
DROP TRIGGER IF EXISTS update_escalation_stat_trigger ON public.feedback;
CREATE TRIGGER update_escalation_stat_trigger
    AFTER UPDATE ON public.feedback
    FOR EACH ROW
    EXECUTE FUNCTION public.update_escalation_stat();

-- Step 7: Verification queries
SELECT '🎯 SIMPLIFIED ESCALATION SETUP:' as section;

SELECT 
    'MANAGERS:' as type,
    manager_name,
    email_address,
    department,
    escalation_level,
    is_primary
FROM public.manager_configurations mc
JOIN public.tenants t ON t.id = mc.tenant_id
WHERE t.slug = 'eusbett'
ORDER BY escalation_level;

SELECT 
    'CATEGORY ROUTING:' as type,
    feedback_category,
    auto_escalation_hours || ' hours (' || (auto_escalation_hours * 60) || ' minutes)' as escalation_time,
    priority_level
FROM public.category_routing_configurations crc
JOIN public.tenants t ON t.id = crc.tenant_id
WHERE t.slug = 'eusbett'
ORDER BY feedback_category;

SELECT '✅ 2-Stage Escalation System Ready!' as status;
SELECT '🧪 Testing Mode: 6-minute escalation intervals' as testing_note;
SELECT '📊 Weekly stats tracking enabled' as stats_note;
