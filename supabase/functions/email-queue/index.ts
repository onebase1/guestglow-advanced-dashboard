import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QueueRequest {
  action: 'enqueue' | 'add' | 'process' | 'retry' | 'status' | 'clear'
  email_data?: any
  queue_id?: string
  max_retries?: number
}

interface EmailQueueItem {
  id: string
  email_type: string
  recipient_email: string
  subject: string
  html_content: string
  tenant_id: string
  tenant_slug: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'retry'
  attempts: number
  max_retries: number
  created_at: string
  scheduled_for?: string
  last_attempt?: string
  error_message?: string
  metadata?: any
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

    const request: QueueRequest = await req.json()
    console.log('📬 Email queue request:', request.action)

    let result
    switch (request.action) {
      case 'enqueue':
      case 'add': // Support both 'enqueue' and 'add' for compatibility
        result = await enqueueEmail(supabase, request)
        break
      case 'process':
        result = await processEmailQueue(supabase, request)
        break
      case 'retry':
        result = await retryFailedEmails(supabase, request)
        break
      case 'status':
        result = await getQueueStatus(supabase, request)
        break
      case 'clear':
        result = await clearQueue(supabase, request)
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
    console.error('❌ Email queue error:', error)
    
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
 * Add email to queue
 */
async function enqueueEmail(supabase: any, request: QueueRequest) {
  const emailData = request.email_data
  if (!emailData) {
    throw new Error('email_data is required for enqueue action')
  }

  const queueItem: Partial<EmailQueueItem> = {
    id: crypto.randomUUID(),
    email_type: emailData.email_type,
    recipient_email: emailData.recipient_email,
    subject: emailData.subject,
    html_content: emailData.html_content,
    tenant_id: emailData.tenant_id,
    tenant_slug: emailData.tenant_slug,
    priority: emailData.priority || 'normal',
    status: 'pending',
    attempts: 0,
    max_retries: request.max_retries || 3,
    created_at: new Date().toISOString(),
    scheduled_for: emailData.scheduled_for || new Date().toISOString(),
    metadata: {
      cc_emails: emailData.cc_emails,
      bcc_emails: emailData.bcc_emails,
      feedback_id: emailData.feedback_id,
      custom_note: emailData.custom_note
    }
  }

  // Create table if it doesn't exist
  await createEmailQueueTable(supabase)

  const { data, error } = await supabase
    .from('email_queue')
    .insert(queueItem)
    .select()
    .single()

  if (error) throw error

  console.log('📬 Email queued:', queueItem.id)
  return data
}

/**
 * Process email queue
 */
async function processEmailQueue(supabase: any, request: QueueRequest) {
  console.log('🔄 Processing email queue...')

  // Get pending emails ordered by priority and creation time
  const { data: queueItems, error } = await supabase
    .from('email_queue')
    .select('*')
    .in('status', ['pending', 'retry'])
    .lte('scheduled_for', new Date().toISOString())
    .order('priority', { ascending: false }) // urgent, high, normal, low
    .order('created_at', { ascending: true })
    .limit(10) // Process 10 at a time

  if (error) throw error

  const results = []
  for (const item of queueItems || []) {
    try {
      console.log(`📤 Processing email ${item.id} to ${item.recipient_email}`)
      
      // Mark as processing
      await supabase
        .from('email_queue')
        .update({ 
          status: 'processing',
          last_attempt: new Date().toISOString(),
          attempts: item.attempts + 1
        })
        .eq('id', item.id)

      // Send email via send-tenant-emails function
      const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-tenant-emails', {
        body: {
          email_type: item.email_type,
          recipient_email: item.recipient_email,
          cc_emails: item.metadata?.cc_emails,
          bcc_emails: item.metadata?.bcc_emails,
          subject: item.subject,
          html_content: item.html_content,
          tenant_id: item.tenant_id,
          tenant_slug: item.tenant_slug,
          priority: item.priority,
          feedback_id: item.metadata?.feedback_id,
          custom_note: item.metadata?.custom_note
        }
      })

      if (emailError) throw emailError

      // Mark as sent
      await supabase
        .from('email_queue')
        .update({ 
          status: 'sent',
          error_message: null,
          metadata: {
            ...item.metadata,
            email_id: emailResult.email_id,
            sent_at: new Date().toISOString()
          }
        })
        .eq('id', item.id)

      results.push({
        queue_id: item.id,
        recipient: item.recipient_email,
        success: true,
        email_id: emailResult.email_id
      })

      console.log(`✅ Email ${item.id} sent successfully`)
    } catch (error) {
      console.error(`❌ Failed to send email ${item.id}:`, error)
      
      // Determine if we should retry
      const shouldRetry = item.attempts < item.max_retries
      const newStatus = shouldRetry ? 'retry' : 'failed'
      
      // Calculate next retry time (exponential backoff)
      const nextRetryTime = shouldRetry 
        ? new Date(Date.now() + Math.pow(2, item.attempts) * 60000).toISOString() // 2^attempts minutes
        : null

      await supabase
        .from('email_queue')
        .update({ 
          status: newStatus,
          error_message: error.message,
          scheduled_for: nextRetryTime
        })
        .eq('id', item.id)

      results.push({
        queue_id: item.id,
        recipient: item.recipient_email,
        success: false,
        error: error.message,
        will_retry: shouldRetry,
        next_retry: nextRetryTime
      })
    }
  }

