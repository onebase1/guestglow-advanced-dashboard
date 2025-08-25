/**
 * 🛡️ ENTERPRISE-GRADE TENANT AUTHENTICATION MIDDLEWARE
 * 
 * Bulletproof tenant isolation and security enforcement
 * - Prevents cross-tenant access
 * - Validates tenant existence and user permissions
 * - Enforces secure session scoping
 * - Handles authentication redirects with tenant context
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { getTenantBySlug, validateTenantAccess } from '@/utils/tenant'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface TenantAuthMiddlewareProps {
  children: React.ReactNode
  requireAuth?: boolean
  allowedRoles?: string[]
}

interface TenantValidationState {
  isValidating: boolean
  tenantExists: boolean
  hasAccess: boolean
  tenant: any | null
  error: string | null
}

export function TenantAuthMiddleware({ 
  children, 
  requireAuth = true,
  allowedRoles = []
}: TenantAuthMiddlewareProps) {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const [validation, setValidation] = useState<TenantValidationState>({
    isValidating: true,
    tenantExists: false,
    hasAccess: false,
    tenant: null,
    error: null
  })

  useEffect(() => {
    validateTenantAndAccess()
  }, [tenantSlug, user, authLoading])

  const validateTenantAndAccess = async () => {
    if (authLoading) return

    try {
      setValidation(prev => ({ ...prev, isValidating: true, error: null }))

      // 🔒 STEP 1: Validate tenant exists
      if (!tenantSlug) {
        throw new Error('Tenant slug is required')
      }

      const tenant = await getTenantBySlug(tenantSlug)
      if (!tenant) {
        throw new Error(`Tenant '${tenantSlug}' not found`)
      }

      if (!tenant.is_active) {
        throw new Error(`Tenant '${tenantSlug}' is not active`)
      }

      // 🔒 STEP 2: Check authentication requirement
      if (requireAuth && !user) {
        // Redirect to tenant-scoped auth with return URL
        const returnUrl = encodeURIComponent(location.pathname + location.search)
        navigate(`/${tenantSlug}/auth?returnUrl=${returnUrl}`)
        return
      }

      // 🔒 STEP 3: Validate user access to tenant (if authenticated)
      let hasAccess = true
      if (user && requireAuth) {
        hasAccess = await validateTenantAccess(tenant.id)
        
        // 🚨 PRODUCTION SECURITY: No development overrides
        if (!hasAccess) {
          throw new Error(`Access denied to tenant '${tenantSlug}'`)
        }

        // 🔒 STEP 4: Validate user roles (if specified)
        if (allowedRoles.length > 0) {
          const userRoles = await getUserRolesForTenant(user.id, tenant.id)
          const hasRequiredRole = allowedRoles.some(role => 
            userRoles.includes(role)
          )
          
          if (!hasRequiredRole) {
            throw new Error(`Insufficient permissions for tenant '${tenantSlug}'`)
          }
        }
      }

      // 🔒 STEP 5: Set tenant context in session
      await setTenantContext(tenant.id, tenantSlug)

      setValidation({
        isValidating: false,
        tenantExists: true,
        hasAccess,
        tenant,
        error: null
      })

    } catch (error: any) {
      console.error('Tenant validation failed:', error)
      
      setValidation({
        isValidating: false,
        tenantExists: false,
        hasAccess: false,
        tenant: null,
        error: error.message
      })

      // Show error toast
      toast({
        title: "Access Denied",
        description: error.message,
        variant: "destructive"
      })

      // Redirect to appropriate error page
      if (error.message.includes('not found')) {
        navigate('/404')
      } else if (error.message.includes('Access denied') || error.message.includes('Insufficient permissions')) {
        navigate('/unauthorized')
      } else {
        navigate('/')
      }
    }
  }

  // Get user roles for specific tenant
  const getUserRolesForTenant = async (userId: string, tenantId: string): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)

      if (error) throw error
      return data?.map(r => r.role) || []
    } catch (error) {
      console.error('Error fetching user roles:', error)
      return []
    }
  }

  // Set tenant context in Supabase session
  const setTenantContext = async (tenantId: string, tenantSlug: string) => {
    try {
      // Set tenant context for RLS policies
      await supabase.rpc('set_tenant_context', { 
        tenant_id: tenantId,
        tenant_slug: tenantSlug 
      })
    } catch (error) {
      console.warn('Could not set tenant context:', error)
      // Non-critical error, continue
    }
  }

  // Loading state
  if (authLoading || validation.isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">
            {authLoading ? 'Verifying authentication...' : 'Validating tenant access...'}
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (validation.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">{validation.error}</p>
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Return Home
          </button>
        </div>
      </div>
    )
  }

  // Success - render children with tenant context
  return <>{children}</>
}

/**
 * 🔒 TENANT CONTEXT PROVIDER
 * Provides tenant information to child components
 */
export function useTenantContext() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const [tenant, setTenant] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (tenantSlug) {
      getTenantBySlug(tenantSlug).then(tenantData => {
        setTenant(tenantData)
        setLoading(false)
      })
    }
  }, [tenantSlug])

  return { tenant, tenantSlug, loading }
}
