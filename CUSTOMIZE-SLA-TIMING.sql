-- 🏨 CUSTOMIZE SLA TIMING FOR EUSBETT HOTEL
-- Adjust escalation timing based on your hotel's operational needs

-- Current SLA Configuration (what you have now):
SELECT 
    feedback_category,
    auto_escalation_hours,
    priority_level,
    manager_configurations.manager_name,
    manager_configurations.email_address
FROM public.category_routing_configurations crc
LEFT JOIN public.manager_configurations ON crc.manager_id = manager_configurations.id
WHERE crc.tenant_id = (SELECT id FROM public.tenants WHERE slug = 'eusbett')
ORDER BY feedback_category;

-- 🎯 RECOMMENDED SLA TIMING FOR HOTELS:

-- Option A: Conservative Timing (Recommended for Start)
UPDATE public.category_routing_configurations 
SET 
    auto_escalation_hours = CASE 
        WHEN feedback_category = 'Staff Behavior' THEN 1        -- Critical: 1 hour
        WHEN feedback_category = 'Service Quality' THEN 2       -- High: 2 hours
        WHEN feedback_category = 'Room Cleanliness' THEN 2      -- High: 2 hours
        WHEN feedback_category = 'Food & Beverage' THEN 4       -- Normal: 4 hours
        WHEN feedback_category = 'Facilities' THEN 6            -- Normal: 6 hours
        WHEN feedback_category = 'General Experience' THEN 4    -- Normal: 4 hours
        ELSE 4  -- Default: 4 hours
    END,
    priority_level = CASE 
        WHEN feedback_category = 'Staff Behavior' THEN 'critical'
        WHEN feedback_category IN ('Service Quality', 'Room Cleanliness') THEN 'high'
        ELSE 'normal'
    END
WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'eusbett');

-- Option B: Aggressive Timing (For High-Service Hotels)
-- UPDATE public.category_routing_configurations 
-- SET 
--     auto_escalation_hours = CASE 
--         WHEN feedback_category = 'Staff Behavior' THEN 0.5      -- Critical: 30 minutes
--         WHEN feedback_category = 'Service Quality' THEN 1       -- High: 1 hour
--         WHEN feedback_category = 'Room Cleanliness' THEN 1      -- High: 1 hour
--         WHEN feedback_category = 'Food & Beverage' THEN 2       -- Normal: 2 hours
--         WHEN feedback_category = 'Facilities' THEN 4            -- Normal: 4 hours
--         WHEN feedback_category = 'General Experience' THEN 2    -- Normal: 2 hours
--         ELSE 2  -- Default: 2 hours
--     END
-- WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'eusbett');

-- Option C: Relaxed Timing (For Smaller Hotels)
-- UPDATE public.category_routing_configurations 
-- SET 
--     auto_escalation_hours = CASE 
--         WHEN feedback_category = 'Staff Behavior' THEN 2        -- Critical: 2 hours
--         WHEN feedback_category = 'Service Quality' THEN 4       -- High: 4 hours
--         WHEN feedback_category = 'Room Cleanliness' THEN 4      -- High: 4 hours
--         WHEN feedback_category = 'Food & Beverage' THEN 8       -- Normal: 8 hours
--         WHEN feedback_category = 'Facilities' THEN 12           -- Normal: 12 hours
--         WHEN feedback_category = 'General Experience' THEN 6    -- Normal: 6 hours
--         ELSE 6  -- Default: 6 hours
--     END
-- WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'eusbett');

-- 🔧 CUSTOMIZE REMINDER TIMING (Currently 30 minutes)
-- To change the 30-minute reminder, you need to update the sla-monitor function
-- Current logic: hoursSinceCreated >= 0.5 (30 minutes)
-- 
-- Options:
-- - 15 minutes: hoursSinceCreated >= 0.25
-- - 45 minutes: hoursSinceCreated >= 0.75
-- - 1 hour: hoursSinceCreated >= 1.0

-- 📊 VERIFY YOUR NEW CONFIGURATION:
SELECT 
    '🎯 UPDATED SLA CONFIGURATION:' as section,
    feedback_category,
    auto_escalation_hours || ' hours' as escalation_time,
    priority_level,
    CASE 
        WHEN auto_escalation_hours <= 1 THEN '🔥 Very Fast Response'
        WHEN auto_escalation_hours <= 2 THEN '⚡ Fast Response'
        WHEN auto_escalation_hours <= 4 THEN '⏰ Standard Response'
        WHEN auto_escalation_hours <= 8 THEN '🕐 Relaxed Response'
        ELSE '📅 Extended Response'
    END as response_speed
FROM public.category_routing_configurations crc
WHERE crc.tenant_id = (SELECT id FROM public.tenants WHERE slug = 'eusbett')
ORDER BY auto_escalation_hours, feedback_category;

-- 🧪 TEST YOUR SLA CONFIGURATION:
-- 1. Submit test feedback in each category
-- 2. Wait for the configured time
-- 3. Check that escalation emails are sent correctly
-- 4. Verify escalation hierarchy works as expected

SELECT '✅ SLA timing updated! Test with feedback submissions to verify.' as status;
