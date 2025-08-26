/**
 * 🎯 SMART AUTHENTICATION COMPONENT
 * 
 * Solves the UX problem with intelligent email-first authentication:
 * 1. User enters email first
 * 2. System looks up which tenants they have access to
 * 3. If single tenant: auto-redirect to tenant auth
 * 4. If multiple tenants: show tenant selection
 * 5. If no tenants: show helpful message
 */

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Building2, ArrowRight, Mail, Users } from "lucide-react"

interface UserTenant {
  tenant_id: string
  tenant_name: string
  tenant_slug: string
  user_roles: string[]
  is_primary: boolean
}

interface SmartAuthState {
  step: 'email' | 'tenant-selection' | 'loading'
  email: string
  tenants: UserTenant[]
  loading: boolean
  error: string | null
}

export function SmartAuth() {
  const [state, setState] = useState<SmartAuthState>({
    step: 'email',
    email: '',
    tenants: [],
    loading: false,
    error: null
  })

  const { toast } = useToast()
  const navigate = useNavigate()

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!state.email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive"
      })
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Use a database function to look up user tenants by email
      const { data: tenants, error: tenantsError } = await supabase.rpc('get_user_tenants_by_email', {
        p_email: state.email
      })

      if (tenantsError) {
        console.error('Error fetching user tenants:', tenantsError)
        setState(prev => ({
          ...prev,
          loading: false,
          error: "No account found with this email. Please contact your hotel administrator to get access."
        }))
        return
      }

      if (!tenants || tenants.length === 0) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: "No account found with this email. Please contact your hotel administrator to get access."
        }))
        return
      }

      if (tenants.length === 1) {
        // Single tenant - redirect directly
        const tenant = tenants[0]
        toast({
          title: "Redirecting...",
          description: `Taking you to ${tenant.tenant_name}`
        })
        navigate(`/${tenant.tenant_slug}/auth?email=${encodeURIComponent(state.email)}`)
      } else {
        // Multiple tenants - show selection
        setState(prev => ({
          ...prev,
          step: 'tenant-selection',
          tenants,
          loading: false
        }))
      }

    } catch (error: any) {
      console.error('Smart auth error:', error)
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: "Something went wrong. Please try again." 
      }))
    }
  }

  const handleTenantSelect = (tenant: UserTenant) => {
    toast({
      title: "Redirecting...",
      description: `Taking you to ${tenant.tenant_name}`
    })
    navigate(`/${tenant.tenant_slug}/auth?email=${encodeURIComponent(state.email)}`)
  }

  const handleBackToEmail = () => {
    setState(prev => ({
      ...prev,
      step: 'email',
      tenants: [],
      error: null
    }))
  }

  if (state.step === 'email') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
              <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Hotel Staff Sign In
            </CardTitle>
            <CardDescription>
              Enter your email to access your hotel dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your work email"
                  value={state.email}
                  onChange={(e) => setState(prev => ({ ...prev, email: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
              
              {state.error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                  {state.error}
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={state.loading}
              >
                {state.loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Checking access...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>Need access? Contact your hotel administrator</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state.step === 'tenant-selection') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Select Your Hotel
            </CardTitle>
            <CardDescription>
              You have access to multiple hotels. Choose one to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Signed in as: <span className="font-medium">{state.email}</span>
            </div>
            
            {state.tenants.map((tenant) => (
              <button
                key={tenant.tenant_id}
                onClick={() => handleTenantSelect(tenant)}
                className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {tenant.tenant_name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {tenant.user_roles.join(', ')}
                      {tenant.is_primary && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          Primary
                        </span>
                      )}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </button>
            ))}
            
            <Button 
              variant="outline" 
              onClick={handleBackToEmail}
              className="w-full mt-4"
            >
              Use Different Email
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
