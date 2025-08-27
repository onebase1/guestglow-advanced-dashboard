-- 🧪 TESTING VS PRODUCTION TIMING CONFIGURATION
-- Switch between fast testing intervals and production timing

-- =============================================================================
-- 🧪 TESTING MODE (3-minute intervals for quick testing)
-- =============================================================================

-- TESTING: Set 3-minute escalation intervals
UPDATE public.category_routing_configurations 
SET auto_escalation_hours = 0.05  -- 3 minutes (0.05 hours)
WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'eusbett');

SELECT '🧪 TESTING MODE ENABLED' as mode;
SELECT 
    '⏱️ TESTING TIMELINE:' as timeline,
    '1.5 min: Reminder to Guest Relations' as step_1,
    '3 min: Escalate to GM' as step_2,
    '6 min: Final reminder to GM' as step_3,
    '12 min: Auto-close with stats' as step_4;

-- =============================================================================
-- 🏨 PRODUCTION MODE (30-minute intervals for real operation)
-- =============================================================================

-- PRODUCTION: Set 30-minute escalation intervals (uncomment when ready)
-- UPDATE public.category_routing_configurations 
-- SET auto_escalation_hours = 0.5  -- 30 minutes (0.5 hours)
-- WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'eusbett');

-- SELECT '🏨 PRODUCTION MODE ENABLED' as mode;
-- SELECT 
--     '⏱️ PRODUCTION TIMELINE:' as timeline,
--     '15 min: Reminder to Guest Relations' as step_1,
--     '30 min: Escalate to GM' as step_2,
--     '1 hour: Final reminder to GM' as step_3,
--     '2 hours: Auto-close with stats' as step_4;

-- =============================================================================
-- 📊 VERIFY CURRENT CONFIGURATION
-- =============================================================================

SELECT 
    '📊 CURRENT CONFIGURATION:' as section,
    feedback_category,
    auto_escalation_hours,
    CASE 
        WHEN auto_escalation_hours <= 0.1 THEN '🧪 TESTING MODE (3-6 min intervals)'
        WHEN auto_escalation_hours <= 1 THEN '🏨 PRODUCTION MODE (30-60 min intervals)'
        ELSE '⚠️ CUSTOM TIMING'
    END as mode,
    CONCAT(
        'Reminder: ', ROUND(auto_escalation_hours * 0.5 * 60), ' min | ',
        'Escalate: ', ROUND(auto_escalation_hours * 60), ' min | ',
        'Final: ', ROUND(auto_escalation_hours * 2 * 60), ' min | ',
        'Auto-close: ', ROUND(auto_escalation_hours * 4 * 60), ' min'
    ) as timeline
FROM public.category_routing_configurations crc
WHERE crc.tenant_id = (SELECT id FROM public.tenants WHERE slug = 'eusbett')
ORDER BY feedback_category;

-- =============================================================================
-- 🎯 QUICK TESTING WORKFLOW
-- =============================================================================

SELECT '🎯 TESTING WORKFLOW:' as section;
SELECT 
    '1. Run SIMPLIFIED-2STAGE-ESCALATION.sql to set up managers' as step_1,
    '2. Keep this file in TESTING MODE (3-minute intervals)' as step_2,
    '3. Submit test feedback with low rating' as step_3,
    '4. Watch emails arrive at g.basera@yahoo.com (Guest Relations)' as step_4,
    '5. Wait 3 minutes without acknowledging' as step_5,
    '6. Check basera@btinternet.com for GM escalation' as step_6,
    '7. Wait another 6 minutes to see auto-close notification' as step_7;

-- =============================================================================
-- 🔄 SWITCH TO PRODUCTION (Run when ready to go live)
-- =============================================================================

-- UNCOMMENT THESE LINES WHEN READY FOR PRODUCTION:
-- 
-- UPDATE public.category_routing_configurations 
-- SET auto_escalation_hours = 0.5  -- 30 minutes
-- WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'eusbett');
-- 
-- UPDATE public.manager_configurations 
-- SET 
--     email_address = CASE 
--         WHEN escalation_level = 1 THEN 'guestrelations@eusbetthotel.com'  -- Real Guest Relations
--         WHEN escalation_level = 2 THEN 'gm@eusbetthotel.com'              -- Real GM
--         ELSE email_address
--     END
-- WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'eusbett');
-- 
-- UPDATE public.tenant_email_config 
-- SET 
--     emails_enabled = TRUE,
--     manager_emails_enabled = TRUE,
--     escalation_emails_enabled = TRUE
-- WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'eusbett');

SELECT '✅ Configuration ready for testing!' as status;
