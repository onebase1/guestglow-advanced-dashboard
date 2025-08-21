import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import GoLiveConfigurationDashboard from '@/components/GoLiveConfigurationDashboard'
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
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🚀 Go-Live Configuration Dashboard
              </h1>
              <p className="mt-2 text-lg text-gray-600">
                Replace test/placeholder data with production values for Eusbett Hotel
              </p>
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
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Important:</strong> This dashboard allows you to configure production settings that will 
            immediately affect the live system. Please review all changes carefully before saving.
          </AlertDescription>
        </Alert>
      </div>

      {/* Quick Start Guide */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Quick Start Guide
            </CardTitle>
            <CardDescription>
              Follow these steps to transition from test to production configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Configure Managers</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Replace test emails (g.basera@yahoo.com) with real manager contacts
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Set Category Routing</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure which manager receives emails for each feedback category
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Upload Assets</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Replace placeholder logos and update brand colors & contact info
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Personalize Templates</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Customize email templates with real manager names and titles
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <GoLiveConfigurationDashboard />
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Last updated: {new Date().toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>Configured by: {user.email}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              <span>Eusbett Hotel Configuration</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
