import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyticsRequest {
  action: 'track' | 'report' | 'webhook' | 'dashboard'
  event_type?: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained'
  email_id?: string
  tenant_id?: string
  date_range?: {
    start_date: string
    end_date: string
  }
  webhook_data?: any
}

interface EmailAnalytics {
  total_sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  complained: number
  delivery_rate: number
  open_rate: number
  click_rate: number
  bounce_rate: number
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

    const request: AnalyticsRequest = await req.json()
    console.log('📊 Email analytics request:', request.action)

    let result
    switch (request.action) {
      case 'track':
        result = await trackEmailEvent(supabase, request)
        break
      case 'report':
        result = await generateAnalyticsReport(supabase, request)
        break
      case 'webhook':
        result = await handleResendWebhook(supabase, request)
        break
      case 'dashboard':
        result = await getDashboardData(supabase, request)
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
    console.error('❌ Email analytics error:', error)
    
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
 * Track email event
 */
async function trackEmailEvent(supabase: any, request: AnalyticsRequest) {
  if (!request.email_id || !request.event_type) {
    throw new Error('email_id and event_type are required for track action')
  }

  // Create table if it doesn't exist
  await createEmailAnalyticsTable(supabase)

  const eventData = {
    id: crypto.randomUUID(),
    email_id: request.email_id,
    event_type: request.event_type,
    timestamp: new Date().toISOString(),
    metadata: request.webhook_data || {}
  }

  const { data, error } = await supabase
    .from('email_analytics')
    .insert(eventData)
    .select()
    .single()

  if (error) throw error

  console.log(`📊 Email event tracked: ${request.event_type} for ${request.email_id}`)
  return data
}

/**
 * Generate analytics report
 */
async function generateAnalyticsReport(supabase: any, request: AnalyticsRequest): Promise<EmailAnalytics> {
  const tenantId = request.tenant_id || '27843a9a-b53f-482a-87ba-1a3e52f55dc1'
  const dateRange = getDateRange(request.date_range)

  console.log('📊 Generating analytics report for:', {
    tenant: tenantId,
    dateRange
  })

  // Get communication logs for the period
  const { data: communications, error: commError } = await supabase
    .from('communication_logs')
    .select('external_id, status, created_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'sent')
    .gte('created_at', dateRange.start_date)
    .lte('created_at', dateRange.end_date)

  if (commError) throw commError

  const totalSent = communications?.length || 0
  const emailIds = communications?.map(c => c.external_id).filter(Boolean) || []

  if (emailIds.length === 0) {
    return {
      total_sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0,
      delivery_rate: 0,
      open_rate: 0,
      click_rate: 0,
      bounce_rate: 0
    }
  }

  // Get analytics events for these emails
  const { data: events, error: eventsError } = await supabase
    .from('email_analytics')
    .select('email_id, event_type')
    .in('email_id', emailIds)
    .gte('timestamp', dateRange.start_date)
    .lte('timestamp', dateRange.end_date)

  if (eventsError) throw eventsError

  // Count events by type
  const eventCounts = {
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    complained: 0
  }

  const uniqueEvents = new Set()
  for (const event of events || []) {
    const key = `${event.email_id}-${event.event_type}`
    if (!uniqueEvents.has(key)) {
      uniqueEvents.add(key)
      eventCounts[event.event_type] = (eventCounts[event.event_type] || 0) + 1
    }
  }

  // Calculate rates
  const delivered = eventCounts.delivered || totalSent // Assume delivered if no bounce
  const deliveryRate = totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0
  const openRate = delivered > 0 ? Math.round((eventCounts.opened / delivered) * 100) : 0
  const clickRate = eventCounts.opened > 0 ? Math.round((eventCounts.clicked / eventCounts.opened) * 100) : 0
  const bounceRate = totalSent > 0 ? Math.round((eventCounts.bounced / totalSent) * 100) : 0

  return {
    total_sent: totalSent,
    delivered: delivered,
    opened: eventCounts.opened,
    clicked: eventCounts.clicked,
    bounced: eventCounts.bounced,
    complained: eventCounts.complained,
    delivery_rate: deliveryRate,
    open_rate: openRate,
    click_rate: clickRate,
    bounce_rate: bounceRate
  }
}

/**
 * Handle Resend webhook events
 */
async function handleResendWebhook(supabase: any, request: AnalyticsRequest) {
  const webhookData = request.webhook_data
  if (!webhookData) {
    throw new Error('webhook_data is required for webhook action')
  }

  console.log('🔗 Processing Resend webhook:', webhookData.type)

  // Map Resend event types to our event types
  const eventTypeMap = {
    'email.sent': 'delivered',
    'email.delivered': 'delivered',
    'email.opened': 'opened',
    'email.clicked': 'clicked',
    'email.bounced': 'bounced',
    'email.complained': 'complained'
  }

  const eventType = eventTypeMap[webhookData.type]
  if (!eventType) {
    console.log(`⚠️ Unknown webhook event type: ${webhookData.type}`)
    return { processed: false, reason: 'Unknown event type' }
  }

  // Extract email ID from webhook data
  const emailId = webhookData.data?.email_id || webhookData.data?.id
  if (!emailId) {
    console.log('⚠️ No email ID found in webhook data')
    return { processed: false, reason: 'No email ID' }
  }

  // Track the event
  await trackEmailEvent(supabase, {
    action: 'track',
    email_id: emailId,
    event_type: eventType,
    webhook_data: webhookData
  })

  return { 
    processed: true, 
    email_id: emailId, 
    event_type: eventType 
  }
}

/**
 * Get dashboard data
 */
async function getDashboardData(supabase: any, request: AnalyticsRequest) {
  const tenantId = request.tenant_id || '27843a9a-b53f-482a-87ba-1a3e52f55dc1'
  
  // Get analytics for different time periods
  const today = await generateAnalyticsReport(supabase, {
    ...request,
    tenant_id: tenantId,
    date_range: {
      start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date().toISOString()
    }
  })

  const thisWeek = await generateAnalyticsReport(supabase, {
    ...request,
    tenant_id: tenantId,
    date_range: {
      start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date().toISOString()
    }
  })

  const thisMonth = await generateAnalyticsReport(supabase, {
    ...request,
    tenant_id: tenantId,
    date_range: {
      start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date().toISOString()
    }
  })

  // Get email type breakdown
  const { data: emailTypes, error: typesError } = await supabase
    .from('communication_logs')
    .select('email_type, COUNT(*)')
    .eq('tenant_id', tenantId)
    .eq('status', 'sent')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .group('email_type')

  if (typesError) throw typesError

  return {
    today,
    this_week: thisWeek,
    this_month: thisMonth,
    email_types: emailTypes || [],
    last_updated: new Date().toISOString()
  }
}

/**
 * Get date range for analytics
 */
function getDateRange(customRange?: { start_date: string, end_date: string }) {
  if (customRange) {
    return customRange
  }

  // Default to last 30 days
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  return {
    start_date: thirtyDaysAgo.toISOString(),
    end_date: now.toISOString()
  }
}

/**
 * Create email_analytics table if it doesn't exist
 */
async function createEmailAnalyticsTable(supabase: any) {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS email_analytics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email_id TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK (event_type IN ('delivered', 'opened', 'clicked', 'bounced', 'complained')),
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_email_analytics_email_id ON email_analytics(email_id);
    CREATE INDEX IF NOT EXISTS idx_email_analytics_event_type ON email_analytics(event_type);
    CREATE INDEX IF NOT EXISTS idx_email_analytics_timestamp ON email_analytics(timestamp);
    
    -- Unique constraint to prevent duplicate events
    CREATE UNIQUE INDEX IF NOT EXISTS idx_email_analytics_unique 
    ON email_analytics(email_id, event_type, DATE_TRUNC('minute', timestamp));
  `

  try {
    await supabase.rpc('exec_sql', { sql: createTableSQL })
    console.log('✅ email_analytics table created')
  } catch (error) {
    console.error('❌ Failed to create email_analytics table:', error)
    // Continue anyway, table might already exist
  }
}
