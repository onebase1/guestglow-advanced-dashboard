-- GuestGlow Automated Tenant Onboarding System
-- This creates a complete tenant setup in under 5 minutes

-- Function to create a complete new tenant with all configurations
CREATE OR REPLACE FUNCTION public.create_complete_tenant(
  p_tenant_name TEXT,
  p_tenant_slug TEXT,
  p_contact_email TEXT,
  p_contact_phone TEXT DEFAULT NULL,
  p_primary_color TEXT DEFAULT '#1f2937',
  p_secondary_color TEXT DEFAULT '#3b82f6',
  p_logo_url TEXT DEFAULT NULL,
  p_managers JSONB DEFAULT '[]'::jsonb,
  p_categories JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  new_tenant_id UUID;
  manager_record JSONB;
  category_record JSONB;
  result JSONB;
  default_categories JSONB;
BEGIN
  -- Create the tenant
  INSERT INTO public.tenants (name, slug, contact_email, contact_phone, primary_color, secondary_color, logo_url, is_active)
  VALUES (p_tenant_name, p_tenant_slug, p_contact_email, p_contact_phone, p_primary_color, p_secondary_color, p_logo_url, true)
  RETURNING id INTO new_tenant_id;

  -- Default category configurations if none provided
  default_categories := '[
    {"category": "Service Quality", "sla_hours": 2, "priority": "high"},
    {"category": "Room Cleanliness", "sla_hours": 2, "priority": "high"},
    {"category": "Food & Beverage", "sla_hours": 4, "priority": "normal"},
    {"category": "Facilities", "sla_hours": 4, "priority": "normal"},
    {"category": "Staff Behavior", "sla_hours": 1, "priority": "critical"},
    {"category": "General Experience", "sla_hours": 4, "priority": "normal"},
    {"category": "Check-in/Check-out", "sla_hours": 2, "priority": "high"},
    {"category": "Noise", "sla_hours": 1, "priority": "high"},
    {"category": "Maintenance", "sla_hours": 4, "priority": "normal"},
    {"category": "Other", "sla_hours": 4, "priority": "normal"}
  ]'::jsonb;

  -- Use provided categories or defaults
  IF p_categories IS NULL THEN
    p_categories := default_categories;
  END IF;

  -- Create manager configurations
  FOR manager_record IN SELECT * FROM jsonb_array_elements(p_managers)
  LOOP
    INSERT INTO public.manager_configurations (
      tenant_id, name, email, phone, department, title, is_primary, is_active
    ) VALUES (
      new_tenant_id,
      manager_record->>'name',
      manager_record->>'email',
      manager_record->>'phone',
      manager_record->>'department',
      manager_record->>'title',
      COALESCE((manager_record->>'is_primary')::boolean, false),
      true
    );
  END LOOP;

  -- Create category routing configurations
  FOR category_record IN SELECT * FROM jsonb_array_elements(p_categories)
  LOOP
    INSERT INTO public.category_routing_configurations (
      tenant_id, 
      feedback_category, 
      auto_escalation_hours, 
      priority_level,
      is_active
    ) VALUES (
      new_tenant_id,
      category_record->>'category',
      COALESCE((category_record->>'sla_hours')::integer, 4),
      COALESCE(category_record->>'priority', 'normal'),
      true
    );
  END LOOP;

  -- Create default email templates
  INSERT INTO public.email_template_configurations (tenant_id, template_type, template_name, subject_line, template_content)
  VALUES 
    (new_tenant_id, 'welcome', 'Welcome Email', 'Thank you for your feedback!', 
     'Dear {{guest_name}},\n\nThank you for taking the time to share your experience with us.\n\nBest regards,\nThe ' || p_tenant_name || ' Team'),
    (new_tenant_id, 'follow_up', 'Follow-up Email', 'Following up on your recent stay', 
     'Dear {{guest_name}},\n\nWe wanted to follow up on your recent feedback.\n\nBest regards,\n{{manager_name}}'),
    (new_tenant_id, 'escalation', 'Escalation Alert', 'URGENT: Unresolved Guest Feedback', 
     'URGENT: Guest feedback requires immediate attention.\n\nFeedback ID: {{feedback_id}}\nGuest: {{guest_name}}\nRating: {{rating}}/5'),
    (new_tenant_id, 'satisfaction', 'Satisfaction Survey', 'How did we do?', 
     'Dear {{guest_name}},\n\nWe hope we addressed your concerns. Please let us know how satisfied you are with our response.');

  -- Create tenant assets record
  INSERT INTO public.tenant_assets (tenant_id, logo_url, primary_color, secondary_color)
  VALUES (new_tenant_id, p_logo_url, p_primary_color, p_secondary_color);

  -- Build result
  result := jsonb_build_object(
    'success', true,
    'tenant_id', new_tenant_id,
    'tenant_slug', p_tenant_slug,
    'message', 'Tenant created successfully with all configurations',
    'next_steps', jsonb_build_array(
      'Upload logo to /public/' || p_tenant_slug || '-logo.svg',
      'Generate QR codes for locations',
      'Test feedback submission',
      'Configure external review monitoring'
    )
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to create tenant: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate QR code data for a tenant
CREATE OR REPLACE FUNCTION public.generate_tenant_qr_data(
  p_tenant_slug TEXT,
  p_room_number TEXT DEFAULT NULL,
  p_area TEXT DEFAULT NULL,
  p_base_url TEXT DEFAULT 'https://guest-glow.com'
)
RETURNS JSONB AS $$
DECLARE
  qr_url TEXT;
  qr_params TEXT := '';
BEGIN
  -- Build query parameters
  IF p_room_number IS NOT NULL THEN
    qr_params := qr_params || 'room=' || p_room_number;
  END IF;
  
  IF p_area IS NOT NULL THEN
    IF qr_params != '' THEN
      qr_params := qr_params || '&';
    END IF;
    qr_params := qr_params || 'area=' || p_area;
  END IF;

  -- Build final URL
  qr_url := p_base_url || '/' || p_tenant_slug || '/quick-feedback';
  IF qr_params != '' THEN
    qr_url := qr_url || '?' || qr_params;
  END IF;

  RETURN jsonb_build_object(
    'qr_url', qr_url,
    'qr_image_url', 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' || encode(qr_url::bytea, 'escape'),
    'room_number', p_room_number,
    'area', p_area,
    'tenant_slug', p_tenant_slug
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate tenant setup completeness
CREATE OR REPLACE FUNCTION public.validate_tenant_setup(p_tenant_slug TEXT)
RETURNS JSONB AS $$
DECLARE
  tenant_id UUID;
  manager_count INTEGER;
  category_count INTEGER;
  template_count INTEGER;
  issues JSONB := '[]'::jsonb;
  score INTEGER := 0;
BEGIN
  -- Get tenant ID
  SELECT id INTO tenant_id FROM public.tenants WHERE slug = p_tenant_slug;
  
  IF tenant_id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'score', 0,
      'message', 'Tenant not found'
    );
  END IF;

  -- Check managers
  SELECT COUNT(*) INTO manager_count 
  FROM public.manager_configurations 
  WHERE tenant_id = tenant_id AND is_active = true;
  
  IF manager_count = 0 THEN
    issues := issues || '["No managers configured"]'::jsonb;
  ELSE
    score := score + 25;
  END IF;

  -- Check categories
  SELECT COUNT(*) INTO category_count 
  FROM public.category_routing_configurations 
  WHERE tenant_id = tenant_id AND is_active = true;
  
  IF category_count < 5 THEN
    issues := issues || '["Insufficient category configurations"]'::jsonb;
  ELSE
    score := score + 25;
  END IF;

  -- Check email templates
  SELECT COUNT(*) INTO template_count 
  FROM public.email_template_configurations 
  WHERE tenant_id = tenant_id AND is_active = true;
  
  IF template_count < 3 THEN
    issues := issues || '["Missing email templates"]'::jsonb;
  ELSE
    score := score + 25;
  END IF;

  -- Check primary manager exists
  IF EXISTS (
    SELECT 1 FROM public.manager_configurations 
    WHERE tenant_id = tenant_id AND is_primary = true AND is_active = true
  ) THEN
    score := score + 25;
  ELSE
    issues := issues || '["No primary manager designated"]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'valid', score >= 75,
    'score', score,
    'manager_count', manager_count,
    'category_count', category_count,
    'template_count', template_count,
    'issues', issues,
    'message', CASE 
      WHEN score = 100 THEN 'Tenant setup is complete and ready for production'
      WHEN score >= 75 THEN 'Tenant setup is mostly complete with minor issues'
      ELSE 'Tenant setup requires attention before going live'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_complete_tenant(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_tenant_qr_data(TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_tenant_setup(TEXT) TO authenticated, service_role;
