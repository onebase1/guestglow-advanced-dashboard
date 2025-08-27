/**
 * 📧 AUTONOMOUS EMAIL SYSTEM
 * 
 * Sends strategic, valuable emails to GM focusing on:
 * 1. Daily 5-star progress toward 4.5-star goal
 * 2. Weekly recurring issues analysis
 * 3. Urgent rating drop alerts
 * 4. Near-miss tracking (5-star guests who didn't review externally)
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Mail, 
  Clock, 
  Target, 
  AlertTriangle, 
  TrendingUp, 
  Star,
  Calendar,
  Settings,
  Send
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface EmailConfig {
  id: string
  email_type: string
  is_enabled: boolean
  send_frequency: string
  send_time: string
  subject_template: string
  content_template: string
  primary_recipient: string
  trigger_conditions: any
}

interface EmailPreview {
  subject: string
  content: string
  recipient: string
  send_time: string
  trigger_met: boolean
}

const EMAIL_TYPES = [
  {
    id: 'gm_daily_5star_progress',
    name: 'Daily 5-Star Progress',
    description: 'Daily progress toward 4.5-star goal',
    icon: <Star className="h-4 w-4 text-yellow-500" />,
    priority: 'high'
  },
  {
    id: 'gm_weekly_issues',
    name: 'Weekly Issues Report',
    description: 'Recurring problems and their impact',
    icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
    priority: 'high'
  },
  {
    id: 'gm_urgent_rating_alert',
    name: 'Urgent Rating Alert',
    description: 'Immediate alerts for rating drops',
    icon: <TrendingUp className="h-4 w-4 text-red-600" />,
    priority: 'critical'
  }
]

export function AutonomousEmailSystem() {
  const [emailConfigs, setEmailConfigs] = useState<EmailConfig[]>([])
  const [emailPreviews, setEmailPreviews] = useState<EmailPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [testMode, setTestMode] = useState(false)

  useEffect(() => {
    fetchEmailConfigs()
    generateEmailPreviews()
  }, [])

  const fetchEmailConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('autonomous_email_config')
        .select('*')
        .eq('tenant_id', 'eusbett-tenant-id') // Replace with actual tenant ID
        .order('email_type')

      if (error) throw error
      setEmailConfigs(data || [])

    } catch (error) {
      console.error('Error fetching email configs:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateEmailPreviews = async () => {
    try {
      // Get current performance data for email previews
      const { data: performance } = await supabase.rpc('get_performance_analytics', {
        p_tenant_slug: 'eusbett',
        p_days_back: 1
      })

      const { data: nearMisses } = await supabase.rpc('get_five_star_near_misses', {
        p_tenant_slug: 'eusbett',
        p_days_back: 7
      })

      // Calculate current metrics
      const currentRating = performance?.[0]?.current_rating || 4.0
      const fiveStarCount = performance?.[0]?.five_star_count || 0
      const reviewsNeeded = await supabase.rpc('calculate_five_star_reviews_needed', {
        p_current_rating: currentRating,
        p_current_review_count: 139,
        p_target_rating: 4.5
      })

      const daysRemaining = 180 // 6 months
      const dailyTarget = (reviewsNeeded.data || 278) / daysRemaining
      const nearMissCount = nearMisses?.reduce((sum: number, day: any) => sum + day.near_miss_count, 0) || 0

      // Generate previews for each email type
      const previews: EmailPreview[] = [
        {
          subject: `⭐ Daily 5-Star Progress: ${fiveStarCount} today (${((currentRating / 4.5) * 100).toFixed(1)}% to 4.5⭐ goal)`,
          content: `Good morning,

📊 **5-Star Progress Update**
• Today: ${fiveStarCount} five-star reviews
• This week: ${fiveStarCount * 7} five-star reviews  
• Target: ${dailyTarget.toFixed(1)} five-star reviews per day
• Status: ${fiveStarCount >= dailyTarget ? 'On Track' : 'Behind Target'}

🎯 **Goal Progress**
• Current rating: ${currentRating}⭐ (Target: 4.5⭐)
• Reviews needed: ${reviewsNeeded.data || 278} more 5-star reviews
• Days remaining: ${daysRemaining} days

💡 **Action Items**
${fiveStarCount < dailyTarget ? '• Focus on converting more 5-star guests to external reviews' : '• Great progress! Maintain current momentum'}
• Near misses this week: ${nearMissCount} (5-star guests who didn't review externally)

Best regards,
GuestGlow Analytics`,
          recipient: 'basera@btinternet.com',
          send_time: '08:00 AM daily',
          trigger_met: true
        },
        {
          subject: `🚨 Weekly Issues Report: 3 recurring problems identified`,
          content: `Weekly Issues Summary:

🔍 **Recurring Problems This Week**
• Room cleanliness (3 complaints)
• WiFi connectivity (2 complaints)  
• Breakfast service timing (2 complaints)

📉 **Impact on Rating**
• Low ratings (1-2⭐): 5 reviews
• Most common complaint: Room cleanliness
• Estimated rating impact: -0.2⭐

💡 **Recommended Actions**
• Increase housekeeping quality checks
• Upgrade WiFi infrastructure in problem areas
• Adjust breakfast service schedule

📊 **Department Performance**
• Housekeeping: 3 complaints (needs attention)
• F&B: 2 complaints (monitor closely)
• Front Desk: 0 complaints (excellent)

Best regards,
GuestGlow Analytics`,
          recipient: 'basera@btinternet.com',
          send_time: '09:00 AM Monday',
          trigger_met: true
        },
        {
          subject: `🚨 URGENT: Rating drop detected - Immediate action required`,
          content: `URGENT ALERT:

📉 **Rating Drop Detected**
• Current rating: 3.9⭐ (was 4.0⭐)
• Drop of: 0.1⭐
• Caused by: 2 recent 1-star ratings

🎯 **Impact on 4.5⭐ Goal**
• Additional 5-star reviews now needed: 15 more
• New daily target: 1.8 five-star reviews

⚡ **Immediate Actions Required**
• Contact recent 1-star guests for service recovery
• Implement immediate quality improvements
• Focus on converting today's 5-star guests

Best regards,
GuestGlow Analytics`,
          recipient: 'basera@btinternet.com',
          send_time: 'Immediate',
          trigger_met: false // Only when rating drops
        }
      ]

      setEmailPreviews(previews)

    } catch (error) {
      console.error('Error generating email previews:', error)
    }
  }

  const updateEmailConfig = async (configId: string, updates: Partial<EmailConfig>) => {
    try {
      const { error } = await supabase
        .from('autonomous_email_config')
        .update(updates)
        .eq('id', configId)

      if (error) throw error

      // Refresh configs
      await fetchEmailConfigs()

    } catch (error) {
      console.error('Error updating email config:', error)
    }
  }

  const sendTestEmail = async (emailType: string) => {
    setTestMode(true)
    try {
      const preview = emailPreviews.find(p => p.subject.includes(emailType))
      if (!preview) return

      // Send test email via Supabase function
      const { error } = await supabase.functions.invoke('send-tenant-emails', {
        body: {
          email_type: 'test_autonomous_email',
          recipient_email: preview.recipient,
          subject: `[TEST] ${preview.subject}`,
          html_content: preview.content.replace(/\n/g, '<br>'),
          tenant_id: 'eusbett-tenant-id',
          tenant_slug: 'eusbett',
          priority: 'normal'
        }
      })

      if (error) throw error

      console.log('Test email sent successfully')

    } catch (error) {
      console.error('Error sending test email:', error)
    } finally {
      setTestMode(false)
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>
      default:
        return <Badge variant="secondary">Normal</Badge>
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading email system...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Autonomous Email System</h2>
          <p className="text-muted-foreground">
            Strategic, valuable emails focused on 4.5-star goal and recurring issues
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium">Goal: 4.0 → 4.5 ⭐</span>
        </div>
      </div>

      {/* Email Configuration Cards */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {EMAIL_TYPES.map((emailType, index) => {
          const config = emailConfigs.find(c => c.email_type === emailType.id)
          const preview = emailPreviews[index]

          return (
            <Card key={emailType.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {emailType.icon}
                    <CardTitle className="text-lg">{emailType.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(emailType.priority)}
                    <Switch
                      checked={config?.is_enabled || false}
                      onCheckedChange={(enabled) => 
                        config && updateEmailConfig(config.id, { is_enabled: enabled })
                      }
                    />
                  </div>
                </div>
                <CardDescription>{emailType.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Email Preview */}
                {preview && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Email Preview</Label>
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      <div className="text-sm font-medium mb-1">To: {preview.recipient}</div>
                      <div className="text-sm font-medium mb-2">Subject: {preview.subject}</div>
                      <div className="text-xs text-gray-600 whitespace-pre-line max-h-32 overflow-y-auto">
                        {preview.content.substring(0, 300)}...
                      </div>
                    </div>
                  </div>
                )}

                {/* Configuration */}
                {config && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label>Frequency</Label>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        <span className="capitalize">{config.send_frequency}</span>
                      </div>
                    </div>
                    <div>
                      <Label>Send Time</Label>
                      <div className="flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        <span>{config.send_time}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendTestEmail(emailType.id)}
                    disabled={testMode}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Send Test
                  </Button>
                  <Button size="sm" variant="outline">
                    <Settings className="h-3 w-3 mr-1" />
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {emailConfigs.filter(c => c.is_enabled).length}
              </div>
              <div className="text-sm text-muted-foreground">Active Email Types</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">278</div>
              <div className="text-sm text-muted-foreground">5-Star Reviews Needed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">1.55</div>
              <div className="text-sm text-muted-foreground">Daily Target (5-star reviews)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
