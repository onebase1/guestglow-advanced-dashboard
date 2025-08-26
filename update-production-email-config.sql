-- 🚀 PRODUCTION EMAIL CONFIGURATION UPDATE
-- Run this SQL in your Supabase SQL editor to update all email recipients 
-- from test emails to production-ready structure

-- ================================
-- 1. UPDATE TENANT CONTACT EMAIL
-- ================================

UPDATE public.tenants 
SET contact_email = 'guestrelations@eusbetthotel.com'
WHERE slug = 'eusbett';

-- ================================
-- 2. CLEAR EXISTING MANAGER CONFIG
-- ================================

-- Remove old complex manager structure
DELETE FROM public.manager_configurations 
WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'eusbett');

-- ================================
-- 3. INSERT SIMPLIFIED MANAGER STRUCTURE
-- ================================

DO $$
DECLARE
  eusbett_tenant_id UUID;
BEGIN
  -- Get Eusbett tenant ID
  SELECT id INTO eusbett_tenant_id FROM public.tenants WHERE slug = 'eusbett';
  
  IF eusbett_tenant_id IS NOT NULL THEN
    -- Insert simplified 3-person structure
    INSERT INTO public.manager_configurations (tenant_id, name, email, department, title, is_primary, is_active)
    VALUES 
      (eusbett_tenant_id, 'Guest Relations Team', 'guestrelations@eusbetthotel.com', 'Guest Relations', 'Guest Relations Manager', true, true),
      (eusbett_tenant_id, 'General Manager', 'gm@eusbetthotel.com', 'Management', 'General Manager', false, true),
      (eusbett_tenant_id, 'Edward Bennett', 'erbennett@gmail.com', 'Management', 'Operations Director', false, true)
    ON CONFLICT DO NOTHING;
    
    -- Update category routing to use Guest Relations as primary
    UPDATE public.category_routing_configurations 
    SET manager_id = (
      SELECT id FROM public.manager_configurations 
      WHERE tenant_id = eusbett_tenant_id AND is_primary = true 
      LIMIT 1
    ),
    auto_escalation_hours = 4  -- Standard 4-hour escalation window
    WHERE tenant_id = eusbett_tenant_id;
    
    -- If no category routing exists, create default ones for new categories
    INSERT INTO public.category_routing_configurations (
      tenant_id, 
      feedback_category, 
      manager_id, 
      auto_escalation_hours,
      is_active
    )
    SELECT 
      eusbett_tenant_id,
      unnest(ARRAY[
        'Conferences/Meetings',
        'Internet', 
        'Spa',
        'Gym',
        'Security',
        'Swimming Pool',
        'Room Quality',
        'Service',
        'Cleanliness',
        'Amenities',
        'Food & Beverage',
        'Check-in/Check-out',
        'Staff Behavior',
        'Noise',
        'Other'
      ]),
      (SELECT id FROM public.manager_configurations WHERE tenant_id = eusbett_tenant_id AND is_primary = true LIMIT 1),
      4,  -- 4 hour escalation
      true
    ON CONFLICT (tenant_id, feedback_category) DO UPDATE SET
      manager_id = EXCLUDED.manager_id,
      auto_escalation_hours = EXCLUDED.auto_escalation_hours,
      is_active = EXCLUDED.is_active;
      
  END IF;
END $$;

-- ================================
-- 4. VERIFY THE CHANGES
-- ================================

-- Check tenant contact email
SELECT name, slug, contact_email 
FROM public.tenants 
WHERE slug = 'eusbett';

-- Check manager configurations
SELECT name, email, department, title, is_primary, is_active
FROM public.manager_configurations mc
JOIN public.tenants t ON mc.tenant_id = t.id
WHERE t.slug = 'eusbett'
ORDER BY is_primary DESC, title;

-- Check category routing
SELECT 
  crc.feedback_category,
  mc.name as manager_name,
  mc.email as manager_email,
  crc.auto_escalation_hours,
  crc.is_active
FROM public.category_routing_configurations crc
JOIN public.manager_configurations mc ON crc.manager_id = mc.id
JOIN public.tenants t ON crc.tenant_id = t.id
WHERE t.slug = 'eusbett'
ORDER BY crc.feedback_category;

-- ================================
-- SUCCESS MESSAGE
-- ================================

SELECT 'PRODUCTION EMAIL CONFIGURATION UPDATE COMPLETE! ✅' as status,
       'All emails now route to: guestrelations@eusbetthotel.com -> gm@eusbetthotel.com -> erbennett@gmail.com' as flow;