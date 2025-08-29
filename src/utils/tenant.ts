import { supabase } from '@/integrations/supabase/client'

export interface Tenant {
  id: string
  name: string
  slug: string
  logo_url?: string
  primary_color: string
  secondary_color: string
  contact_email: string
  contact_phone?: string
  is_active: boolean
}

// Get tenant information from URL path or default to Eusbett
export const getCurrentTenantSlug = (): string => {
  const path = window.location.pathname

  // Check for tenant-specific URLs like /eusbett/quick-feedback
  const tenantMatch = path.match(/^\/([^\/]+)\//)
  if (tenantMatch && tenantMatch[1] !== 'dashboard' && tenantMatch[1] !== 'auth' && tenantMatch[1] !== 'marketing') {
    return tenantMatch[1]
  }

  // Check for query parameter
  const urlParams = new URLSearchParams(window.location.search)
  const tenantParam = urlParams.get('tenant')
  if (tenantParam) {
    return tenantParam
  }

  // Default to Eusbett for now
  return 'eusbett'
}

// Get tenant slug from React Router params (for components using useParams)
export const getTenantSlugFromParams = (params: { tenantSlug?: string }): string => {
  return params.tenantSlug || getCurrentTenantSlug()
}

// Get tenant information by slug
export const getTenantBySlug = async (slug: string): Promise<Tenant | null> => {
  try {
    try {
      const { data, error } = await supabase.rpc('get_tenant_by_slug', { p_slug: slug })

      if (error) {
        console.warn('Database function get_tenant_by_slug not available, using default tenant data')
        // Return default tenant data for development
        if (slug === 'eusbett' || slug === DEFAULT_TENANT.slug) {
          return DEFAULT_TENANT
        }
        return null
      }

      return data && data.length > 0 ? data[0] : null
    } catch (dbError) {
      console.warn('Database function get_tenant_by_slug not available, using default tenant data')
      // Return default tenant data for development
      if (slug === 'eusbett' || slug === DEFAULT_TENANT.slug) {
        return DEFAULT_TENANT
      }
      return null
    }
  } catch (error) {
    console.error('Error fetching tenant:', error)
    return null
  }
}

// Submit feedback with tenant context
export const submitFeedbackWithTenant = async (
  tenantSlug: string,
  feedbackData: {
    guestName?: string
    guestEmail?: string
    roomNumber?: string
    checkInDate?: string
    checkOutDate?: string
    rating: number
    feedbackText: string
    issueCategory: string
    wouldRecommend?: boolean
    source: string
  }
): Promise<string> => {
  try {
    // 1. Insert feedback into database
    const { data: feedbackId, error } = await supabase.rpc('insert_feedback_with_tenant', {
      p_tenant_slug: tenantSlug,
      p_guest_name: feedbackData.guestName || 'Anonymous Guest',
      p_guest_email: feedbackData.guestEmail || null,
      p_room_number: feedbackData.roomNumber || null,
      p_check_in_date: feedbackData.checkInDate || null,
      p_check_out_date: feedbackData.checkOutDate || null,
      p_rating: feedbackData.rating,
      p_feedback_text: feedbackData.feedbackText,
      p_issue_category: feedbackData.issueCategory,
      p_would_recommend: feedbackData.wouldRecommend || null,
      p_source: feedbackData.source
    })

    if (error) throw error

    // 2. Get tenant info for email generation
    const tenant = await getTenantBySlug(tenantSlug)
    if (!tenant) {
      console.warn(`Tenant not found for slug: ${tenantSlug}, using default`)
    }

    // 3. Trigger email generation (non-blocking to avoid slowing down form submission)
    setTimeout(async () => {
      try {
        console.log('📧 Triggering email generation for feedback:', feedbackId)
        const { error: emailError } = await supabase.functions.invoke('generate-feedback-emails', {
          body: {
            feedback_id: feedbackId,
            guest_name: feedbackData.guestName || 'Anonymous Guest',
            guest_email: feedbackData.guestEmail || null,
            room_number: feedbackData.roomNumber || null,
            rating: feedbackData.rating,
            feedback_text: feedbackData.feedbackText,
            issue_category: feedbackData.issueCategory,
            check_in_date: feedbackData.checkInDate || null,
            tenant_id: tenant?.id || 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Fallback to Eusbett
            tenant_slug: tenantSlug
          }
        })

        if (emailError) {
          console.error('❌ Email generation failed (non-critical):', emailError)
        } else {
          console.log('✅ Email generation triggered successfully')
        }
      } catch (error) {
        console.error('❌ Email generation error (non-critical):', error)
      }
    }, 100) // Small delay to ensure feedback is committed to database

    return feedbackId
  } catch (error) {
    console.error('Error submitting feedback:', error)
    throw error
  }
}

// Get current user's tenant (for authenticated users)
export const getCurrentUserTenant = async (): Promise<string | null> => {
  try {
    // Check if user is authenticated first
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return null // No authenticated user
    }

    // For now, return a default tenant ID since the database function might not exist
    // In production, this would call the database function
    try {
      const { data, error } = await supabase.rpc('get_current_user_tenant')

      if (error) {
        console.warn('Database function get_current_user_tenant not available, using default tenant')
        return DEFAULT_TENANT.id
      }

      return data || DEFAULT_TENANT.id
    } catch (dbError) {
      console.warn('Database function get_current_user_tenant not available, using default tenant')
      return DEFAULT_TENANT.id
    }
  } catch (error) {
    console.error('Error fetching user tenant:', error)
    return null
  }
}

