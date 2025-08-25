/**
 * 🔐 TENANT-SCOPED AUTHENTICATION PAGE
 * 
 * Secure authentication with tenant isolation
 * - Validates tenant before showing auth form
 * - Prevents cross-tenant authentication
 * - Handles secure redirects with tenant context
 * - Implements tenant-specific branding
 */

import { useState, useEffect } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { getTenantBySlug, validateTenantAccess } from "@/utils/tenant"
import { supabase } from "@/integrations/supabase/client"
import { useTenantBranding } from "@/hooks/useTenantBranding"

// Toggle this to enable/disable new signups
const SIGNUPS_ENABLED = true

interface TenantAuthState {
  tenant: any | null
  loading: boolean
  error: string | null
}

export default function TenantAuth() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const [searchParams] = useSearchParams()
  const returnUrl = searchParams.get('returnUrl')
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authLoading, setAuthLoading] = useState(false)
  const [tenantState, setTenantState] = useState<TenantAuthState>({
    tenant: null,
    loading: true,
    error: null
  })

  const { signIn, signUp, user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const branding = useTenantBranding()

  // Validate tenant on component mount
  useEffect(() => {
    validateTenant()
  }, [tenantSlug])

  // Redirect if already authenticated
  useEffect(() => {
    if (user && tenantState.tenant) {
      handleAuthenticatedRedirect()
    }
  }, [user, tenantState.tenant])

  const validateTenant = async () => {
    if (!tenantSlug) {
      setTenantState({
        tenant: null,
        loading: false,
        error: 'Tenant slug is required'
      })
      return
    }

    try {
      const tenant = await getTenantBySlug(tenantSlug)
      
      if (!tenant) {
        setTenantState({
          tenant: null,
          loading: false,
          error: `Tenant '${tenantSlug}' not found`
        })
        return
      }

      if (!tenant.is_active) {
        setTenantState({
          tenant: null,
          loading: false,
          error: `Tenant '${tenantSlug}' is not active`
        })
        return
      }

      setTenantState({
        tenant,
        loading: false,
        error: null
      })

    } catch (error: any) {
      console.error('Tenant validation failed:', error)
      setTenantState({
        tenant: null,
        loading: false,
        error: error.message || 'Failed to validate tenant'
      })
    }
  }

  const handleAuthenticatedRedirect = async () => {
    if (!user || !tenantState.tenant) return

    try {
      // Validate user has access to this tenant
      const hasAccess = await validateTenantAccess(tenantState.tenant.id)
      
      if (!hasAccess) {
        toast({
          title: "Access Denied",
          description: `You don't have access to ${tenantState.tenant.name}`,
          variant: "destructive"
        })
        
        // Sign out and stay on auth page
        await supabase.auth.signOut()
        return
      }

      // Set tenant context
      await supabase.rpc('set_tenant_context', { 
        tenant_id: tenantState.tenant.id,
        tenant_slug: tenantSlug 
      })

      // Redirect to return URL or tenant dashboard
      const targetUrl = returnUrl || `/${tenantSlug}/dashboard`
      navigate(targetUrl)

    } catch (error: any) {
      console.error('Redirect validation failed:', error)
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast({
        title: "Please fill in all fields",
        variant: "destructive"
      })
      return
    }

    if (!tenantState.tenant) {
      toast({
        title: "Tenant validation required",
        description: "Please wait for tenant validation to complete",
        variant: "destructive"
      })
      return
    }

    setAuthLoading(true)
    try {
      const { error } = await signIn(email, password)
      if (error) throw error
      
      toast({
        title: "Welcome back!",
        description: `Signed in to ${tenantState.tenant.name}`
      })

      // handleAuthenticatedRedirect will be called by useEffect

    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive"
      })
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast({
        title: "Please fill in all fields",
        variant: "destructive"
      })
      return
    }

    if (!tenantState.tenant) {
      toast({
        title: "Tenant validation required",
        description: "Please wait for tenant validation to complete",
        variant: "destructive"
      })
      return
    }

    setAuthLoading(true)
    try {
      const { error } = await signUp(email, password)
      if (error) throw error
      
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account."
      })

    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      })
    } finally {
      setAuthLoading(false)
    }
  }

  // Loading state
  if (tenantState.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Validating tenant...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (tenantState.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold mb-2">Tenant Not Found</h1>
          <p className="text-muted-foreground mb-4">{tenantState.error}</p>
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

  const tenant = tenantState.tenant!

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {tenant.logo_url && (
            <img 
              src={tenant.logo_url} 
              alt={`${tenant.name} logo`}
              className="h-12 mx-auto mb-4"
            />
          )}
          <CardTitle className="text-2xl font-bold" style={{ color: tenant.primary_color }}>
            {tenant.name}
          </CardTitle>
          <CardDescription>
            Sign in to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              {SIGNUPS_ENABLED && <TabsTrigger value="signup">Sign Up</TabsTrigger>}
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={authLoading}
                  style={{ backgroundColor: tenant.primary_color }}
                >
                  {authLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            
            {SIGNUPS_ENABLED && (
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={authLoading}
                    style={{ backgroundColor: tenant.primary_color }}
                  >
                    {authLoading ? "Creating account..." : "Sign Up"}
                  </Button>
                </form>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
