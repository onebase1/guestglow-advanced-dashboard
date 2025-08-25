/**
 * 🚫 UNAUTHORIZED ACCESS PAGE
 * 
 * Professional error page for access denied scenarios
 * - Clear messaging about access restrictions
 * - Helpful navigation options
 * - Tenant-aware error handling
 */

import { useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Home, LogIn, Mail } from "lucide-react"

export default function Unauthorized() {
  const navigate = useNavigate()
  const { tenantSlug } = useParams()

  const handleSignIn = () => {
    if (tenantSlug) {
      navigate(`/${tenantSlug}/auth`)
    } else {
      navigate('/auth')
    }
  }

  const handleGoHome = () => {
    navigate('/')
  }

  const handleContactSupport = () => {
    // You can customize this based on your support system
    window.location.href = 'mailto:support@guestglow.com?subject=Access Request'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Access Denied
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            You don't have permission to access this resource
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
            <p>This could be because:</p>
            <ul className="text-left space-y-1 ml-4">
              <li>• You're not signed in to the correct account</li>
              <li>• Your account doesn't have access to this tenant</li>
              <li>• Your session has expired</li>
              <li>• The tenant is not active</li>
            </ul>
          </div>
          
          <div className="space-y-3 pt-4">
            <Button 
              onClick={handleSignIn}
              className="w-full"
              variant="default"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </Button>
            
            <Button 
              onClick={handleGoHome}
              className="w-full"
              variant="outline"
            >
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
            
            <Button 
              onClick={handleContactSupport}
              className="w-full"
              variant="ghost"
            >
              <Mail className="mr-2 h-4 w-4" />
              Contact Support
            </Button>
          </div>
          
          {tenantSlug && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Tenant: <span className="font-mono">{tenantSlug}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
