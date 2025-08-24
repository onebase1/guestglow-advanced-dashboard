-- SLA Tracking and Escalation Database Setup
-- Run this in your Supabase SQL editor to create SLA tracking infrastructure

-- Create escalation logs table to track escalation history
CREATE TABLE IF NOT EXISTS public.escalation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_id UUID NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  escalation_level INTEGER NOT NULL CHECK (escalation_level >= 1 AND escalation_level <= 5),
  from_manager_id UUID REFERENCES public.manager_configurations(id) ON DELETE SET NULL,
  to_manager_id UUID REFERENCES public.manager_configurations(id) ON DELETE SET NULL,
  escalation_reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT
);

-- Create SLA tracking table to monitor compliance
CREATE TABLE IF NOT EXISTS public.sla_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_id UUID NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sla_type VARCHAR(50) NOT NULL CHECK (sla_type IN ('acknowledgment', 'resolution', 'escalation')),
  target_time TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_time TIMESTAMP WITH TIME ZONE,
  is_compliant BOOLEAN,
  variance_minutes INTEGER, -- Positive = late, Negative = early
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create satisfaction survey responses table
CREATE TABLE IF NOT EXISTS public.satisfaction_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_id UUID NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  guest_email VARCHAR(255),
  satisfaction_level VARCHAR(20) CHECK (satisfaction_level IN ('very_satisfied', 'satisfied', 'neutral', 'dissatisfied')),
  additional_comments TEXT,
  response_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  survey_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_escalation_logs_feedback_id ON public.escalation_logs(feedback_id);
