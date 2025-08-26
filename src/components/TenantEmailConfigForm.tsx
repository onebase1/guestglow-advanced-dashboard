/**
 * 📧 TENANT EMAIL CONFIGURATION FORM
 * 
 * Safe-by-default email configuration system:
 * - Master toggle prevents accidental emails to real clients
 * - Form-driven configuration (no code changes needed)
 * - Database-driven routing with safe fallbacks
 * - Individual email type controls
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { getCurrentUserTenantId } from '@/utils/tenant'
import { AlertTriangle, Mail, Shield, CheckCircle } from 'lucide-react'

interface TenantEmailConfig {
  guest_relations_email: string
  general_manager_email: string
  operations_director_email: string
  emails_enabled: boolean
  manager_emails_enabled: boolean
  escalation_emails_enabled: boolean
}

export function TenantEmailConfigForm() {
  const [config, setConfig] = useState<TenantEmailConfig>({
    guest_relations_email: 'system-fallback@guest-glow.com',
    general_manager_email: 'system-fallback@guest-glow.com',
    operations_director_email: 'system-fallback@guest-glow.com',
    emails_enabled: false,
    manager_emails_enabled: false,
    escalation_emails_enabled: false
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadEmailConfig()
  }, [])

  const loadEmailConfig = async () => {
    try {
      setLoading(true)
      
      // Get current tenant ID
      const currentTenantId = await getCurrentUserTenantId()
      if (!currentTenantId) {
        throw new Error('No tenant context available')
      }
      
      setTenantId(currentTenantId)

      // Load email configuration
      const { data, error } = await supabase.rpc('get_tenant_email_config', {
        p_tenant_id: currentTenantId
      })

      if (error) throw error

      if (data && data.length > 0) {
        setConfig(data[0])
      }

    } catch (error: any) {
      console.error('Error loading email config:', error)
      toast({
        title: "Error loading configuration",
        description: error.message || "Failed to load email configuration",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const saveEmailConfig = async () => {
    if (!tenantId) {
      toast({
        title: "Error",
        description: "No tenant context available",
        variant: "destructive"
      })
      return
    }

    try {
      setSaving(true)

      const { data, error } = await supabase.rpc('update_tenant_email_config', {
        p_tenant_id: tenantId,
        p_guest_relations_email: config.guest_relations_email,
        p_general_manager_email: config.general_manager_email,
        p_operations_director_email: config.operations_director_email,
        p_emails_enabled: config.emails_enabled,
        p_manager_emails_enabled: config.manager_emails_enabled,
        p_escalation_emails_enabled: config.escalation_emails_enabled
      })

      if (error) throw error

      toast({
        title: "Configuration saved",
        description: config.emails_enabled 
          ? "Email configuration updated. Real emails will now be sent to configured addresses."
          : "Email configuration updated. All emails will continue to go to system fallback.",
        variant: config.emails_enabled ? "default" : "destructive"
      })

    } catch (error: any) {
      console.error('Error saving email config:', error)
      toast({
        title: "Error saving configuration",
        description: error.message || "Failed to save email configuration",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const updateConfig = (field: keyof TenantEmailConfig, value: string | boolean) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading email configuration...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Configuration
        </CardTitle>
        <CardDescription>
          Configure email addresses for guest communications and manager notifications.
          Safe by default - no real emails sent until explicitly enabled.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Master Email Toggle */}
        <Alert className={config.emails_enabled ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <Shield className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <strong>Master Email Control:</strong> {config.emails_enabled ? 'ENABLED' : 'DISABLED'}
              <br />
              <span className="text-sm text-muted-foreground">
                {config.emails_enabled 
                  ? 'Real emails will be sent to configured addresses below'
                  : 'All emails go to system-fallback@guest-glow.com (safe mode)'
                }
              </span>
            </div>
            <Switch
              checked={config.emails_enabled}
              onCheckedChange={(checked) => updateConfig('emails_enabled', checked)}
            />
          </AlertDescription>
        </Alert>

        {/* Email Addresses */}
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="guest_relations_email">Guest Relations Email</Label>
            <Input
              id="guest_relations_email"
              type="email"
              value={config.guest_relations_email}
              onChange={(e) => updateConfig('guest_relations_email', e.target.value)}
              placeholder="guestrelations@yourhotel.com"
              disabled={!config.emails_enabled}
            />
            <p className="text-xs text-muted-foreground">
              Primary contact for guest feedback and communications
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="general_manager_email">General Manager Email</Label>
            <Input
              id="general_manager_email"
              type="email"
              value={config.general_manager_email}
              onChange={(e) => updateConfig('general_manager_email', e.target.value)}
              placeholder="gm@yourhotel.com"
              disabled={!config.emails_enabled}
            />
            <p className="text-xs text-muted-foreground">
              Receives escalated feedback and management alerts
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="operations_director_email">Operations Director Email</Label>
            <Input
              id="operations_director_email"
              type="email"
              value={config.operations_director_email}
              onChange={(e) => updateConfig('operations_director_email', e.target.value)}
              placeholder="operations@yourhotel.com"
              disabled={!config.emails_enabled}
            />
            <p className="text-xs text-muted-foreground">
              Final escalation level for critical issues
            </p>
          </div>
        </div>

        {/* Email Type Controls */}
        <div className="space-y-4">
          <h4 className="font-medium">Email Type Controls</h4>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Manager Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Send alerts to managers for new feedback
              </p>
            </div>
            <Switch
              checked={config.manager_emails_enabled}
              onCheckedChange={(checked) => updateConfig('manager_emails_enabled', checked)}
              disabled={!config.emails_enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>SLA Escalation Emails</Label>
              <p className="text-xs text-muted-foreground">
                Automatic escalation emails for overdue feedback
              </p>
            </div>
            <Switch
              checked={config.escalation_emails_enabled}
              onCheckedChange={(checked) => updateConfig('escalation_emails_enabled', checked)}
              disabled={!config.emails_enabled}
            />
          </div>
        </div>

        {/* Warning for disabled state */}
        {!config.emails_enabled && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Safe Mode Active:</strong> All manager and escalation emails will be sent to 
              <code className="mx-1 px-1 bg-muted rounded">system-fallback@guest-glow.com</code>
              until you enable the master email toggle above.
            </AlertDescription>
          </Alert>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button 
            onClick={saveEmailConfig} 
            disabled={saving}
            className="min-w-32"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {config.emails_enabled ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-600" />
              Live email routing enabled
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 text-orange-600" />
              Safe mode - system fallback active
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
