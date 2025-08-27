import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScheduleRequest {
  action: 'schedule' | 'trigger' | 'list' | 'cancel'
  schedule_type?: 'daily' | 'weekly' | 'monthly'
  schedule_id?: string
  tenant_id?: string
  recipients?: string[]
  cron_expression?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const request: ScheduleRequest = await req.json()
    console.log('📅 Email scheduler request:', request.action)

    let result
    switch (request.action) {
      case 'schedule':
        result = await scheduleEmails(supabase, request)
        break
      case 'trigger':
        result = await triggerScheduledEmails(supabase, request)
        break
      case 'list':
        result = await listScheduledEmails(supabase, request)
        break
      case 'cancel':
        result = await cancelScheduledEmail(supabase, request)
        break
      default:
        throw new Error(`Unknown action: ${request.action}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: request.action,
        result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Email scheduler error:', error)
    
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

/**
 * Schedule recurring emails
 */
async function scheduleEmails(supabase: any, request: ScheduleRequest) {
  const scheduleConfig = {
    id: crypto.randomUUID(),
    tenant_id: request.tenant_id || '27843a9a-b53f-482a-87ba-1a3e52f55dc1',
    schedule_type: request.schedule_type || 'daily',
    recipients: request.recipients || ['g.basera@yahoo.com', 'gizzy@guest-glow.com'],
    cron_expression: request.cron_expression || getCronExpression(request.schedule_type || 'daily'),
    is_active: true,
    created_at: new Date().toISOString(),
    next_run: calculateNextRun(request.cron_expression || getCronExpression(request.schedule_type || 'daily'))
  }

  // Store schedule in database
  const { data, error } = await supabase
    .from('email_schedules')
    .insert(scheduleConfig)
    .select()
    .single()

  if (error) {
    // If table doesn't exist, create it
    if (error.code === '42P01') {
      await createEmailSchedulesTable(supabase)
      // Retry insert
      const { data: retryData, error: retryError } = await supabase
        .from('email_schedules')
        .insert(scheduleConfig)
        .select()
        .single()
      
      if (retryError) throw retryError
      return retryData
    }
    throw error
  }

  console.log('✅ Email schedule created:', scheduleConfig.id)
  return data
}

/**
 * Trigger scheduled emails (called by cron or manually)
 */
async function triggerScheduledEmails(supabase: any, request: ScheduleRequest) {
  console.log('🚀 Triggering scheduled emails...')
  
  // Get active schedules that are due
  const now = new Date().toISOString()
  const { data: schedules, error } = await supabase
    .from('email_schedules')
    .select('*')
    .eq('is_active', true)
    .lte('next_run', now)

  if (error) {
    console.error('Error fetching schedules:', error)
    return { triggered: 0, errors: [error.message] }
  }

  const results = []
  for (const schedule of schedules || []) {
    try {
      console.log(`📊 Triggering ${schedule.schedule_type} report for tenant ${schedule.tenant_id}`)
      
      // Call the scheduled email reports function
      const { data: reportResult, error: reportError } = await supabase.functions.invoke('scheduled-email-reports', {
        body: {
          report_type: schedule.schedule_type,
          tenant_id: schedule.tenant_id,
          recipients: schedule.recipients
        }
      })

      if (reportError) throw reportError

      // Update next run time
      const nextRun = calculateNextRun(schedule.cron_expression)
      await supabase
        .from('email_schedules')
        .update({ 
          next_run: nextRun,
          last_run: now,
          run_count: (schedule.run_count || 0) + 1
        })
        .eq('id', schedule.id)

      results.push({
        schedule_id: schedule.id,
        schedule_type: schedule.schedule_type,
        success: true,
        recipients_count: reportResult.recipients_count,
        next_run: nextRun
      })

      console.log(`✅ ${schedule.schedule_type} report sent successfully`)
    } catch (error) {
      console.error(`❌ Failed to send ${schedule.schedule_type} report:`, error)
      results.push({
        schedule_id: schedule.id,
        schedule_type: schedule.schedule_type,
        success: false,
        error: error.message
      })
    }
  }

  return {
    triggered: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  }
}

/**
 * List scheduled emails
 */
async function listScheduledEmails(supabase: any, request: ScheduleRequest) {
  const query = supabase
    .from('email_schedules')
    .select('*')
    .order('created_at', { ascending: false })

  if (request.tenant_id) {
    query.eq('tenant_id', request.tenant_id)
  }

  const { data, error } = await query

  if (error) throw error

  return {
    schedules: data || [],
    count: (data || []).length,
    active_count: (data || []).filter(s => s.is_active).length
  }
}

/**
 * Cancel scheduled email
 */
async function cancelScheduledEmail(supabase: any, request: ScheduleRequest) {
  if (!request.schedule_id) {
    throw new Error('schedule_id is required for cancel action')
  }

  const { data, error } = await supabase
    .from('email_schedules')
    .update({ is_active: false, cancelled_at: new Date().toISOString() })
    .eq('id', request.schedule_id)
    .select()
    .single()

  if (error) throw error

  console.log('🚫 Email schedule cancelled:', request.schedule_id)
  return data
}

/**
 * Get cron expression for schedule type
 */
function getCronExpression(scheduleType: string): string {
  const expressions = {
    daily: '0 9 * * *',     // 9 AM daily
    weekly: '0 9 * * 1',    // 9 AM every Monday
    monthly: '0 9 1 * *'    // 9 AM on 1st of every month
  }
  return expressions[scheduleType] || expressions.daily
}

/**
 * Calculate next run time based on cron expression
 */
function calculateNextRun(cronExpression: string): string {
  // Simplified next run calculation
  // In production, you'd use a proper cron parser library
  const now = new Date()
  
  if (cronExpression === '0 9 * * *') { // Daily at 9 AM
    const nextRun = new Date(now)
    nextRun.setDate(now.getDate() + 1)
    nextRun.setHours(9, 0, 0, 0)
    return nextRun.toISOString()
  } else if (cronExpression === '0 9 * * 1') { // Weekly on Monday at 9 AM
    const nextRun = new Date(now)
    const daysUntilMonday = (1 + 7 - now.getDay()) % 7 || 7
    nextRun.setDate(now.getDate() + daysUntilMonday)
    nextRun.setHours(9, 0, 0, 0)
    return nextRun.toISOString()
  } else if (cronExpression === '0 9 1 * *') { // Monthly on 1st at 9 AM
    const nextRun = new Date(now)
    nextRun.setMonth(now.getMonth() + 1, 1)
    nextRun.setHours(9, 0, 0, 0)
    return nextRun.toISOString()
  }
  
  // Default to next day
  const nextRun = new Date(now)
  nextRun.setDate(now.getDate() + 1)
  nextRun.setHours(9, 0, 0, 0)
  return nextRun.toISOString()
}

/**
 * Create email_schedules table if it doesn't exist
 */
async function createEmailSchedulesTable(supabase: any) {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS email_schedules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly')),
      recipients JSONB NOT NULL DEFAULT '[]',
      cron_expression TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      next_run TIMESTAMP WITH TIME ZONE NOT NULL,
      last_run TIMESTAMP WITH TIME ZONE,
      run_count INTEGER DEFAULT 0,
      cancelled_at TIMESTAMP WITH TIME ZONE
    );
    
    CREATE INDEX IF NOT EXISTS idx_email_schedules_next_run ON email_schedules(next_run) WHERE is_active = true;
    CREATE INDEX IF NOT EXISTS idx_email_schedules_tenant ON email_schedules(tenant_id);
  `

  try {
    await supabase.rpc('exec_sql', { sql: createTableSQL })
    console.log('✅ email_schedules table created')
  } catch (error) {
    console.error('❌ Failed to create email_schedules table:', error)
    // Continue anyway, table might already exist
  }
}
