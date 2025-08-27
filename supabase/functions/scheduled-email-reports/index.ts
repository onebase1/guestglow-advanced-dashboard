import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScheduledEmailRequest {
  report_type: 'daily' | 'weekly' | 'monthly'
  tenant_id?: string
  tenant_slug?: string
  recipients?: string[]
  date_range?: {
    start_date: string
    end_date: string
  }
}

interface ReportData {
  total_feedback: number
  average_rating: number
  five_star_count: number
  four_star_count: number
  three_star_count: number
  two_star_count: number
  one_star_count: number
  improvement_areas: string[]
  top_categories: Array<{category: string, count: number, avg_rating: number}>
  response_time_avg: number
  resolution_rate: number
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

    const request: ScheduledEmailRequest = await req.json()
    console.log('📊 Generating scheduled report:', {
      type: request.report_type,
      tenant: request.tenant_slug,
      recipients: request.recipients?.length || 0
    })

    // Generate report data
    const reportData = await generateReportData(supabase, request)
    
    // Get recipients (default to GM and operations)
    const recipients = request.recipients || await getDefaultRecipients(supabase, request.tenant_id)
    
    // Send report emails
    const results = []
    for (const recipient of recipients) {
      try {
        const emailResult = await sendReportEmail(supabase, request, reportData, recipient)
        results.push({ recipient, success: true, email_id: emailResult.email_id })
        console.log(`✅ Report sent to ${recipient}`)
      } catch (error) {
        console.error(`❌ Failed to send report to ${recipient}:`, error)
        results.push({ recipient, success: false, error: error.message })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        report_type: request.report_type,
        recipients_count: recipients.length,
        results,
        report_data: reportData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Scheduled email report failed:', error)
    
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
 * Generate report data from database
 */
async function generateReportData(supabase: any, request: ScheduledEmailRequest): Promise<ReportData> {
  const tenantId = request.tenant_id || '27843a9a-b53f-482a-87ba-1a3e52f55dc1' // Default to Eusbett
  
  // Calculate date range
  const dateRange = getDateRange(request.report_type, request.date_range)
  
  console.log('📊 Generating report data for:', {
    tenant: tenantId,
    type: request.report_type,
    dateRange
  })

  // Get feedback data
  const { data: feedbackData, error: feedbackError } = await supabase
    .from('feedback')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('created_at', dateRange.start_date)
    .lte('created_at', dateRange.end_date)

  if (feedbackError) {
    console.error('Error fetching feedback data:', feedbackError)
    throw new Error('Failed to fetch feedback data')
  }

  const feedback = feedbackData || []
  
  // Calculate metrics
  const totalFeedback = feedback.length
  const averageRating = totalFeedback > 0 
    ? Math.round((feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback) * 100) / 100
    : 0

  // Rating distribution
  const ratingCounts = {
    5: feedback.filter(f => f.rating === 5).length,
    4: feedback.filter(f => f.rating === 4).length,
    3: feedback.filter(f => f.rating === 3).length,
    2: feedback.filter(f => f.rating === 2).length,
    1: feedback.filter(f => f.rating === 1).length
  }

  // Category analysis
  const categoryStats = {}
  feedback.forEach(f => {
    if (!categoryStats[f.issue_category]) {
      categoryStats[f.issue_category] = { count: 0, totalRating: 0 }
    }
    categoryStats[f.issue_category].count++
    categoryStats[f.issue_category].totalRating += f.rating
  })

  const topCategories = Object.entries(categoryStats)
    .map(([category, stats]: [string, any]) => ({
      category,
      count: stats.count,
      avg_rating: Math.round((stats.totalRating / stats.count) * 100) / 100
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Improvement areas (categories with low ratings)
  const improvementAreas = topCategories
    .filter(cat => cat.avg_rating < 3.5)
    .map(cat => `${cat.category} (${cat.avg_rating}⭐ avg)`)

  // Response time and resolution rate (simplified)
  const resolvedFeedback = feedback.filter(f => f.resolved_at)
  const resolutionRate = totalFeedback > 0 
    ? Math.round((resolvedFeedback.length / totalFeedback) * 100)
    : 0

  const responseTimeAvg = resolvedFeedback.length > 0
    ? Math.round(resolvedFeedback.reduce((sum, f) => {
        const responseTime = new Date(f.resolved_at).getTime() - new Date(f.created_at).getTime()
        return sum + (responseTime / (1000 * 60 * 60)) // Convert to hours
      }, 0) / resolvedFeedback.length)
    : 0

  return {
    total_feedback: totalFeedback,
    average_rating: averageRating,
    five_star_count: ratingCounts[5],
    four_star_count: ratingCounts[4],
    three_star_count: ratingCounts[3],
    two_star_count: ratingCounts[2],
    one_star_count: ratingCounts[1],
    improvement_areas: improvementAreas,
    top_categories: topCategories,
    response_time_avg: responseTimeAvg,
    resolution_rate: resolutionRate
  }
}

/**
 * Get default recipients for reports
 */
async function getDefaultRecipients(supabase: any, tenantId?: string): Promise<string[]> {
  if (!tenantId) {
    // Default recipients for Eusbett
    return ['g.basera@yahoo.com', 'gizzy@guest-glow.com']
  }

  // Try to get from tenant email configuration
  const { data: emailConfig } = await supabase
    .from('tenant_email_config')
    .select('general_manager_email, operations_director_email')
    .eq('tenant_id', tenantId)
    .single()

  if (emailConfig) {
    return [
      emailConfig.general_manager_email,
      emailConfig.operations_director_email,
      'gizzy@guest-glow.com' // Always include system monitoring
    ].filter(email => email && email !== 'system-fallback@guest-glow.com')
  }

  // Fallback to default
  return ['g.basera@yahoo.com', 'gizzy@guest-glow.com']
}

/**
 * Send report email
 */
async function sendReportEmail(
  supabase: any, 
  request: ScheduledEmailRequest, 
  reportData: ReportData, 
  recipient: string
) {
  const subject = generateReportSubject(request.report_type, reportData)
  const htmlContent = generateReportHtml(request, reportData)

  return await supabase.functions.invoke('send-tenant-emails', {
    body: {
      email_type: `${request.report_type}_report`,
      recipient_email: recipient,
      bcc_emails: ['gizzy@guest-glow.com'],
      subject: subject,
      html_content: htmlContent,
      tenant_id: request.tenant_id || '27843a9a-b53f-482a-87ba-1a3e52f55dc1',
      tenant_slug: request.tenant_slug || 'eusbett',
      priority: 'normal'
    }
  })
}

/**
 * Generate report subject line
 */
function generateReportSubject(reportType: string, reportData: ReportData): string {
  const date = new Date().toLocaleDateString()
  const emoji = reportData.average_rating >= 4 ? '📈' : reportData.average_rating >= 3 ? '📊' : '📉'
  
  return `${emoji} ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Guest Experience Report - ${date} (${reportData.average_rating}⭐ avg)`
}

/**
 * Generate report HTML content
 */
function generateReportHtml(request: ScheduledEmailRequest, reportData: ReportData): string {
  const reportDate = new Date().toLocaleDateString()
  const reportType = request.report_type.charAt(0).toUpperCase() + request.report_type.slice(1)
  
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 700px;">
      <div style="background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">📊 ${reportType} Report</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">${reportDate}</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">${reportType} Performance Summary</h2>
        
        <!-- Key Metrics -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0;">
          <div style="background: white; padding: 15px; border-radius: 6px; text-align: center; border-left: 4px solid #2563eb;">
            <h3 style="color: #2563eb; margin: 0; font-size: 24px;">${reportData.total_feedback}</h3>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Total Feedback</p>
          </div>
          <div style="background: white; padding: 15px; border-radius: 6px; text-align: center; border-left: 4px solid #059669;">
            <h3 style="color: #059669; margin: 0; font-size: 24px;">${reportData.average_rating}⭐</h3>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Average Rating</p>
          </div>
          <div style="background: white; padding: 15px; border-radius: 6px; text-align: center; border-left: 4px solid #f59e0b;">
            <h3 style="color: #f59e0b; margin: 0; font-size: 24px;">${reportData.five_star_count}</h3>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">5-Star Reviews</p>
          </div>
          <div style="background: white; padding: 15px; border-radius: 6px; text-align: center; border-left: 4px solid #8b5cf6;">
            <h3 style="color: #8b5cf6; margin: 0; font-size: 24px;">${reportData.resolution_rate}%</h3>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Resolution Rate</p>
          </div>
        </div>
        
        <!-- Rating Distribution -->
        <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">⭐ Rating Distribution</h3>
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; text-align: center;">
            <div><strong>5⭐</strong><br>${reportData.five_star_count}</div>
            <div><strong>4⭐</strong><br>${reportData.four_star_count}</div>
            <div><strong>3⭐</strong><br>${reportData.three_star_count}</div>
            <div><strong>2⭐</strong><br>${reportData.two_star_count}</div>
            <div><strong>1⭐</strong><br>${reportData.one_star_count}</div>
          </div>
        </div>
        
        <!-- Top Categories -->
        ${reportData.top_categories.length > 0 ? `
        <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">📋 Top Feedback Categories</h3>
          ${reportData.top_categories.map(cat => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
              <span><strong>${cat.category}</strong></span>
              <span>${cat.count} reviews (${cat.avg_rating}⭐ avg)</span>
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        <!-- Improvement Areas -->
        ${reportData.improvement_areas.length > 0 ? `
        <div style="background: #fef3c7; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="color: #92400e; margin-top: 0;">🎯 Areas for Improvement</h3>
          <ul style="margin: 10px 0;">
            ${reportData.improvement_areas.map(area => `<li>${area}</li>`).join('')}
          </ul>
        </div>
        ` : `
        <div style="background: #d1fae5; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #059669;">
          <h3 style="color: #065f46; margin-top: 0;">🎉 Excellent Performance!</h3>
          <p style="margin: 10px 0;">All categories are performing well with ratings above 3.5 stars. Keep up the great work!</p>
        </div>
        `}
        
        <!-- Performance Metrics -->
        <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">⚡ Performance Metrics</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <p><strong>Average Response Time:</strong> ${reportData.response_time_avg} hours</p>
            </div>
            <div>
              <p><strong>Resolution Rate:</strong> ${reportData.resolution_rate}%</p>
            </div>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            <strong>GuestGlow Analytics</strong>
          </p>
          <p style="color: #999; font-size: 12px;">Generated on ${new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  `
}

/**
 * Calculate date range for report
 */
function getDateRange(reportType: string, customRange?: { start_date: string, end_date: string }) {
  if (customRange) {
    return customRange
  }

  const now = new Date()
  let startDate: Date

  switch (reportType) {
    case 'daily':
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 1)
      break
    case 'weekly':
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 7)
      break
    case 'monthly':
      startDate = new Date(now)
      startDate.setMonth(now.getMonth() - 1)
      break
    default:
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 1)
  }

  return {
    start_date: startDate.toISOString(),
    end_date: now.toISOString()
  }
}
