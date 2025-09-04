import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { getTenantBySlug, validateTenantComplete } from "@/utils/tenant"

export default function ResetPassword() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [tokenReady, setTokenReady] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    // Detect recovery via hash OR query OR existing session
    const params = new URLSearchParams(window.location.search)
    const hash = window.location.hash || ""
    if (hash.includes("type=recovery") || hash.includes("access_token") || params.get('recovery') === '1') {
      setTokenReady(true)
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSignedIn(true)
    }).catch(() => {})

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setTokenReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantSlug) return

    if (!password || password.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters", variant: "destructive" })
      return
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      // After successful reset, user should be signed in. Validate access and route to dashboard.
      const { data: userRes } = await supabase.auth.getUser()
      const user = userRes?.user
      if (!user) throw new Error("No user session after password reset")

      // Ensure tenant exists and access is allowed
      const tenant = await getTenantBySlug(tenantSlug)
      if (!tenant) throw new Error(`Tenant '${tenantSlug}' not found`)

      const validation = await validateTenantComplete(tenantSlug, user.id)
      if (!validation?.hasAccess) {
        toast({ title: "Access denied", description: `You do not have access to ${tenantSlug}`, variant: "destructive" })
        await supabase.auth.signOut()
        navigate(`/${tenantSlug}/auth`)
        return
      }

      // Best-effort: set tenant context (non-critical)
      try {
        await supabase.rpc('set_tenant_context', { p_tenant_id: tenant.id, p_tenant_slug: tenantSlug })
      } catch {}

      toast({ title: "Password updated", description: "Signing you in..." })
      navigate(`/${tenantSlug}/dashboard`, { replace: true })
    } catch (err: any) {
      toast({ title: "Reset failed", description: err?.message || "Please try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Reset your password</CardTitle>
          <CardDescription>
            {tokenReady ? "Enter a new password for your account" : "Open this page from the password reset email link to continue"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tokenReady ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                  />
                  <Button type="button" variant="outline" onClick={() => setShowPassword((s) => !s)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Updating...' : 'Update password'}
              </Button>
            </form>
          ) : (
            <div className="text-sm text-muted-foreground">
              Make sure you clicked the latest password reset link sent to your email.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

