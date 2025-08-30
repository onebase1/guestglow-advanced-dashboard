import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const now = new Date()
    const hour = now.getHours()
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    const minute = now.getMinutes()

    console.log(`Scheduled check at ${now.toISOString()}: Hour=${hour}, Day=${dayOfWeek}, Minute=${minute}`)

    // Daily Briefing - Every day at 8:00 AM
    if (hour === 8 && minute === 0) {
      console.log('Triggering Daily Briefing...')
      await sendGMReport('daily')
    }

    // Weekly Report - Every Monday at 9:00 AM
    if (dayOfWeek === 1 && hour === 9 && minute === 0) {
      console.log('Triggering Weekly Report...')
      await sendGMReport('weekly')
    }

    // Check for urgent alerts - Every 15 minutes during business hours (7 AM - 11 PM)
    if (hour >= 7 && hour <= 23 && minute % 15 === 0) {
      console.log('Checking for urgent alerts...')
      await checkUrgentAlerts(supabase)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Scheduled check completed',
        timestamp: now.toISOString(),
        actions_taken: []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in scheduled reports:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function sendGMReport(reportType: 'daily' | 'weekly' | 'urgent') {
  try {
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-gm-reports`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        report_type: reportType,
        tenant_id: '27843a9a-b53f-482a-87ba-1a3e52f55dc1', // Eusbett Hotel
        recipient_emails: ['g.basera@yahoo.com'],
        cc_emails: ['gizzy@guest-glow.com']
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to send ${reportType} report: ${response.status}`)
    }

    const result = await response.json()
    console.log(`✅ ${reportType} report sent successfully:`, result)
    return result

  } catch (error) {
    console.error(`❌ Error sending ${reportType} report:`, error)
    throw error
  }
}

async function checkUrgentAlerts(supabase: any) {
  try {
    // Check for recent critical alerts that haven't been sent
    const { data: alerts } = await supabase
      .from('external_review_alerts')
      .select('*')
      .eq('tenant_id', '27843a9a-b53f-482a-87ba-1a3e52f55dc1')
      .eq('critical_alert_needed', true)
      .eq('manager_email_sent', false)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour

    if (alerts && alerts.length > 0) {
      console.log(`Found ${alerts.length} urgent alerts to send`)
      
      for (const alert of alerts) {
        await sendGMReport('urgent')
        
        // Mark alert as sent
        await supabase
          .from('external_review_alerts')
          .update({ 
            manager_email_sent: true,
            manager_notified_at: new Date().toISOString()
          })
          .eq('id', alert.id)
      }
    }

    // Also check for rating drops in daily progress
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const { data: progress } = await supabase
      .from('daily_rating_progress')
      .select('*')
      .eq('tenant_id', '27843a9a-b53f-482a-87ba-1a3e52f55dc1')
      .eq('progress_date', yesterdayStr)
      .single()

    if (progress && progress.rating_change < -0.1) {
      console.log(`Significant rating drop detected: ${progress.rating_change}`)
      
      // Create alert record if not exists
      const { data: existingAlert } = await supabase
        .from('external_review_alerts')
        .select('id')
        .eq('tenant_id', '27843a9a-b53f-482a-87ba-1a3e52f55dc1')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .single()

      if (!existingAlert) {
        await supabase
          .from('external_review_alerts')
          .insert({
            tenant_id: '27843a9a-b53f-482a-87ba-1a3e52f55dc1',
            external_review_id: null,
            critical_alert_needed: true,
            severity_score: 10,
            primary_issues: ['rating_drop'],
            recommended_actions: ['immediate_response', 'guest_outreach'],
            urgency_level: 'critical',
            manager_summary: `Rating drop detected: ${progress.rating_change} stars`,
            requires_immediate_response: true,
            potential_escalation_risk: 'high',
            suggested_response_timeline: 'immediate',
            manager_email_sent: false
          })

        await sendGMReport('urgent')
      }
    }

  } catch (error) {
    console.error('Error checking urgent alerts:', error)
  }
}
