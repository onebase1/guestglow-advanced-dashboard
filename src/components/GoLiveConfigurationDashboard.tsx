import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { 
  Users, 
  Mail, 
  Settings, 
  Upload, 
  Eye, 
  Save, 
  AlertTriangle, 
  CheckCircle,
  Download,
  FileText,
  Palette,
  Phone,
  MapPin
} from 'lucide-react'

interface ManagerConfiguration {
  id?: string
  tenant_id: string
  manager_name: string
  manager_title: string
  email_address: string
  phone_number?: string
  department: string
  is_primary: boolean
  backup_manager_id?: string
  is_active: boolean
  notification_preferences: {
    email: boolean
    sms: boolean
    whatsapp: boolean
  }
  working_hours: {
    start: string
    end: string
    timezone: string
  }
}

interface CategoryRouting {
  id?: string
  tenant_id: string
  feedback_category: string
  primary_manager_id: string
  backup_manager_id?: string
  escalation_manager_id?: string
  llm_override_enabled: boolean
  llm_override_keywords: string[]
  priority_level: string
  auto_escalate_after_hours: number
}

interface AssetConfiguration {
  id?: string
  tenant_id: string
  asset_type: string
  asset_key: string
  asset_value: string
  asset_metadata: any
  is_active: boolean
}

interface EmailTemplate {
  id?: string
  tenant_id: string
  template_type: string
  template_name: string
  subject_template: string
  html_template: string
  text_template?: string
  variables: any
  is_active: boolean
  is_default: boolean
}

