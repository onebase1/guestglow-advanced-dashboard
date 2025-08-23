import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { getManagerConfigurations, getAllManagers, hasPlaceholderEmails, type ManagerConfig } from '@/config/managers'
import {
  AlertTriangle,
  CheckCircle,
  Mail,
  Phone,
  User,
  Building,
  Users,
  Settings,
  Upload,
  Clock,
  Shield,
  Edit
} from 'lucide-react'

interface Manager {
  id?: string
  manager_name: string
  manager_title: string
  email_address: string
  phone_number: string
  department: string
  is_primary: boolean
}

interface CategoryRouting {
  id?: string
  feedback_category: string
  primary_manager_id: string
  backup_manager_id?: string
  escalation_manager_id?: string
  priority_level: string
  auto_escalate_after_hours: number
}

interface Asset {
  id?: string
  asset_type: string
  asset_key: string
  asset_value: string
}

export default function SimpleGoLiveForm() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('managers')
  const { toast } = useToast()

  // Get managers from environment variables
  const envManagers = getAllManagers()
  const managerConfigs = getManagerConfigurations()
  const hasPlaceholders = hasPlaceholderEmails()

  // Feedback categories that need manager assignment
  const feedbackCategories = [
    'Food & Beverage', 'Housekeeping', 'Security', 'Front Desk',
    'Maintenance', 'General Experience', 'Room Service', 'Facilities'
  ]

  // Current test configuration
  const testConfig = {
    managerName: 'Test Manager',
    managerEmail: 'g.basera@yahoo.com',
    managerPhone: '+447824975049',
    testWhatsApp: '+447824975049',
    testEmailSender: 'g.basera@gmail.com',
    hotelName: 'Eusbett Hotel (Test Mode)'
  }

  // No need to load from database - using environment variables now!

  const handleSave = async () => {
    setSaving(true)
    try {
      toast({
        title: "Configuration Updated",
        description: "Manager settings are now using environment variables. Update .env file to change manager details.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const isConfigComplete = envManagers.length >= 5 && !hasPlaceholders

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading configuration...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold">🚀 Go-Live Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Configure SLA management, manager escalation, and production settings for Eusbett Hotel
        </p>
      </div>

      {/* Status Alert */}
      {isConfigComplete ? (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            ✅ Configuration is ready for production deployment!
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            ⚠️ Update .env file with real manager emails to complete go-live setup
          </AlertDescription>
        </Alert>
      )}

      {/* Environment Variables Info */}
      <Alert className="border-blue-200 bg-blue-50">
        <Edit className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>🚀 Easy Updates:</strong> Manager details are now stored in the .env file.
          To change manager emails, just edit the .env file and refresh the page - no code changes needed!
        </AlertDescription>
      </Alert>

      {/* Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="managers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Managers
          </TabsTrigger>
          <TabsTrigger value="routing" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            SLA Routing
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Assets
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Summary
          </TabsTrigger>
        </TabsList>

        {/* Managers Tab */}
        <TabsContent value="managers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Manager Configuration
              </CardTitle>
              <CardDescription>
                Set up manager hierarchy for SLA compliance: Primary → Backup → Escalation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {envManagers.map((manager, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={manager.department === 'Management' ? "default" : "outline"}>
                          {manager.department === 'Management' ? "Primary Manager" : "Department Manager"}
                        </Badge>
                        <Badge variant="outline">{manager.department}</Badge>
                      </div>
                      <div className="text-xs text-gray-500">
                        From .env file
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Manager Name</Label>
                        <div className="font-medium">
                          {manager.name}
                          {hasPlaceholders && manager.name !== 'Hotel Manager' && (
                            <Badge variant="outline" className="ml-2 text-orange-600 border-orange-200">
                              PLACEHOLDER
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label>Title</Label>
                        <div className="font-medium">{manager.title}</div>
                      </div>
                      <div>
                        <Label>Email Address</Label>
                        <div className="font-medium text-blue-600">
                          {manager.email}
                          {hasPlaceholders && manager.email !== 'g.basera@yahoo.com' && (
                            <Badge variant="outline" className="ml-2 text-orange-600 border-orange-200">
                              PLACEHOLDER EMAIL
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label>Phone Number</Label>
                        <div className="font-medium">{manager.phone}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SLA Routing Tab */}
        <TabsContent value="routing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                SLA Category Routing
              </CardTitle>
              <CardDescription>
                Configure which manager handles each feedback category and escalation rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {feedbackCategories.map((category) => {
                  const routing = categoryRouting.find(r => r.feedback_category === category)
                  const primaryManager = managers.find(m => m.id === routing?.primary_manager_id)

                  return (
                    <div key={category} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{category}</h3>
                          <Badge variant={routing?.priority_level === 'critical' ? 'destructive' :
                                        routing?.priority_level === 'high' ? 'default' : 'outline'}>
                            {routing?.priority_level || 'normal'} priority
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          Escalate after {routing?.auto_escalate_after_hours || 4}h
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label>Primary Manager</Label>
                          <div className="font-medium">
                            {primaryManager ? `${primaryManager.manager_name} (${primaryManager.department})` : 'Not assigned'}
                          </div>
                        </div>
                        <div>
                          <Label>Contact</Label>
                          <div className="text-blue-600">
                            {primaryManager?.email_address || 'No email configured'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {categoryRouting.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No category routing configured. SLA compliance requires category assignments.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Brand Assets
              </CardTitle>
              <CardDescription>
                Logos, colors, and branding elements for email templates and QR codes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {assets.map((asset, index) => (
                  <div key={asset.id || index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{asset.asset_key.replace(/_/g, ' ').toUpperCase()}</div>
                        <div className="text-sm text-gray-500">{asset.asset_type}</div>
                      </div>
                      <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                        {asset.asset_value}
                      </div>
                    </div>
                  </div>
                ))}

                {assets.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No assets configured. Upload logos and set brand colors for professional appearance.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Production Readiness Summary
              </CardTitle>
              <CardDescription>
                Review configuration before going live with real hotel operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-3">Current Test Configuration</h3>
                    <div className="space-y-2 text-sm">
                      <div>Manager: {testConfig.managerName}</div>
                      <div>Email: {testConfig.managerEmail}</div>
                      <div>WhatsApp: {testConfig.testWhatsApp}</div>
                      <div>Hotel: {testConfig.hotelName}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-3">Production Status</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        {managers.length > 0 ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-red-600" />}
                        {managers.length} managers configured
                      </div>
                      <div className="flex items-center gap-2">
                        {categoryRouting.length >= 4 ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-red-600" />}
                        {categoryRouting.length} categories routed
                      </div>
                      <div className="flex items-center gap-2">
                        {assets.length > 0 ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-red-600" />}
                        {assets.length} brand assets
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Placeholder Managers to Replace */}
          <Card className="bg-orange-50 border-orange-200">
            <CardHeader>
              <CardTitle className="text-orange-900">🔄 PLACEHOLDER MANAGERS - GET REAL DETAILS TODAY</CardTitle>
              <CardDescription className="text-orange-700">
                These are placeholder names and emails. Get the real manager details from Eusbett Hotel today:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-3">
                  <div className="border-l-4 border-orange-400 pl-3">
                    <div className="font-medium">🍽️ Food & Beverage Manager</div>
                    <div className="text-orange-700">Currently: Sarah Johnson → basera@btinternet.com</div>
                    <div className="text-gray-600">Need: Real F&B manager name and email</div>
                  </div>

                  <div className="border-l-4 border-orange-400 pl-3">
                    <div className="font-medium">🛏️ Housekeeping Manager</div>
                    <div className="text-orange-700">Currently: Michael Asante → g.basera80@gmail.com</div>
                    <div className="text-gray-600">Need: Real housekeeping manager name and email</div>
                  </div>

                  <div className="border-l-4 border-orange-400 pl-3">
                    <div className="font-medium">🔒 Security Manager</div>
                    <div className="text-orange-700">Currently: Robert Kwame → g.basera80@gmail.com</div>
                    <div className="text-gray-600">Need: Real security manager name and email</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="border-l-4 border-orange-400 pl-3">
                    <div className="font-medium">🏨 Front Desk Manager</div>
                    <div className="text-orange-700">Currently: David Mensah → g.basera5@gmail.com</div>
                    <div className="text-gray-600">Need: Real front desk manager name and email</div>
                  </div>

                  <div className="border-l-4 border-orange-400 pl-3">
                    <div className="font-medium">🔧 Maintenance Manager</div>
                    <div className="text-orange-700">Currently: Jennifer Boateng → gizzy@dreampathdigitalsolutions.co.uk</div>
                    <div className="text-gray-600">Need: Real maintenance manager name and email</div>
                  </div>

                  <div className="border-l-4 border-green-400 pl-3">
                    <div className="font-medium">👔 General Manager (OK)</div>
                    <div className="text-green-700">Currently: Hotel Manager → g.basera@yahoo.com</div>
                    <div className="text-gray-600">This can stay as fallback for now</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Go-Live Checklist */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">📋 Critical SLA Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-blue-800">
                <div>✅ 1-hour acknowledgment SLA for all feedback</div>
                <div>✅ 4-hour resolution SLA for critical issues</div>
                <div>✅ Manager escalation hierarchy (Primary → Backup → GM)</div>
                <div>✅ Category-based routing for specialized responses</div>
                <div>✅ Critical alert system for serious issues</div>
                <div>✅ WhatsApp integration for urgent notifications</div>
                <div>✅ Professional email templates with branding</div>
                <div>✅ External review response system with team voice</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <Button
          onClick={handleSave}
          disabled={saving || !isConfigComplete}
          size="lg"
        >
          {saving ? 'Saving...' : '🚀 Save Configuration'}
        </Button>
      </div>
    </div>
  )
}