CREATE INDEX IF NOT EXISTS idx_escalation_logs_level ON public.escalation_logs(escalation_level);
CREATE INDEX IF NOT EXISTS idx_sla_tracking_feedback_id ON public.sla_tracking(feedback_id);
CREATE INDEX IF NOT EXISTS idx_sla_tracking_type ON public.sla_tracking(sla_type);
CREATE INDEX IF NOT EXISTS idx_sla_tracking_compliance ON public.sla_tracking(is_compliant);
CREATE INDEX IF NOT EXISTS idx_satisfaction_responses_feedback_id ON public.satisfaction_responses(feedback_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.escalation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satisfaction_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view escalation logs for their tenant" ON public.escalation_logs
  FOR SELECT USING (feedback_id IN (SELECT id FROM public.feedback WHERE id IN (SELECT id FROM public.feedback)));

CREATE POLICY "Users can view SLA tracking for their tenant" ON public.sla_tracking
  FOR SELECT USING (tenant_id IN (SELECT id FROM public.tenants WHERE slug = current_setting('app.current_tenant', true)));

CREATE POLICY "Users can view satisfaction responses for their tenant" ON public.satisfaction_responses
  FOR SELECT USING (tenant_id IN (SELECT id FROM public.tenants WHERE slug = current_setting('app.current_tenant', true)));

-- Create function to automatically set SLA targets when feedback is created
CREATE OR REPLACE FUNCTION public.set_sla_targets()
RETURNS TRIGGER AS $$
DECLARE
  tenant_uuid UUID;
  acknowledgment_target TIMESTAMP WITH TIME ZONE;
  resolution_target TIMESTAMP WITH TIME ZONE;
  escalation_hours INTEGER;
BEGIN
  -- Get tenant ID from feedback
  SELECT tenant_id INTO tenant_uuid FROM public.feedback WHERE id = NEW.id;
  
  -- Get escalation hours from category routing configuration
  SELECT auto_escalation_hours INTO escalation_hours
  FROM public.category_routing_configurations 
  WHERE tenant_id = tenant_uuid 
    AND feedback_category = NEW.issue_category 
    AND is_active = true;
  
  -- Default to 4 hours if no configuration found
  IF escalation_hours IS NULL THEN
    escalation_hours := 4;
  END IF;
  
  -- Set SLA targets
  acknowledgment_target := NEW.created_at + INTERVAL '1 hour';
  resolution_target := NEW.created_at + INTERVAL '1 hour' * escalation_hours;
  
  -- Insert SLA tracking records
  INSERT INTO public.sla_tracking (feedback_id, tenant_id, sla_type, target_time)
  VALUES 
    (NEW.id, tenant_uuid, 'acknowledgment', acknowledgment_target),
    (NEW.id, tenant_uuid, 'resolution', resolution_target);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update SLA compliance when feedback status changes
CREATE OR REPLACE FUNCTION public.update_sla_compliance()
RETURNS TRIGGER AS $$
DECLARE
  tenant_uuid UUID;
  current_time TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Get tenant ID
  SELECT tenant_id INTO tenant_uuid FROM public.feedback WHERE id = NEW.id;
  
  -- Update acknowledgment SLA if status changed to acknowledged
  IF NEW.acknowledged_at IS NOT NULL AND (OLD.acknowledged_at IS NULL OR OLD.acknowledged_at != NEW.acknowledged_at) THEN
    UPDATE public.sla_tracking 
    SET 
      actual_time = NEW.acknowledged_at,
      is_compliant = (NEW.acknowledged_at <= target_time),
      variance_minutes = EXTRACT(EPOCH FROM (NEW.acknowledged_at - target_time)) / 60,
      updated_at = current_time
    WHERE feedback_id = NEW.id AND sla_type = 'acknowledgment';
  END IF;
  
  -- Update resolution SLA if status changed to resolved
  IF NEW.resolved_at IS NOT NULL AND (OLD.resolved_at IS NULL OR OLD.resolved_at != NEW.resolved_at) THEN
    UPDATE public.sla_tracking 
    SET 
      actual_time = NEW.resolved_at,
      is_compliant = (NEW.resolved_at <= target_time),
      variance_minutes = EXTRACT(EPOCH FROM (NEW.resolved_at - target_time)) / 60,
      updated_at = current_time
    WHERE feedback_id = NEW.id AND sla_type = 'resolution';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS set_sla_targets_trigger ON public.feedback;
CREATE TRIGGER set_sla_targets_trigger
  AFTER INSERT ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.set_sla_targets();

DROP TRIGGER IF EXISTS update_sla_compliance_trigger ON public.feedback;
CREATE TRIGGER update_sla_compliance_trigger
  AFTER UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sla_compliance();

-- Create function to get SLA compliance statistics
CREATE OR REPLACE FUNCTION public.get_sla_statistics(
  p_tenant_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  sla_type VARCHAR(50),
  total_count BIGINT,
  compliant_count BIGINT,
  compliance_rate NUMERIC,
  avg_variance_minutes NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    st.sla_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE st.is_compliant = true) as compliant_count,
    ROUND(
      (COUNT(*) FILTER (WHERE st.is_compliant = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 
      2
    ) as compliance_rate,
    ROUND(AVG(st.variance_minutes), 2) as avg_variance_minutes
  FROM public.sla_tracking st
  WHERE 
    (p_tenant_id IS NULL OR st.tenant_id = p_tenant_id)
    AND st.created_at::DATE BETWEEN p_start_date AND p_end_date
    AND st.actual_time IS NOT NULL
  GROUP BY st.sla_type
  ORDER BY st.sla_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get overdue feedback items
CREATE OR REPLACE FUNCTION public.get_overdue_feedback(
  p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
  feedback_id UUID,
  guest_name VARCHAR(255),
  room_number VARCHAR(50),
  rating INTEGER,
  issue_category VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50),
  sla_type VARCHAR(50),
  target_time TIMESTAMP WITH TIME ZONE,
  hours_overdue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id as feedback_id,
    f.guest_name,
    f.room_number,
    f.rating,
    f.issue_category,
    f.created_at,
    f.status,
    st.sla_type,
    st.target_time,
    ROUND(
      EXTRACT(EPOCH FROM (NOW() - st.target_time)) / 3600, 
      2
    ) as hours_overdue
  FROM public.feedback f
  JOIN public.sla_tracking st ON f.id = st.feedback_id
  WHERE 
    (p_tenant_id IS NULL OR st.tenant_id = p_tenant_id)
    AND st.actual_time IS NULL
    AND st.target_time < NOW()
    AND f.resolved_at IS NULL
  ORDER BY hours_overdue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.set_sla_targets() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_sla_compliance() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_sla_statistics(UUID, DATE, DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_overdue_feedback(UUID) TO authenticated, service_role;

-- Insert some default manager configurations for Eusbett if they don't exist
DO $$
DECLARE
  eusbett_tenant_id UUID;
  primary_manager_id UUID;
  backup_manager_id UUID;
  gm_manager_id UUID;
BEGIN
  -- Get Eusbett tenant ID
  SELECT id INTO eusbett_tenant_id FROM public.tenants WHERE slug = 'eusbett';
  
  IF eusbett_tenant_id IS NOT NULL THEN
    -- Insert default managers if they don't exist
    INSERT INTO public.manager_configurations (tenant_id, name, email, department, title, is_primary)
    VALUES 
      (eusbett_tenant_id, 'Operations Manager', 'g.basera@yahoo.com', 'Operations', 'Operations Manager', true),
      (eusbett_tenant_id, 'Assistant Manager', 'g.basera@yahoo.com', 'Operations', 'Assistant Manager', false),
      (eusbett_tenant_id, 'General Manager', 'g.basera@yahoo.com', 'Management', 'General Manager', false)
    ON CONFLICT DO NOTHING
    RETURNING id INTO primary_manager_id;
    
    -- Update category routing to use the primary manager
    UPDATE public.category_routing_configurations 
    SET manager_id = (
      SELECT id FROM public.manager_configurations 
      WHERE tenant_id = eusbett_tenant_id AND is_primary = true 
      LIMIT 1
    )
    WHERE tenant_id = eusbett_tenant_id AND manager_id IS NULL;
  END IF;
END $$;