// Apply tenant branding to the page
export const applyTenantBranding = (tenant: Tenant) => {
  // Update CSS custom properties for theming
  const root = document.documentElement
  root.style.setProperty('--tenant-primary', tenant.primary_color)
  root.style.setProperty('--tenant-secondary', tenant.secondary_color)
  
  // Update page title
  document.title = `${tenant.name} – Quick Feedback`

  // Update favicon if logo_url is available
  if (tenant.logo_url) {
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
    if (favicon) {
      favicon.href = tenant.logo_url
    }
  }
}

// Generate tenant-specific URLs
export const getTenantUrl = (tenant: Tenant, path: string = ''): string => {
  try {
    const { getPublicBaseUrl } = require('@/utils/config')
    const baseUrl = getPublicBaseUrl()
    return `${baseUrl}/${tenant.slug}${path}`
  } catch {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080'
    return `${baseUrl}/${tenant.slug}${path}`
  }
}

// Get QR code URL for tenant
export const getQRCodeUrl = (tenant: Tenant, area?: string): string => {
  try {
    const { getPublicBaseUrl } = require('@/utils/config')
    const baseUrl = getPublicBaseUrl()
    const basePath = `${baseUrl}/${tenant.slug}/quick-feedback`
    return area ? `${basePath}?area=${encodeURIComponent(area)}` : basePath
  } catch {
    const basePath = `/${tenant.slug}/quick-feedback`
    return area ? `${basePath}?area=${encodeURIComponent(area)}` : basePath
  }
}

// 🛡️ ENTERPRISE-GRADE TENANT ACCESS VALIDATION
export const validateTenantAccess = async (tenantId: string): Promise<boolean> => {
  try {
    // Check if user is authenticated first
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return false // No authenticated user, no access
    }

    try {
      // Use the database function for validation
      const { data, error } = await supabase.rpc('validate_user_tenant_access', {
        p_user_id: user.id,
        p_tenant_id: tenantId
      })

      if (error) {
        console.error('Failed to validate tenant access:', error)
        return false
      }

      return data === true
    } catch (dbError) {
      // Fallback to direct table query if function not available
      console.warn('Database function not available, using direct query')

      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId)

      if (error) {
        console.error('Database error during tenant validation:', dbError)
        return false
      }

      // User must have at least one role for this tenant
      return userRoles && userRoles.length > 0
    }
  } catch (error) {
    console.error('Error validating tenant access:', error)
    return false
  }
}

// 🚀 OPTIMIZED SINGLE-CALL TENANT VALIDATION (PERFORMANCE OPTIMIZED)
export const validateTenantComplete = async (
  tenantSlug: string,
  userId?: string,
  requiredRoles: string[] = []
): Promise<{
  success: boolean;
  tenantExists: boolean;
  hasAccess: boolean;
  tenant?: Tenant;
  userRoles?: string[];
  error?: string;
}> => {
  try {
    const { data, error } = await supabase.rpc('validate_tenant_complete', {
      p_tenant_slug: tenantSlug,
      p_user_id: userId || null,
      p_required_roles: requiredRoles
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Tenant validation error:', error);
    return {
      success: false,
      tenantExists: false,
      hasAccess: false,
      error: error.message
    };
  }
};

// 🔒 ENHANCED TENANT ACCESS VALIDATION WITH ROLE CHECKING (LEGACY - USE validateTenantComplete INSTEAD)
export const validateTenantAccessWithRoles = async (
  tenantId: string,
  requiredRoles: string[] = []
): Promise<{ hasAccess: boolean; userRoles: string[] }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { hasAccess: false, userRoles: [] }
    }

    const { data: userRoles, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Failed to validate tenant access with roles:', error)
      return { hasAccess: false, userRoles: [] }
    }

    const roles = userRoles?.map(r => r.role) || []
    const hasAccess = roles.length > 0

    // Check if user has required roles (if specified)
    const hasRequiredRoles = requiredRoles.length === 0 ||
      requiredRoles.some(role => roles.includes(role))

    return {
      hasAccess: hasAccess && hasRequiredRoles,
      userRoles: roles
    }
  } catch (error) {
    console.error('Error validating tenant access with roles:', error)
    return { hasAccess: false, userRoles: [] }
  }
}

// Default tenant configuration for Eusbett
// 🔒 SAFE FALLBACK: Using system fallback email to prevent accidental client emails
export const DEFAULT_TENANT: Tenant = {
  id: '',
  name: 'Eusbett Hotel',
  slug: 'eusbett',
  // Brand colors from Eusbett logo
  primary_color: '#003D7A', // Navy blue (main brand color)
  secondary_color: '#E74C3C', // Red accent
  logo_url: '/eusbett-logo.svg',
  contact_email: 'system-fallback@guest-glow.com', // SAFE: System fallback - no real client emails
  contact_phone: '+233 24 479 9348',
  is_active: true
}
