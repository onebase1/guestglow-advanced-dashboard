-- Go-Live Configuration Dashboard Tables
-- Run this in your Supabase SQL editor to create the required tables

-- Manager Configurations Table
CREATE TABLE IF NOT EXISTS public.manager_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  department VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  whatsapp_number VARCHAR(50),
  notification_preferences JSONB DEFAULT '{"email": true, "whatsapp": false, "sms": false}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Category Routing Configurations Table
CREATE TABLE IF NOT EXISTS public.category_routing_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  feedback_category VARCHAR(100) NOT NULL,
  manager_id UUID REFERENCES public.manager_configurations(id) ON DELETE SET NULL,
  priority_level VARCHAR(20) DEFAULT 'normal' CHECK (priority_level IN ('low', 'normal', 'high', 'critical')),
  auto_escalation_hours INTEGER DEFAULT 4,
  llm_override_enabled BOOLEAN DEFAULT false,
  llm_override_conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, feedback_category)
);

-- Asset Configurations Table
CREATE TABLE IF NOT EXISTS public.asset_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('logo', 'qr_code', 'email_signature', 'letterhead', 'social_media')),
  asset_name VARCHAR(255) NOT NULL,
  asset_url TEXT,
  asset_data JSONB DEFAULT '{}',
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  file_size INTEGER,
  file_type VARCHAR(50),
  dimensions VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Template Configurations Table
CREATE TABLE IF NOT EXISTS public.email_template_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('welcome', 'follow_up', 'escalation', 'resolution', 'satisfaction')),
  template_name VARCHAR(255) NOT NULL,
  subject_line VARCHAR(255) NOT NULL,
  template_content TEXT NOT NULL,
  personalization_fields JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  language VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_manager_configurations_tenant_id ON public.manager_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_manager_configurations_is_primary ON public.manager_configurations(is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_category_routing_tenant_id ON public.category_routing_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_configurations_tenant_id ON public.asset_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_configurations_type ON public.asset_configurations(asset_type);
CREATE INDEX IF NOT EXISTS idx_email_template_configurations_tenant_id ON public.email_template_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_template_configurations_type ON public.email_template_configurations(template_type);

-- Enable RLS (Row Level Security)
ALTER TABLE public.manager_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_routing_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_configurations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic tenant isolation)
CREATE POLICY "Users can view their tenant's manager configurations" ON public.manager_configurations
  FOR SELECT USING (tenant_id IN (SELECT id FROM public.tenants WHERE slug = current_setting('app.current_tenant', true)));

CREATE POLICY "Users can manage their tenant's manager configurations" ON public.manager_configurations
  FOR ALL USING (tenant_id IN (SELECT id FROM public.tenants WHERE slug = current_setting('app.current_tenant', true)));

CREATE POLICY "Users can view their tenant's category routing" ON public.category_routing_configurations
  FOR SELECT USING (tenant_id IN (SELECT id FROM public.tenants WHERE slug = current_setting('app.current_tenant', true)));

CREATE POLICY "Users can manage their tenant's category routing" ON public.category_routing_configurations
  FOR ALL USING (tenant_id IN (SELECT id FROM public.tenants WHERE slug = current_setting('app.current_tenant', true)));

CREATE POLICY "Users can view their tenant's assets" ON public.asset_configurations
  FOR SELECT USING (tenant_id IN (SELECT id FROM public.tenants WHERE slug = current_setting('app.current_tenant', true)));

CREATE POLICY "Users can manage their tenant's assets" ON public.asset_configurations
  FOR ALL USING (tenant_id IN (SELECT id FROM public.tenants WHERE slug = current_setting('app.current_tenant', true)));

CREATE POLICY "Users can view their tenant's email templates" ON public.email_template_configurations
  FOR SELECT USING (tenant_id IN (SELECT id FROM public.tenants WHERE slug = current_setting('app.current_tenant', true)));

CREATE POLICY "Users can manage their tenant's email templates" ON public.email_template_configurations
  FOR ALL USING (tenant_id IN (SELECT id FROM public.tenants WHERE slug = current_setting('app.current_tenant', true)));

-- Insert default data for Eusbett tenant
DO $$
DECLARE
  eusbett_tenant_id UUID;
BEGIN
  -- Get Eusbett tenant ID
  SELECT id INTO eusbett_tenant_id FROM public.tenants WHERE slug = 'eusbett';
  
  IF eusbett_tenant_id IS NOT NULL THEN
    -- Insert default manager configuration
    INSERT INTO public.manager_configurations (tenant_id, name, email, phone, department, title, is_primary, whatsapp_number)
    VALUES (
      eusbett_tenant_id,
      'Test Manager',
      'g.basera@yahoo.com',
      '+44 20 1234 5678',
      'Management',
      'Guest Relations Manager',
      true,
      '+447824975049'
    ) ON CONFLICT DO NOTHING;
    
    -- Insert default category routing
    INSERT INTO public.category_routing_configurations (tenant_id, feedback_category, priority_level, auto_escalation_hours)
    VALUES 
      (eusbett_tenant_id, 'Service Quality', 'high', 2),
      (eusbett_tenant_id, 'Room Cleanliness', 'high', 2),
      (eusbett_tenant_id, 'Food & Beverage', 'normal', 4),
      (eusbett_tenant_id, 'Facilities', 'normal', 4),
      (eusbett_tenant_id, 'Staff Behavior', 'critical', 1),
      (eusbett_tenant_id, 'General Experience', 'normal', 4)
    ON CONFLICT (tenant_id, feedback_category) DO NOTHING;
    
    -- Insert default assets
    INSERT INTO public.asset_configurations (tenant_id, asset_type, asset_name, asset_url, is_primary)
    VALUES 
      (eusbett_tenant_id, 'logo', 'Primary Logo', '/lovable-uploads/c2a80098-fa71-470e-9d1e-eec01217f25a.png', true),
      (eusbett_tenant_id, 'qr_code', 'Feedback QR Code', '/api/qr-code/eusbett', true)
    ON CONFLICT DO NOTHING;
    
    -- Insert default email templates
    INSERT INTO public.email_template_configurations (tenant_id, template_type, template_name, subject_line, template_content)
    VALUES 
      (eusbett_tenant_id, 'welcome', 'Welcome Email', 'Thank you for your feedback!', 'Dear {{guest_name}},\n\nThank you for taking the time to share your experience with us.\n\nBest regards,\nThe Eusbett Team'),
      (eusbett_tenant_id, 'follow_up', 'Follow-up Email', 'Following up on your recent stay', 'Dear {{guest_name}},\n\nWe wanted to follow up on your recent feedback.\n\nBest regards,\n{{manager_name}}')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Grant necessary permissions
GRANT ALL ON public.manager_configurations TO authenticated;
GRANT ALL ON public.category_routing_configurations TO authenticated;
GRANT ALL ON public.asset_configurations TO authenticated;
GRANT ALL ON public.email_template_configurations TO authenticated;
