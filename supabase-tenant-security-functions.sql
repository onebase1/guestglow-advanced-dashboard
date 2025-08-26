-- 🛡️ ENTERPRISE-GRADE TENANT SECURITY FUNCTIONS
-- These functions provide bulletproof tenant isolation and security

-- Function to set tenant context for RLS policies
CREATE OR REPLACE FUNCTION public.set_tenant_context(
  tenant_id UUID,
  tenant_slug TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Set tenant context for current session
  PERFORM set_config('app.current_tenant_id', tenant_id::text, true);
  PERFORM set_config('app.current_tenant_slug', tenant_slug, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current tenant context
CREATE OR REPLACE FUNCTION public.get_current_tenant_context()
RETURNS TABLE(tenant_id UUID, tenant_slug TEXT) AS $$
BEGIN
  RETURN QUERY SELECT 
    COALESCE(current_setting('app.current_tenant_id', true), '')::UUID,
    COALESCE(current_setting('app.current_tenant_slug', true), '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate user access to tenant with detailed logging
CREATE OR REPLACE FUNCTION public.validate_user_tenant_access(
  p_user_id UUID,
  p_tenant_id UUID
)
RETURNS JSONB AS $$
DECLARE
  user_roles_count INTEGER;
  tenant_active BOOLEAN;
  user_roles TEXT[];
  result JSONB;
BEGIN
  -- Check if tenant exists and is active
  SELECT is_active INTO tenant_active 
  FROM public.tenants 
  WHERE id = p_tenant_id;
  
  IF tenant_active IS NULL THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'reason', 'tenant_not_found',
      'tenant_id', p_tenant_id,
      'user_id', p_user_id
    );
  END IF;
  
  IF NOT tenant_active THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'reason', 'tenant_inactive',
      'tenant_id', p_tenant_id,
      'user_id', p_user_id
    );
  END IF;
  
  -- Get user roles for this tenant
  SELECT 
    COUNT(*),
    ARRAY_AGG(role)
  INTO user_roles_count, user_roles
  FROM public.user_roles 
  WHERE user_id = p_user_id 
    AND tenant_id = p_tenant_id 
    AND is_active = true;
  
  -- Build result
  result := jsonb_build_object(
    'has_access', user_roles_count > 0,
    'reason', CASE 
      WHEN user_roles_count > 0 THEN 'authorized'
      ELSE 'no_roles'
    END,
    'tenant_id', p_tenant_id,
    'user_id', p_user_id,
    'roles', COALESCE(user_roles, ARRAY[]::TEXT[]),
    'role_count', user_roles_count
  );
  
  -- Log access attempt (optional - for security auditing)
  INSERT INTO public.access_logs (
    user_id, 
    tenant_id, 
    access_granted, 
    access_reason,
    created_at
  ) VALUES (
    p_user_id,
    p_tenant_id,
    user_roles_count > 0,
    result->>'reason',
    NOW()
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  -- Return safe error response
  RETURN jsonb_build_object(
    'has_access', false,
    'reason', 'validation_error',
    'error', SQLERRM,
    'tenant_id', p_tenant_id,
    'user_id', p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's accessible tenants
CREATE OR REPLACE FUNCTION public.get_user_accessible_tenants(p_user_id UUID)
RETURNS TABLE(
  tenant_id UUID,
  tenant_name TEXT,
  tenant_slug TEXT,
  user_roles TEXT[],
  is_primary BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.slug,
    ARRAY_AGG(ur.role) as roles,
    BOOL_OR(ur.is_primary) as is_primary
  FROM public.tenants t
  INNER JOIN public.user_roles ur ON t.id = ur.tenant_id
  WHERE ur.user_id = p_user_id
    AND ur.is_active = true
    AND t.is_active = true
  GROUP BY t.id, t.name, t.slug
  ORDER BY BOOL_OR(ur.is_primary) DESC, t.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's accessible tenants by email (for smart auth)
CREATE OR REPLACE FUNCTION public.get_user_tenants_by_email(p_email TEXT)
RETURNS TABLE(
  tenant_id UUID,
  tenant_name TEXT,
  tenant_slug TEXT,
  user_roles TEXT[],
  is_primary BOOLEAN
) AS $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Get user UUID from auth.users by email
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = p_email;

  -- If user not found, return empty result
  IF user_uuid IS NULL THEN
    RETURN;
  END IF;

  -- Return user's accessible tenants
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.slug,
    ARRAY_AGG(ur.role) as roles,
    BOOL_OR(ur.is_primary) as is_primary
  FROM public.tenants t
  INNER JOIN public.user_roles ur ON t.id = ur.tenant_id
  WHERE ur.user_id = user_uuid
    AND ur.is_active = true
    AND t.is_active = true
  GROUP BY t.id, t.name, t.slug
  ORDER BY BOOL_OR(ur.is_primary) DESC, t.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create access logs table for security auditing
CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  access_granted BOOLEAN NOT NULL,
  access_reason TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_access_logs_user_tenant ON public.access_logs(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON public.access_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_access_logs_access_granted ON public.access_logs(access_granted);

-- Enable RLS on access logs
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy for access logs (users can only see their own logs)
CREATE POLICY "Users can view their own access logs" ON public.access_logs
  FOR SELECT USING (user_id = auth.uid());

-- Enhanced RLS policies for existing tables with tenant context
DROP POLICY IF EXISTS "Users can view their tenant's feedback" ON public.feedback;
CREATE POLICY "Users can view their tenant's feedback" ON public.feedback
  FOR SELECT USING (
    tenant_id = COALESCE(current_setting('app.current_tenant_id', true), '')::UUID
    AND tenant_id IN (
      SELECT ur.tenant_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
        AND ur.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can manage their tenant's feedback" ON public.feedback;
CREATE POLICY "Users can manage their tenant's feedback" ON public.feedback
  FOR ALL USING (
    tenant_id = COALESCE(current_setting('app.current_tenant_id', true), '')::UUID
    AND tenant_id IN (
      SELECT ur.tenant_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
        AND ur.is_active = true
    )
  );

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.set_tenant_context(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_tenant_context() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_user_tenant_access(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_accessible_tenants(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_tenants_by_email(TEXT) TO authenticated, anon, service_role;

-- Grant table permissions
GRANT SELECT, INSERT ON public.access_logs TO authenticated, service_role;

-- Create a function to clean up old access logs (optional maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_old_access_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.access_logs 
  WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.cleanup_old_access_logs(INTEGER) TO service_role;

-- Add helpful comments
COMMENT ON FUNCTION public.set_tenant_context(UUID, TEXT) IS 'Sets tenant context for RLS policies in current session';
COMMENT ON FUNCTION public.validate_user_tenant_access(UUID, UUID) IS 'Validates user access to tenant with detailed logging';
COMMENT ON FUNCTION public.get_user_accessible_tenants(UUID) IS 'Returns all tenants accessible to a user';
COMMENT ON TABLE public.access_logs IS 'Security audit log for tenant access attempts';