export default function GoLiveConfigurationDashboard() {
  const [managers, setManagers] = useState<ManagerConfiguration[]>([])
  const [categoryRouting, setCategoryRouting] = useState<CategoryRouting[]>([])
  const [assets, setAssets] = useState<AssetConfiguration[]>([])
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('managers')
  const [previewMode, setPreviewMode] = useState(false)
  const { toast } = useToast()

  // Add error boundary for debugging
  const [error, setError] = useState<string | null>(null)

  const departments = [
    'Management',
    'Food & Beverage', 
    'Housekeeping',
    'Security',
    'Front Desk',
    'Maintenance',
    'Guest Relations',
    'Concierge'
  ]

  const feedbackCategories = [
    'Food & Beverage',
    'Housekeeping', 
    'Security',
    'Front Desk',
    'Maintenance',
    'General',
    'Facilities',
    'Service Quality'
  ]

  const priorityLevels = [
    { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
    { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: 'High', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' }
  ]

  useEffect(() => {
    console.log('GoLiveConfigurationDashboard: Starting to load configuration...')
    loadConfiguration()
  }, [])

  const loadConfiguration = async () => {
    console.log('GoLiveConfigurationDashboard: loadConfiguration called')
    setLoading(true)
    try {
      console.log('GoLiveConfigurationDashboard: Getting tenant...')
      // Get current tenant ID (assuming Eusbett for now)
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', 'eusbett')
        .single()

      if (tenantError) {
        console.error('GoLiveConfigurationDashboard: Tenant lookup error:', tenantError)
        toast({
          title: "Database Error",
          description: "Could not connect to tenant database. Please check your connection.",
          variant: "destructive"
        })
        return
      }

      if (!tenant) {
        toast({
          title: "Configuration Error",
          description: "Eusbett tenant not found. Please run the database setup scripts.",
          variant: "destructive"
        })
        return
      }

      const tenantId = tenant.id

      // Load managers with error handling
      const { data: managersData, error: managersError } = await supabase
        .from('manager_configurations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('is_primary', { ascending: false })

      if (managersError) {
        console.error('Managers loading error:', managersError)
        toast({
          title: "Database Setup Required",
          description: "Go-Live configuration tables not found. Please run the setup scripts first.",
          variant: "destructive"
        })
        return
      }

      // Load category routing
      const { data: routingData, error: routingError } = await supabase
        .from('category_routing_configurations')
        .select('*')
        .eq('tenant_id', tenantId)

      // Load assets
      const { data: assetsData, error: assetsError } = await supabase
        .from('asset_configurations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)

      // Load email templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('email_template_configurations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)

      setManagers(managersData || [])
      setCategoryRouting(routingData || [])
      setAssets(assetsData || [])
      setEmailTemplates(templatesData || [])

    } catch (error) {
      console.error('GoLiveConfigurationDashboard: Error loading configuration:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(`Failed to load configuration: ${errorMessage}`)
      toast({
        title: "Error",
        description: "Failed to load configuration data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const saveConfiguration = async () => {
    setSaving(true)
    try {
      // Save managers
      for (const manager of managers) {
        if (manager.id) {
          await supabase
            .from('manager_configurations')
            .update(manager)
            .eq('id', manager.id)
        } else {
          await supabase
            .from('manager_configurations')
            .insert(manager)
        }
      }

      // Save category routing
      for (const routing of categoryRouting) {
        if (routing.id) {
          await supabase
            .from('category_routing_configurations')
            .update(routing)
            .eq('id', routing.id)
        } else {
          await supabase
            .from('category_routing_configurations')
            .insert(routing)
        }
      }

      // Save assets
      for (const asset of assets) {
        if (asset.id) {
          await supabase
            .from('asset_configurations')
            .update(asset)
            .eq('id', asset.id)
        } else {
          await supabase
            .from('asset_configurations')
            .insert(asset)
        }
      }

      // Save email templates
      for (const template of emailTemplates) {
        if (template.id) {
          await supabase
            .from('email_template_configurations')
            .update(template)
            .eq('id', template.id)
        } else {
          await supabase
            .from('email_template_configurations')
            .insert(template)
        }
      }

      toast({
        title: "Success",
        description: "Configuration saved successfully",
      })

    } catch (error) {
      console.error('Error saving configuration:', error)
      toast({
        title: "Error", 
        description: "Failed to save configuration",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const exportConfiguration = async () => {
    const config = {
      managers,
      categoryRouting,
      assets,
      emailTemplates,
      exportedAt: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eusbett-configuration-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const validateConfiguration = () => {
    const issues = []

    // Check for primary manager
    const primaryManagers = managers.filter(m => m.is_primary && m.is_active)
    if (primaryManagers.length === 0) {
      issues.push("No primary manager configured")
    } else if (primaryManagers.length > 1) {
      issues.push("Multiple primary managers configured")
    }

    // Check for test emails
    const testEmails = managers.filter(m => 
      m.email_address.includes('g.basera') || 
      m.email_address.includes('test') ||
      m.email_address.includes('example')
    )
    if (testEmails.length > 0) {
      issues.push(`${testEmails.length} manager(s) still using test email addresses`)
    }

    // Check category routing coverage
    const uncoveredCategories = feedbackCategories.filter(cat => 
      !categoryRouting.some(route => route.feedback_category === cat)
    )
    if (uncoveredCategories.length > 0) {
      issues.push(`Categories without routing: ${uncoveredCategories.join(', ')}`)
    }

    return issues
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => { setError(null); loadConfiguration(); }}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

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

  const validationIssues = validateConfiguration()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Go-Live Configuration Dashboard</h1>
          <p className="text-muted-foreground">
            Replace test/placeholder data with production values for Eusbett Hotel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportConfiguration}>
            <Download className="h-4 w-4 mr-2" />
            Export Config
          </Button>
          <Button onClick={saveConfiguration} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save All'}
          </Button>
        </div>
      </div>

      {/* Validation Status */}
      {validationIssues.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Configuration Issues:</strong>
            <ul className="mt-2 list-disc list-inside">
              {validationIssues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {validationIssues.length === 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Configuration is ready for production deployment!
          </AlertDescription>
        </Alert>
      )}

      {/* Main Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="managers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Managers
          </TabsTrigger>
          <TabsTrigger value="routing" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Category Routing
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Assets & Branding
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Email Templates
          </TabsTrigger>
        </TabsList>

        {/* Manager Configuration Tab */}
        <TabsContent value="managers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Manager Configuration</CardTitle>
                  <CardDescription>
                    Configure manager details, contact information, and notification preferences.
                    Replace test emails with production manager contacts.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    const newManager: ManagerConfiguration = {
                      tenant_id: managers[0]?.tenant_id || '',
                      manager_name: '',
                      manager_title: 'Manager',
                      email_address: '',
                      phone_number: '',
                      department: 'General',
                      is_primary: false,
                      is_active: true,
                      notification_preferences: { email: true, sms: false, whatsapp: false },
                      working_hours: { start: '08:00', end: '18:00', timezone: 'Africa/Accra' }
                    }
                    setManagers([...managers, newManager])
                  }}
                >
                  Add Manager
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {managers.map((manager, index) => (
                  <Card key={index} className={`${manager.is_primary ? 'border-primary' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{manager.manager_name || 'New Manager'}</CardTitle>
                          {manager.is_primary && (
                            <Badge variant="default">Primary Manager</Badge>
                          )}
                          {manager.email_address.includes('g.basera') && (
                            <Badge variant="destructive">Test Email</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={manager.is_active}
                            onCheckedChange={(checked) => {
                              const updated = [...managers]
                              updated[index].is_active = checked
                              setManagers(updated)
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const updated = managers.filter((_, i) => i !== index)
                              setManagers(updated)
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`manager-name-${index}`}>Manager Name *</Label>
                          <Input
                            id={`manager-name-${index}`}
                            value={manager.manager_name}
                            onChange={(e) => {
                              const updated = [...managers]
                              updated[index].manager_name = e.target.value
                              setManagers(updated)
                            }}
                            placeholder="e.g., Robert Mensah"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`manager-title-${index}`}>Title *</Label>
                          <Input
                            id={`manager-title-${index}`}
                            value={manager.manager_title}
                            onChange={(e) => {
                              const updated = [...managers]
                              updated[index].manager_title = e.target.value
                              setManagers(updated)
                            }}
                            placeholder="e.g., General Manager"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`manager-email-${index}`}>Email Address *</Label>
                          <Input
                            id={`manager-email-${index}`}
                            type="email"
                            value={manager.email_address}
                            onChange={(e) => {
                              const updated = [...managers]
                              updated[index].email_address = e.target.value
                              setManagers(updated)
                            }}
                            placeholder="e.g., robert.mensah@eusbetthotel.com"
                            className={manager.email_address.includes('g.basera') ? 'border-red-300' : ''}
                          />
                          {manager.email_address.includes('g.basera') && (
                            <p className="text-sm text-red-600 mt-1">
                              ⚠️ This is a test email address - replace with production email
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor={`manager-phone-${index}`}>Phone Number</Label>
                          <Input
                            id={`manager-phone-${index}`}
                            value={manager.phone_number || ''}
                            onChange={(e) => {
                              const updated = [...managers]
                              updated[index].phone_number = e.target.value
                              setManagers(updated)
                            }}
                            placeholder="e.g., +233 24 479 9348"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`manager-department-${index}`}>Department *</Label>
                          <Select
                            value={manager.department}
                            onValueChange={(value) => {
                              const updated = [...managers]
                              updated[index].department = value
                              setManagers(updated)
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {departments.map(dept => (
                                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`manager-primary-${index}`}
                            checked={manager.is_primary}
                            onCheckedChange={(checked) => {
                              const updated = [...managers]
                              // Only one primary manager allowed
                              if (checked) {
                                updated.forEach((m, i) => {
                                  m.is_primary = i === index
                                })
                              } else {
                                updated[index].is_primary = false
                              }
                              setManagers(updated)
                            }}
                          />
                          <Label htmlFor={`manager-primary-${index}`}>Primary Manager</Label>
                        </div>
                      </div>

                      {/* Notification Preferences */}
                      <div className="border-t pt-4">
                        <Label className="text-sm font-medium">Notification Preferences</Label>
                        <div className="flex items-center space-x-6 mt-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={manager.notification_preferences.email}
                              onCheckedChange={(checked) => {
                                const updated = [...managers]
                                updated[index].notification_preferences.email = checked
                                setManagers(updated)
                              }}
                            />
                            <Label className="text-sm">Email</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={manager.notification_preferences.sms}
                              onCheckedChange={(checked) => {
                                const updated = [...managers]
                                updated[index].notification_preferences.sms = checked
                                setManagers(updated)
                              }}
                            />
                            <Label className="text-sm">SMS</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={manager.notification_preferences.whatsapp}
                              onCheckedChange={(checked) => {
                                const updated = [...managers]
                                updated[index].notification_preferences.whatsapp = checked
                                setManagers(updated)
                              }}
                            />
                            <Label className="text-sm">WhatsApp</Label>
                          </div>
                        </div>
                      </div>

                      {/* Working Hours */}
                      <div className="border-t pt-4">
                        <Label className="text-sm font-medium">Working Hours</Label>
                        <div className="grid grid-cols-3 gap-4 mt-2">
                          <div>
                            <Label htmlFor={`start-time-${index}`} className="text-xs">Start Time</Label>
                            <Input
                              id={`start-time-${index}`}
                              type="time"
                              value={manager.working_hours.start}
                              onChange={(e) => {
                                const updated = [...managers]
                                updated[index].working_hours.start = e.target.value
                                setManagers(updated)
                              }}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`end-time-${index}`} className="text-xs">End Time</Label>
                            <Input
                              id={`end-time-${index}`}
                              type="time"
                              value={manager.working_hours.end}
                              onChange={(e) => {
                                const updated = [...managers]
                                updated[index].working_hours.end = e.target.value
                                setManagers(updated)
                              }}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`timezone-${index}`} className="text-xs">Timezone</Label>
                            <Select
                              value={manager.working_hours.timezone}
                              onValueChange={(value) => {
                                const updated = [...managers]
                                updated[index].working_hours.timezone = value
                                setManagers(updated)
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Africa/Accra">Africa/Accra (GMT)</SelectItem>
                                <SelectItem value="UTC">UTC</SelectItem>
                                <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                                <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {managers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No managers configured. Click "Add Manager" to get started.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Category Routing Tab */}
        <TabsContent value="routing" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Smart Category Mapping</CardTitle>
                  <CardDescription>
                    Configure which manager receives emails based on guest feedback categories.
                    Enable LLM override logic for intelligent routing.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    const newRouting: CategoryRouting = {
                      tenant_id: categoryRouting[0]?.tenant_id || managers[0]?.tenant_id || '',
                      feedback_category: '',
                      primary_manager_id: managers.find(m => m.is_primary)?.id || managers[0]?.id || '',
                      llm_override_enabled: true,
                      llm_override_keywords: [],
                      priority_level: 'normal',
                      auto_escalate_after_hours: 24
                    }
                    setCategoryRouting([...categoryRouting, newRouting])
                  }}
                  disabled={managers.length === 0}
                >
                  Add Category
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Category Routing Rules */}
                {categoryRouting.map((routing, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">
                            {routing.feedback_category || 'New Category'}
                          </CardTitle>
                          <Badge
                            className={
                              priorityLevels.find(p => p.value === routing.priority_level)?.color ||
                              'bg-gray-100 text-gray-800'
                            }
                          >
                            {priorityLevels.find(p => p.value === routing.priority_level)?.label || routing.priority_level}
                          </Badge>
                          {routing.llm_override_enabled && (
                            <Badge variant="outline">LLM Override</Badge>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const updated = categoryRouting.filter((_, i) => i !== index)
                            setCategoryRouting(updated)
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`category-${index}`}>Feedback Category *</Label>
                          <Select
                            value={routing.feedback_category}
                            onValueChange={(value) => {
                              const updated = [...categoryRouting]
                              updated[index].feedback_category = value
                              setCategoryRouting(updated)
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {feedbackCategories.map(category => (
                                <SelectItem key={category} value={category}>{category}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor={`priority-${index}`}>Priority Level *</Label>
                          <Select
                            value={routing.priority_level}
                            onValueChange={(value) => {
                              const updated = [...categoryRouting]
                              updated[index].priority_level = value
                              setCategoryRouting(updated)
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {priorityLevels.map(level => (
                                <SelectItem key={level.value} value={level.value}>
                                  {level.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor={`primary-manager-${index}`}>Primary Manager *</Label>
                          <Select
                            value={routing.primary_manager_id}
                            onValueChange={(value) => {
                              const updated = [...categoryRouting]
                              updated[index].primary_manager_id = value
                              setCategoryRouting(updated)
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select manager" />
                            </SelectTrigger>
                            <SelectContent>
                              {managers.filter(m => m.is_active).map(manager => (
                                <SelectItem key={manager.id} value={manager.id || ''}>
                                  {manager.manager_name} ({manager.department})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor={`backup-manager-${index}`}>Backup Manager</Label>
                          <Select
                            value={routing.backup_manager_id || ''}
                            onValueChange={(value) => {
                              const updated = [...categoryRouting]
                              updated[index].backup_manager_id = value || undefined
                              setCategoryRouting(updated)
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select backup manager" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {managers.filter(m => m.is_active && m.id !== routing.primary_manager_id).map(manager => (
                                <SelectItem key={manager.id} value={manager.id || ''}>
                                  {manager.manager_name} ({manager.department})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* LLM Override Settings */}
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-sm font-medium">LLM Override Settings</Label>
                          <Switch
                            checked={routing.llm_override_enabled}
                            onCheckedChange={(checked) => {
                              const updated = [...categoryRouting]
                              updated[index].llm_override_enabled = checked
                              setCategoryRouting(updated)
                            }}
                          />
                        </div>
                        {routing.llm_override_enabled && (
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor={`keywords-${index}`} className="text-xs">
                                Override Keywords (comma-separated)
                              </Label>
                              <Input
                                id={`keywords-${index}`}
                                value={routing.llm_override_keywords.join(', ')}
                                onChange={(e) => {
                                  const updated = [...categoryRouting]
                                  updated[index].llm_override_keywords = e.target.value
                                    .split(',')
                                    .map(k => k.trim())
                                    .filter(k => k.length > 0)
                                  setCategoryRouting(updated)
                                }}
                                placeholder="e.g., food, meal, restaurant, dining"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Keywords that trigger LLM analysis for smart routing
                              </p>
                            </div>
                            <div>
                              <Label htmlFor={`escalate-hours-${index}`} className="text-xs">
                                Auto-escalate after (hours)
                              </Label>
                              <Input
                                id={`escalate-hours-${index}`}
                                type="number"
                                min="1"
                                max="168"
                                value={routing.auto_escalate_after_hours}
                                onChange={(e) => {
                                  const updated = [...categoryRouting]
                                  updated[index].auto_escalate_after_hours = parseInt(e.target.value) || 24
                                  setCategoryRouting(updated)
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Example Scenarios */}
                      <div className="border-t pt-4">
                        <Label className="text-sm font-medium">Example Routing Scenarios</Label>
                        <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-start gap-2">
                            <span className="text-green-600">✓</span>
                            <span>
                              Guest selects "{routing.feedback_category}" → Routes to{' '}
                              {managers.find(m => m.id === routing.primary_manager_id)?.manager_name || 'Selected Manager'}
                            </span>
                          </div>
                          {routing.llm_override_enabled && routing.llm_override_keywords.length > 0 && (
                            <div className="flex items-start gap-2">
                              <span className="text-blue-600">🤖</span>
                              <span>
                                Guest mentions "{routing.llm_override_keywords[0]}" in any category →
                                LLM may override to route to{' '}
                                {managers.find(m => m.id === routing.primary_manager_id)?.manager_name || 'Selected Manager'}
                              </span>
                            </div>
                          )}
                          {routing.backup_manager_id && (
                            <div className="flex items-start gap-2">
                              <span className="text-yellow-600">⚡</span>
                              <span>
                                If primary manager unavailable → Routes to{' '}
                                {managers.find(m => m.id === routing.backup_manager_id)?.manager_name || 'Backup Manager'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {categoryRouting.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No category routing configured. Click "Add Category" to get started.</p>
                    {managers.length === 0 && (
                      <p className="text-sm mt-2">Configure managers first to enable category routing.</p>
                    )}
                  </div>
                )}

                {/* Coverage Summary */}
                {categoryRouting.length > 0 && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-blue-900">Coverage Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium text-blue-900">Categories Covered</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {categoryRouting.length}/{feedbackCategories.length}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-blue-900">LLM Override Enabled</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {categoryRouting.filter(r => r.llm_override_enabled).length}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-blue-900">Critical Priority</div>
                          <div className="text-2xl font-bold text-red-600">
                            {categoryRouting.filter(r => r.priority_level === 'critical').length}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-blue-900">Backup Managers</div>
                          <div className="text-2xl font-bold text-green-600">
                            {categoryRouting.filter(r => r.backup_manager_id).length}
                          </div>
                        </div>
                      </div>

                      {/* Uncovered Categories */}
                      {feedbackCategories.filter(cat =>
                        !categoryRouting.some(route => route.feedback_category === cat)
                      ).length > 0 && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <div className="font-medium text-yellow-800 mb-2">Uncovered Categories:</div>
                          <div className="flex flex-wrap gap-2">
                            {feedbackCategories
                              .filter(cat => !categoryRouting.some(route => route.feedback_category === cat))
                              .map(category => (
                                <Badge key={category} variant="outline" className="text-yellow-700 border-yellow-300">
                                  {category}
                                </Badge>
                              ))
                            }
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assets & Branding Tab */}
        <TabsContent value="assets" className="space-y-4">
          {/* Logo Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Logo Management
              </CardTitle>
              <CardDescription>
                Upload and manage hotel logos. Replace placeholder logos with high-quality client assets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Primary Logo */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Primary Logo</Label>
                    <p className="text-xs text-muted-foreground">Main logo used in headers and navigation</p>
                  </div>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    {assets.find(a => a.asset_key === 'primary_logo')?.asset_value ? (
                      <div className="space-y-3">
                        <img
                          src={assets.find(a => a.asset_key === 'primary_logo')?.asset_value}
                          alt="Primary Logo"
                          className="h-16 mx-auto"
                        />
                        <div className="text-sm text-muted-foreground">
                          Current: {assets.find(a => a.asset_key === 'primary_logo')?.asset_value}
                        </div>
                        <Button variant="outline" size="sm">
                          Replace Logo
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Upload className="h-8 w-8 mx-auto text-gray-400" />
                        <div>
                          <Button variant="outline">Upload Primary Logo</Button>
                          <p className="text-xs text-muted-foreground mt-2">
                            Recommended: SVG or PNG, max 2MB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Favicon */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Favicon</Label>
                    <p className="text-xs text-muted-foreground">Small icon displayed in browser tabs</p>
                  </div>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    {assets.find(a => a.asset_key === 'favicon')?.asset_value ? (
                      <div className="space-y-3">
                        <img
                          src={assets.find(a => a.asset_key === 'favicon')?.asset_value}
                          alt="Favicon"
                          className="h-8 w-8 mx-auto"
                        />
                        <div className="text-sm text-muted-foreground">
                          Current: {assets.find(a => a.asset_key === 'favicon')?.asset_value}
                        </div>
                        <Button variant="outline" size="sm">
                          Replace Favicon
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Upload className="h-8 w-8 mx-auto text-gray-400" />
                        <div>
                          <Button variant="outline">Upload Favicon</Button>
                          <p className="text-xs text-muted-foreground mt-2">
                            Recommended: ICO or PNG, 16x16 or 32x32px
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Brand Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Brand Colors
              </CardTitle>
              <CardDescription>
                Customize brand colors to match your hotel's visual identity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Primary Color */}
                <div className="space-y-3">
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded border-2 border-gray-300"
                      style={{
                        backgroundColor: assets.find(a => a.asset_key === 'primary_color')?.asset_value || '#003D7A'
                      }}
                    ></div>
                    <div className="flex-1">
                      <Input
                        id="primary-color"
                        type="color"
                        value={assets.find(a => a.asset_key === 'primary_color')?.asset_value || '#003D7A'}
                        onChange={(e) => {
                          const updated = [...assets]
                          const index = updated.findIndex(a => a.asset_key === 'primary_color')
                          if (index >= 0) {
                            updated[index].asset_value = e.target.value
                          } else {
                            updated.push({
                              tenant_id: managers[0]?.tenant_id || '',
                              asset_type: 'brand_colors',
                              asset_key: 'primary_color',
                              asset_value: e.target.value,
                              asset_metadata: { name: 'Primary Color', usage: 'primary' },
                              is_active: true
                            })
                          }
                          setAssets(updated)
                        }}
                        className="h-8"
                      />
                      <Input
                        value={assets.find(a => a.asset_key === 'primary_color')?.asset_value || '#003D7A'}
                        onChange={(e) => {
                          const updated = [...assets]
                          const index = updated.findIndex(a => a.asset_key === 'primary_color')
                          if (index >= 0) {
                            updated[index].asset_value = e.target.value
                          }
                          setAssets(updated)
                        }}
                        placeholder="#003D7A"
                        className="mt-2 text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Main brand color for headers, buttons</p>
                </div>

                {/* Secondary Color */}
                <div className="space-y-3">
                  <Label htmlFor="secondary-color">Secondary Color</Label>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded border-2 border-gray-300"
                      style={{
                        backgroundColor: assets.find(a => a.asset_key === 'secondary_color')?.asset_value || '#E74C3C'
                      }}
                    ></div>
                    <div className="flex-1">
                      <Input
                        id="secondary-color"
                        type="color"
                        value={assets.find(a => a.asset_key === 'secondary_color')?.asset_value || '#E74C3C'}
                        onChange={(e) => {
                          const updated = [...assets]
                          const index = updated.findIndex(a => a.asset_key === 'secondary_color')
                          if (index >= 0) {
                            updated[index].asset_value = e.target.value
                          } else {
                            updated.push({
                              tenant_id: managers[0]?.tenant_id || '',
                              asset_type: 'brand_colors',
                              asset_key: 'secondary_color',
                              asset_value: e.target.value,
                              asset_metadata: { name: 'Secondary Color', usage: 'accent' },
                              is_active: true
                            })
                          }
                          setAssets(updated)
                        }}
                        className="h-8"
                      />
                      <Input
                        value={assets.find(a => a.asset_key === 'secondary_color')?.asset_value || '#E74C3C'}
                        onChange={(e) => {
                          const updated = [...assets]
                          const index = updated.findIndex(a => a.asset_key === 'secondary_color')
                          if (index >= 0) {
                            updated[index].asset_value = e.target.value
                          }
                          setAssets(updated)
                        }}
                        placeholder="#E74C3C"
                        className="mt-2 text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Accent color for highlights, alerts</p>
                </div>

                {/* Accent Color */}
                <div className="space-y-3">
                  <Label htmlFor="accent-color">Accent Color</Label>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded border-2 border-gray-300"
                      style={{
                        backgroundColor: assets.find(a => a.asset_key === 'accent_color')?.asset_value || '#00B4E6'
                      }}
                    ></div>
                    <div className="flex-1">
                      <Input
                        id="accent-color"
                        type="color"
                        value={assets.find(a => a.asset_key === 'accent_color')?.asset_value || '#00B4E6'}
                        onChange={(e) => {
                          const updated = [...assets]
                          const index = updated.findIndex(a => a.asset_key === 'accent_color')
                          if (index >= 0) {
                            updated[index].asset_value = e.target.value
                          } else {
                            updated.push({
                              tenant_id: managers[0]?.tenant_id || '',
                              asset_type: 'brand_colors',
                              asset_key: 'accent_color',
                              asset_value: e.target.value,
                              asset_metadata: { name: 'Accent Color', usage: 'highlight' },
                              is_active: true
                            })
                          }
                          setAssets(updated)
                        }}
                        className="h-8"
                      />
                      <Input
                        value={assets.find(a => a.asset_key === 'accent_color')?.asset_value || '#00B4E6'}
                        onChange={(e) => {
                          const updated = [...assets]
                          const index = updated.findIndex(a => a.asset_key === 'accent_color')
                          if (index >= 0) {
                            updated[index].asset_value = e.target.value
                          }
                          setAssets(updated)
                        }}
                        placeholder="#00B4E6"
                        className="mt-2 text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Supporting color for links, info</p>
                </div>
              </div>

              {/* Color Preview */}
              <div className="mt-6 p-4 border rounded-lg">
                <Label className="text-sm font-medium mb-3 block">Color Preview</Label>
                <div className="flex items-center gap-4">
                  <Button
                    style={{
                      backgroundColor: assets.find(a => a.asset_key === 'primary_color')?.asset_value || '#003D7A',
                      color: 'white'
                    }}
                  >
                    Primary Button
                  </Button>
                  <Button
                    variant="outline"
                    style={{
                      borderColor: assets.find(a => a.asset_key === 'secondary_color')?.asset_value || '#E74C3C',
                      color: assets.find(a => a.asset_key === 'secondary_color')?.asset_value || '#E74C3C'
                    }}
                  >
                    Secondary Button
                  </Button>
                  <Badge
                    style={{
                      backgroundColor: assets.find(a => a.asset_key === 'accent_color')?.asset_value || '#00B4E6',
                      color: 'white'
                    }}
                  >
                    Accent Badge
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Contact Information
              </CardTitle>
              <CardDescription>
                Update hotel contact details displayed throughout the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="hotel-name">Hotel Name</Label>
                    <Input
                      id="hotel-name"
                      value={assets.find(a => a.asset_key === 'hotel_name')?.asset_value || 'Eusbett Hotel'}
                      onChange={(e) => {
                        const updated = [...assets]
                        const index = updated.findIndex(a => a.asset_key === 'hotel_name')
                        if (index >= 0) {
                          updated[index].asset_value = e.target.value
                        } else {
                          updated.push({
                            tenant_id: managers[0]?.tenant_id || '',
                            asset_type: 'contact_info',
                            asset_key: 'hotel_name',
                            asset_value: e.target.value,
                            asset_metadata: { display_name: e.target.value },
                            is_active: true
                          })
                        }
                        setAssets(updated)
                      }}
                      placeholder="e.g., The Eusbett Hotel Limited"
                    />
                  </div>
                  <div>
                    <Label htmlFor="hotel-address">Address</Label>
                    <Textarea
                      id="hotel-address"
                      value={assets.find(a => a.asset_key === 'address')?.asset_value || 'Sunyani, Bono Region, Ghana'}
                      onChange={(e) => {
                        const updated = [...assets]
                        const index = updated.findIndex(a => a.asset_key === 'address')
                        if (index >= 0) {
                          updated[index].asset_value = e.target.value
                        } else {
                          updated.push({
                            tenant_id: managers[0]?.tenant_id || '',
                            asset_type: 'contact_info',
                            asset_key: 'address',
                            asset_value: e.target.value,
                            asset_metadata: { type: 'physical_address' },
                            is_active: true
                          })
                        }
                        setAssets(updated)
                      }}
                      placeholder="Full hotel address"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="hotel-phone">Phone Number</Label>
                    <Input
                      id="hotel-phone"
                      value={assets.find(a => a.asset_key === 'phone')?.asset_value || '+233 24 479 9348'}
                      onChange={(e) => {
                        const updated = [...assets]
                        const index = updated.findIndex(a => a.asset_key === 'phone')
                        if (index >= 0) {
                          updated[index].asset_value = e.target.value
                        } else {
                          updated.push({
                            tenant_id: managers[0]?.tenant_id || '',
                            asset_type: 'contact_info',
                            asset_key: 'phone',
                            asset_value: e.target.value,
                            asset_metadata: { type: 'primary' },
                            is_active: true
                          })
                        }
                        setAssets(updated)
                      }}
                      placeholder="e.g., +233 24 479 9348"
                    />
                  </div>
                  <div>
                    <Label htmlFor="hotel-website">Website</Label>
                    <Input
                      id="hotel-website"
                      value={assets.find(a => a.asset_key === 'website')?.asset_value || 'https://guest-glow.com/eusbett'}
                      onChange={(e) => {
                        const updated = [...assets]
                        const index = updated.findIndex(a => a.asset_key === 'website')
                        if (index >= 0) {
                          updated[index].asset_value = e.target.value
                        } else {
                          updated.push({
                            tenant_id: managers[0]?.tenant_id || '',
                            asset_type: 'contact_info',
                            asset_key: 'website',
                            asset_value: e.target.value,
                            asset_metadata: { type: 'booking_portal' },
                            is_active: true
                          })
                        }
                        setAssets(updated)
                      }}
                      placeholder="https://your-hotel-website.com"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Template Personalization</CardTitle>
                  <CardDescription>
                    Customize email templates with real manager names and titles.
                    Preview how emails will appear with production data.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPreviewMode(!previewMode)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {previewMode ? 'Edit Mode' : 'Preview Mode'}
                  </Button>
                  <Button
                    onClick={() => {
                      const newTemplate: EmailTemplate = {
                        tenant_id: emailTemplates[0]?.tenant_id || managers[0]?.tenant_id || '',
                        template_type: 'custom',
                        template_name: 'New Template',
                        subject_template: 'New Email Subject',
                        html_template: '<html><body><p>Dear {{guest_name}},</p><p>Your email content here.</p><p>Best regards,<br>{{manager_name}}</p></body></html>',
                        variables: {
                          guest_name: 'Guest name',
                          manager_name: 'Manager name',
                          hotel_name: 'Hotel name'
                        },
                        is_active: true,
                        is_default: false
                      }
                      setEmailTemplates([...emailTemplates, newTemplate])
                    }}
                    disabled={managers.length === 0}
                  >
                    Add Template
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {emailTemplates.map((template, index) => (
                  <Card key={index} className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{template.template_name}</CardTitle>
                          <Badge variant="outline">{template.template_type}</Badge>
                          {template.is_default && (
                            <Badge variant="default">Default</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={template.is_active}
                            onCheckedChange={(checked) => {
                              const updated = [...emailTemplates]
                              updated[index].is_active = checked
                              setEmailTemplates(updated)
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const updated = emailTemplates.filter((_, i) => i !== index)
                              setEmailTemplates(updated)
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {!previewMode ? (
                        <>
                          {/* Template Configuration */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`template-name-${index}`}>Template Name</Label>
                              <Input
                                id={`template-name-${index}`}
                                value={template.template_name}
                                onChange={(e) => {
                                  const updated = [...emailTemplates]
                                  updated[index].template_name = e.target.value
                                  setEmailTemplates(updated)
                                }}
                                placeholder="e.g., Guest Thank You"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`template-type-${index}`}>Template Type</Label>
                              <Select
                                value={template.template_type}
                                onValueChange={(value) => {
                                  const updated = [...emailTemplates]
                                  updated[index].template_type = value
                                  setEmailTemplates(updated)
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="guest_thank_you">Guest Thank You</SelectItem>
                                  <SelectItem value="manager_alert">Manager Alert</SelectItem>
                                  <SelectItem value="weekly_report">Weekly Report</SelectItem>
                                  <SelectItem value="follow_up">Follow Up</SelectItem>
                                  <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Subject Template */}
                          <div>
                            <Label htmlFor={`subject-${index}`}>Email Subject Template</Label>
                            <Input
                              id={`subject-${index}`}
                              value={template.subject_template}
                              onChange={(e) => {
                                const updated = [...emailTemplates]
                                updated[index].subject_template = e.target.value
                                setEmailTemplates(updated)
                              }}
                              placeholder="e.g., Thank You for Your Feedback, {{guest_name}}!"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Use {{variable_name}} for dynamic content
                            </p>
                          </div>

                          {/* HTML Template */}
                          <div>
                            <Label htmlFor={`html-template-${index}`}>HTML Email Template</Label>
                            <Textarea
                              id={`html-template-${index}`}
                              value={template.html_template}
                              onChange={(e) => {
                                const updated = [...emailTemplates]
                                updated[index].html_template = e.target.value
                                setEmailTemplates(updated)
                              }}
                              placeholder="HTML email content with {{variables}}"
                              rows={8}
                              className="font-mono text-sm"
                            />
                          </div>

                          {/* Available Variables */}
                          <div className="border-t pt-4">
                            <Label className="text-sm font-medium">Available Variables</Label>
                            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                              {Object.entries(template.variables || {}).map(([key, description]) => (
                                <div key={key} className="text-sm">
                                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                                    {`{{${key}}}`}
                                  </code>
                                  <p className="text-xs text-muted-foreground mt-1">{description as string}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Preview Mode */}
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium">Subject Preview</Label>
                              <div className="mt-1 p-3 bg-gray-50 border rounded">
                                {template.subject_template
                                  .replace(/\{\{guest_name\}\}/g, 'John Smith')
                                  .replace(/\{\{manager_name\}\}/g, managers.find(m => m.is_primary)?.manager_name || 'Hotel Manager')
                                  .replace(/\{\{hotel_name\}\}/g, assets.find(a => a.asset_key === 'hotel_name')?.asset_value || 'Eusbett Hotel')
                                  .replace(/\{\{rating\}\}/g, '4')
                                  .replace(/\{\{room_number\}\}/g, '205')
                                }
                              </div>
                            </div>

                            <div>
                              <Label className="text-sm font-medium">Email Preview</Label>
                              <div className="mt-1 border rounded overflow-hidden">
                                <div
                                  className="p-4 bg-white"
                                  dangerouslySetInnerHTML={{
                                    __html: template.html_template
                                      .replace(/\{\{guest_name\}\}/g, 'John Smith')
                                      .replace(/\{\{manager_name\}\}/g, managers.find(m => m.is_primary)?.manager_name || 'Hotel Manager')
                                      .replace(/\{\{manager_title\}\}/g, managers.find(m => m.is_primary)?.manager_title || 'General Manager')
                                      .replace(/\{\{hotel_name\}\}/g, assets.find(a => a.asset_key === 'hotel_name')?.asset_value || 'Eusbett Hotel')
                                      .replace(/\{\{rating\}\}/g, '4')
                                      .replace(/\{\{room_number\}\}/g, '205')
                                      .replace(/\{\{feedback_text\}\}/g, 'The room was very clean and the staff was extremely helpful. Great location!')
                                      .replace(/\{\{category\}\}/g, 'Housekeeping')
                                      .replace(/\{\{action_required\}\}/g, 'Follow up with guest about their positive experience')
                                  }}
                                />
                              </div>
                            </div>

                            {/* Sample Data Used */}
                            <div className="border-t pt-4">
                              <Label className="text-sm font-medium">Sample Data Used in Preview</Label>
                              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="font-medium">Guest Name:</span> John Smith
                                </div>
                                <div>
                                  <span className="font-medium">Manager:</span> {managers.find(m => m.is_primary)?.manager_name || 'Hotel Manager'}
                                </div>
                                <div>
                                  <span className="font-medium">Hotel:</span> {assets.find(a => a.asset_key === 'hotel_name')?.asset_value || 'Eusbett Hotel'}
                                </div>
                                <div>
                                  <span className="font-medium">Rating:</span> 4/5 stars
                                </div>
                                <div>
                                  <span className="font-medium">Room:</span> 205
                                </div>
                                <div>
                                  <span className="font-medium">Category:</span> Housekeeping
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Template Actions */}
                      <div className="border-t pt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={template.is_default}
                            onCheckedChange={(checked) => {
                              const updated = [...emailTemplates]
                              if (checked) {
                                // Only one default per type
                                updated.forEach((t, i) => {
                                  if (t.template_type === template.template_type) {
                                    t.is_default = i === index
                                  }
                                })
                              } else {
                                updated[index].is_default = false
                              }
                              setEmailTemplates(updated)
                            }}
                          />
                          <Label className="text-sm">Set as default for {template.template_type}</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            Test Send
                          </Button>
                          <Button variant="outline" size="sm">
                            Duplicate
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {emailTemplates.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No email templates configured. Click "Add Template" to get started.</p>
                    {managers.length === 0 && (
                      <p className="text-sm mt-2">Configure managers first to enable template personalization.</p>
                    )}
                  </div>
                )}

                {/* Template Summary */}
                {emailTemplates.length > 0 && (
                  <Card className="bg-green-50 border-green-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-green-900">Template Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium text-green-900">Total Templates</div>
                          <div className="text-2xl font-bold text-green-600">{emailTemplates.length}</div>
                        </div>
                        <div>
                          <div className="font-medium text-green-900">Active Templates</div>
                          <div className="text-2xl font-bold text-green-600">
                            {emailTemplates.filter(t => t.is_active).length}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-green-900">Default Templates</div>
                          <div className="text-2xl font-bold text-green-600">
                            {emailTemplates.filter(t => t.is_default).length}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-green-900">Template Types</div>
                          <div className="text-2xl font-bold text-green-600">
                            {new Set(emailTemplates.map(t => t.template_type)).size}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