  return {
    processed: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  }
}

/**
 * Retry failed emails
 */
async function retryFailedEmails(supabase: any, request: QueueRequest) {
  console.log('🔄 Retrying failed emails...')

  // Reset failed emails to retry status
  const { data, error } = await supabase
    .from('email_queue')
    .update({ 
      status: 'retry',
      scheduled_for: new Date().toISOString(),
      error_message: null
    })
    .eq('status', 'failed')
    .lt('attempts', supabase.raw('max_retries'))
    .select()

  if (error) throw error

  console.log(`🔄 ${(data || []).length} failed emails reset for retry`)
  
  // Process the queue
  return await processEmailQueue(supabase, request)
}

/**
 * Get queue status
 */
async function getQueueStatus(supabase: any, request: QueueRequest) {
  const { data, error } = await supabase
    .from('email_queue')
    .select('status, priority, COUNT(*)')
    .group('status, priority')

  if (error) throw error

  // Get total counts by status
  const statusCounts = {}
  const priorityCounts = {}
  
  for (const row of data || []) {
    statusCounts[row.status] = (statusCounts[row.status] || 0) + row.count
    priorityCounts[row.priority] = (priorityCounts[row.priority] || 0) + row.count
  }

  // Get oldest pending email
  const { data: oldestPending } = await supabase
    .from('email_queue')
    .select('created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  return {
    status_counts: statusCounts,
    priority_counts: priorityCounts,
    total_queued: Object.values(statusCounts).reduce((sum: number, count: number) => sum + count, 0),
    oldest_pending: oldestPending?.created_at || null
  }
}

/**
 * Clear queue (remove sent/failed emails older than 7 days)
 */
async function clearQueue(supabase: any, request: QueueRequest) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('email_queue')
    .delete()
    .in('status', ['sent', 'failed'])
    .lt('created_at', sevenDaysAgo)
    .select()

  if (error) throw error

  console.log(`🗑️ Cleared ${(data || []).length} old queue items`)
  return { cleared: (data || []).length }
}

/**
 * Create email_queue table if it doesn't exist
 */
async function createEmailQueueTable(supabase: any) {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS email_queue (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email_type TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      html_content TEXT NOT NULL,
      tenant_id UUID NOT NULL,
      tenant_slug TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'retry')),
      attempts INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_attempt TIMESTAMP WITH TIME ZONE,
      error_message TEXT,
      metadata JSONB DEFAULT '{}'
    );
    
    CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
    CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_for) WHERE status IN ('pending', 'retry');
    CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON email_queue(priority, created_at);
    CREATE INDEX IF NOT EXISTS idx_email_queue_tenant ON email_queue(tenant_id);
  `

  try {
    await supabase.rpc('exec_sql', { sql: createTableSQL })
    console.log('✅ email_queue table created')
  } catch (error) {
    console.error('❌ Failed to create email_queue table:', error)
    // Continue anyway, table might already exist
  }
}
