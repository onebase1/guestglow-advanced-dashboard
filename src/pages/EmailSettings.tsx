/**
 * 📧 EMAIL SETTINGS PAGE
 * 
 * Dedicated page for managing tenant email configuration
 * Safe-by-default system with master toggle controls
 */

import { TenantEmailConfigForm } from '@/components/TenantEmailConfigForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, Shield, Mail } from 'lucide-react'

export default function EmailSettings() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Email Settings</h1>
          <p className="text-muted-foreground">
            Configure email addresses for guest communications and manager notifications.
            Safe by default - no real emails sent until explicitly enabled.
          </p>
        </div>

        {/* Important Notice */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Safe Mode Active:</strong> The system is currently in safe mode. All manager emails 
            go to <code className="px-1 bg-muted rounded">system-fallback@guest-glow.com</code> until 
            you configure and enable real email addresses below.
          </AlertDescription>
        </Alert>

        {/* Email Configuration Form */}
        <TenantEmailConfigForm />

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              How Email Routing Works
            </CardTitle>
            <CardDescription>
              Understanding the email flow and escalation system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">📧 Current Email Flow</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Guest submits feedback</li>
                  <li>• Guest gets confirmation email</li>
                  <li>• Manager gets alert email</li>
                  <li>• System monitoring via BCC</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">⏰ SLA Escalation</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 30 min: Reminder if unacknowledged</li>
                  <li>• 4 hours: Escalate to General Manager</li>
                  <li>• 8 hours: Escalate to Operations Director</li>
                  <li>• 12+ hours: Final escalation level</li>
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">🔒 Security Features</h4>
              <div className="grid gap-2 md:grid-cols-3 text-sm text-muted-foreground">
                <div>
                  <strong>Safe by Default:</strong> No real emails until enabled
                </div>
                <div>
                  <strong>Master Toggle:</strong> One switch controls all emails
                </div>
                <div>
                  <strong>Individual Controls:</strong> Enable specific email types
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Quick Setup Guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">1</div>
                <div>
                  <p className="font-medium">Configure Email Addresses</p>
                  <p className="text-sm text-muted-foreground">Enter your real manager email addresses in the form above</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">2</div>
                <div>
                  <p className="font-medium">Test Configuration</p>
                  <p className="text-sm text-muted-foreground">Submit test feedback to verify emails work correctly</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">3</div>
                <div>
                  <p className="font-medium">Enable Live Emails</p>
                  <p className="text-sm text-muted-foreground">Turn on the master toggle to start sending real emails</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
