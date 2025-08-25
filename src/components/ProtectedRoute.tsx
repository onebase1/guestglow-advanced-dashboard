import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * 🔄 LEGACY PROTECTED ROUTE COMPONENT
 *
 * This component is maintained for backward compatibility with legacy routes.
 * New tenant-scoped routes should use TenantAuthMiddleware instead.
 *
 * @deprecated Use TenantAuthMiddleware for new tenant-scoped routes
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      // For legacy routes, redirect to global auth
      navigate('/auth')
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}