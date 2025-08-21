import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { getCurrentUserTenant } from "@/utils/tenant"
import { supabase } from "@/integrations/supabase/client"
import { useTenantBranding } from "@/hooks/useTenantBranding"

// Toggle this to enable/disable new signups
const SIGNUPS_ENABLED = true

export default function Auth() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const branding = useTenantBranding()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast({
        title: "Please fill in all fields",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const { error } = await signIn(email, password)
      if (error) throw error
      
      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully."
      })

      // Try to get user's tenant and redirect to tenant-specific dashboard
      try {
        const tenantId = await getCurrentUserTenant()
        if (tenantId) {
          // Get tenant slug to build proper URL
          const { data: tenant } = await supabase
            .from('tenants')
            .select('slug')
            .eq('id', tenantId)
            .single()

          if (tenant?.slug) {
            navigate(`/${tenant.slug}/dashboard`)
          } else {
            // Fallback to legacy dashboard
            navigate('/dashboard')
          }
        } else {
          // Fallback to legacy dashboard
          navigate('/dashboard')
        }
      } catch (error) {
        console.error('Error getting user tenant:', error)
        // Fallback to legacy dashboard
        navigate('/dashboard')
      }
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
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

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
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
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-2 border-border shadow-2xl backdrop-blur-sm">
        <CardHeader className="text-center space-y-6">
          <div className="flex justify-center">
            <img
              src={branding.logoUrl}
              alt={`${branding.name} Logo`}
              className={branding.isEusbett ? "h-32 w-auto" : "h-64 w-auto brightness-110 contrast-125"}
            />
          </div>
          <div className="space-y-2">
            <CardTitle className={`text-xl ${branding.isEusbett ? 'text-primary' : 'text-foreground'}`}>
              {branding.isEusbett ? `${branding.name} Management Portal` : 'Hotel Management Portal'}
            </CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">
            Access your reputation management dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="space-y-4">
            <TabsList className={`grid w-full ${SIGNUPS_ENABLED ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              {SIGNUPS_ENABLED && <TabsTrigger value="signup">Sign Up</TabsTrigger>}
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="manager@hotel.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            
            {SIGNUPS_ENABLED ? (
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="manager@hotel.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Choose a strong password"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  New signups are currently disabled.
                </p>
              </div>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}