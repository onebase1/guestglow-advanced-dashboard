-- 🏨 PRODUCTION EMAIL SETUP FOR EUSBETT HOTEL
-- Replace with real manager email addresses when ready to go live

-- Step 1: Create tenant email configuration with real addresses
INSERT INTO public.tenant_email_config (
    tenant_id,
    guest_relations_email,
    general_manager_email,
    operations_director_email,
    emails_enabled,
    manager_emails_enabled,
    escalation_emails_enabled
)
SELECT 
    id as tenant_id,
    'guestrelations@eusbetthotel.com' as guest_relations_email,  -- 👈 REPLACE WITH REAL EMAIL
    'gm@eusbetthotel.com' as general_manager_email,              -- 👈 REPLACE WITH REAL EMAIL
    'operations@eusbetthotel.com' as operations_director_email,  -- 👈 REPLACE WITH REAL EMAIL
    FALSE as emails_enabled,        -- 🔒 Keep FALSE until ready to go live
    FALSE as manager_emails_enabled,
    FALSE as escalation_emails_enabled
FROM public.tenants 
WHERE slug = 'eusbett'
ON CONFLICT (tenant_id) DO UPDATE SET
    guest_relations_email = EXCLUDED.guest_relations_email,
    general_manager_email = EXCLUDED.general_manager_email,
    operations_director_email = EXCLUDED.operations_director_email;

-- Step 2: Update manager configurations with real emails (but keep them inactive)
UPDATE public.manager_configurations 
SET 
    email_address = CASE 
        WHEN department = 'Guest Relations' THEN 'guestrelations@eusbetthotel.com'  -- 👈 REPLACE
        WHEN department = 'Management' THEN 'gm@eusbetthotel.com'                   -- 👈 REPLACE
        WHEN department = 'Food & Beverage' THEN 'fb@eusbetthotel.com'              -- 👈 REPLACE
        WHEN department = 'Housekeeping' THEN 'housekeeping@eusbetthotel.com'       -- 👈 REPLACE
        WHEN department = 'Front Desk' THEN 'frontdesk@eusbetthotel.com'            -- 👈 REPLACE
        WHEN department = 'Maintenance' THEN 'maintenance@eusbetthotel.com'         -- 👈 REPLACE
        ELSE 'system-fallback@guest-glow.com'
    END,
    manager_name = CASE 
        WHEN department = 'Guest Relations' THEN 'Guest Relations Team'
        WHEN department = 'Management' THEN 'General Manager'
        WHEN department = 'Food & Beverage' THEN 'F&B Manager'
        WHEN department = 'Housekeeping' THEN 'Housekeeping Manager'
        WHEN department = 'Front Desk' THEN 'Front Desk Manager'
        WHEN department = 'Maintenance' THEN 'Maintenance Manager'
        ELSE manager_name
    END
WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'eusbett');

-- Step 3: Remove your personal email from the system
UPDATE public.manager_configurations 
SET email_address = 'system-fallback@guest-glow.com'
WHERE email_address = 'g.basera@yahoo.com';

-- Step 4: Verification queries
SELECT 'TENANT EMAIL CONFIG:' as section, 
       guest_relations_email, 
       general_manager_email, 
       operations_director_email,
       emails_enabled
FROM public.tenant_email_config tec
JOIN public.tenants t ON t.id = tec.tenant_id
WHERE t.slug = 'eusbett';

SELECT 'MANAGER CONFIGURATIONS:' as section,
       department,
       manager_name,
       email_address,
       is_primary
FROM public.manager_configurations mc
JOIN public.tenants t ON t.id = mc.tenant_id
WHERE t.slug = 'eusbett'
ORDER BY department;

-- Step 5: When ready to go live, run this to enable emails:
-- UPDATE public.tenant_email_config 
-- SET 
--     emails_enabled = TRUE,
--     manager_emails_enabled = TRUE,
--     escalation_emails_enabled = TRUE
-- WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'eusbett');

SELECT '🔒 EMAILS STILL DISABLED - Run Step 5 when ready to go live' as status;
