import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
// import SimpleGoLiveForm from '@/components/SimpleGoLiveForm' // Temporarily disabled
import { AppSidebar } from "@/components/AppSidebar"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  Users,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react'

export default function GoLiveConfiguration() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth')
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <AppSidebar activeTab="go-live-config" onTabChange={() => {}} />

        <SidebarInset className="flex-1">
          <header className="flex items-center justify-between h-16 border-b border-gray-200 dark:border-gray-800 px-6 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger />
              <div className="min-w-0">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  🚀 Go-Live Configuration
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Replace test data with production values
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                <Shield className="h-3 w-3 mr-1" />
                Admin Access
              </Badge>
              <Badge variant="outline" className="text-green-600 border-green-200">
                <Zap className="h-3 w-3 mr-1" />
                Live Configuration
              </Badge>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-6">
            {/* Simple Go-Live Form - Temporarily disabled due to syntax errors */}
            <div className="text-center p-8">
              <h2 className="text-xl font-semibold mb-4">Go-Live Configuration</h2>
              <p className="text-gray-600">Configuration form temporarily disabled for debugging.</p>
            </div>
            {/* <SimpleGoLiveForm /> */}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
