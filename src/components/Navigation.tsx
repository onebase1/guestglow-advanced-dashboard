import { Link, useLocation } from "react-router-dom"
import { Button } from "./ui/button"
import { useAuth } from "@/hooks/useAuth"
import { LogOut, MessageSquare, BarChart3, Home } from "lucide-react"
import { useTenantBranding } from "@/hooks/useTenantBranding"

export function Navigation() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const branding = useTenantBranding()

  const handleSignOut = async () => {
    await signOut()
  }

  const tenantSlug = location.pathname.split('/').filter(Boolean)[0]


  return (
    <nav className="bg-card border-b border-border px-4 py-3">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Navigation links removed - now handled by sidebar */}

          {branding.isEusbett ? (
            <div className="flex items-center gap-3">
              <img
                src={branding.logoUrl}
                alt={branding.name}
                className="h-8 w-auto"
              />
              <div className="text-xl font-bold text-primary">
                {branding.name} Dashboard
              </div>
            </div>
          ) : (
            <div className="text-xl font-bold text-foreground">
              Hotel Dashboard
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {user ? (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {user.email}
              </span>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Link to="/auth">
              <Button variant="outline" size="sm">
                Staff Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}