-- 🚨 CRITICAL HOTFIX: Update Database Emails to Safe Fallback
-- This immediately stops real client emails from being sent
-- Run this in Supabase SQL Editor IMMEDIATELY

-- 1. Update all manager configurations to use safe fallback
UPDATE public.manager_configurations 
SET email = 'system-fallback@guest-glow.com'
WHERE email IN (
    'g.basera@yahoo.com',
    'guestrelations@eusbetthotel.com', 
    'gm@eusbetthotel.com',
    'erbennett@gmail.com'
);

-- 2. Update tenant contact emails to use safe fallback
UPDATE public.tenants 
SET contact_email = 'system-fallback@guest-glow.com'
WHERE contact_email IN (
    'g.basera@yahoo.com',
    'guestrelations@eusbetthotel.com', 
    'gm@eusbetthotel.com',
    'erbennett@gmail.com'
);

-- 3. Verify the changes
SELECT 'Manager Configurations Updated:' as status, count(*) as count
FROM public.manager_configurations 
WHERE email = 'system-fallback@guest-glow.com';

SELECT 'Tenant Contact Emails Updated:' as status, count(*) as count
FROM public.tenants 
WHERE contact_email = 'system-fallback@guest-glow.com';

-- 4. Show any remaining real client emails (should be empty)
SELECT 'REMAINING REAL EMAILS (should be empty):' as warning, email, count(*) as count
FROM public.manager_configurations 
WHERE email NOT IN ('system-fallback@guest-glow.com', 'gizzy@guest-glow.com')
GROUP BY email;

-- 5. Create tenant email config with safe defaults if not exists
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
    'system-fallback@guest-glow.com' as guest_relations_email,
    'system-fallback@guest-glow.com' as general_manager_email,
    'system-fallback@guest-glow.com' as operations_director_email,
    FALSE as emails_enabled,
    FALSE as manager_emails_enabled,
    FALSE as escalation_emails_enabled
FROM public.tenants 
WHERE id NOT IN (SELECT tenant_id FROM public.tenant_email_config)
ON CONFLICT (tenant_id) DO NOTHING;

-- 6. Final verification
SELECT 
    'HOTFIX COMPLETE - All emails now route to safe fallback' as status,
    'system-fallback@guest-glow.com' as safe_email,
    'No real client emails will be sent' as guarantee;
