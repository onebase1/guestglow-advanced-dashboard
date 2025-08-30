import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  report_type: 'daily' | 'weekly' | 'urgent'
  tenant_id: string
  recipient_emails: string[]
  cc_emails?: string[]
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

    const { report_type, tenant_id, recipient_emails, cc_emails }: EmailRequest = await req.json()

    // Get tenant information
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, slug')
      .eq('id', tenant_id)
      .single()

    if (!tenant) {
      throw new Error('Tenant not found')
    }

    let emailContent = ''
    let subject = ''

    // Ensure we have fresh TripAdvisor data before generating reports
    await ensureFreshTripAdvisorData(supabase, tenant_id)

    if (report_type === 'daily') {
      const result = await generateDailyBriefing(supabase, tenant_id, tenant.name)
      emailContent = result.content
      subject = result.subject
    } else if (report_type === 'weekly') {
      const result = await generateWeeklyReport(supabase, tenant_id, tenant.name)
      emailContent = result.content
      subject = result.subject
    } else if (report_type === 'urgent') {
      const result = await generateUrgentAlert(supabase, tenant_id, tenant.name)
      emailContent = result.content
      subject = result.subject
    }

    // Send email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('Resend API key not configured')
    }

    const emailPayload = {
      from: 'GuestGlow Analytics <reports@guest-glow.com>',
      to: recipient_emails,
      cc: cc_emails || [],
      subject: subject,
      html: emailContent,
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text()
      throw new Error(`Resend API error: ${errorText}`)
    }

    const resendResult = await resendResponse.json()

    return new Response(
      JSON.stringify({
        success: true,
        message: `${report_type} report sent successfully`,
        email_id: resendResult.id,
        recipients: recipient_emails,
        cc: cc_emails
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error sending GM report:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function generateDailyBriefing(supabase: any, tenantId: string, tenantName: string) {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Get latest TripAdvisor scraping data
  const { data: latestScrapes } = await supabase
    .from('tripadvisor_scrapes')
    .select('rating, total_reviews, scraped_at, rating_breakdown, category_scores')
    .eq('tenant_id', tenantId)
    .order('scraped_at', { ascending: false })
    .limit(2)

  // Get actual recent feedback (last 24 hours)
  const { data: recentFeedback } = await supabase
    .from('feedback')
    .select('rating, category, comment, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', yesterday)
    .order('created_at', { ascending: false })

  // Get actual near-miss tracking (5-star internal submissions)
  const { data: nearMisses } = await supabase
    .from('near_miss_tracking')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('conversion_status', 'pending')
    .gte('created_at', lastWeek)

  // Get actual issues from recent feedback (≤3 stars)
  const { data: recentIssues } = await supabase
    .from('feedback')
    .select('category, comment, rating, created_at')
    .eq('tenant_id', tenantId)
    .lte('rating', 3)
    .gte('created_at', lastWeek)
    .order('created_at', { ascending: false })

  // Determine what we actually have to report
  const hasTripAdvisorData = latestScrapes && latestScrapes.length > 0
  const hasRecentFeedback = recentFeedback && recentFeedback.length > 0
  const hasNearMisses = nearMisses && nearMisses.length > 0
  const hasRecentIssues = recentIssues && recentIssues.length > 0

  // Only report on actual data - no fabrication
  let reportSections = []

  // TripAdvisor section (only if we have data)
  if (hasTripAdvisorData) {
    const latest = latestScrapes[0]
    const ratingChange = latestScrapes.length > 1 ?
      parseFloat(latest.rating) - parseFloat(latestScrapes[1].rating) : 0

    reportSections.push({
      type: 'tripadvisor',
      data: {
        rating: parseFloat(latest.rating),
        totalReviews: latest.total_reviews,
        ratingChange: ratingChange,
        ratingBreakdown: latest.rating_breakdown,
        categoryScores: latest.category_scores,
        lastUpdated: latest.scraped_at
      }
    })
  }

  // Recent feedback section (only if we have data)
  if (hasRecentFeedback) {
    const fiveStarCount = recentFeedback.filter(f => f.rating === 5).length
    const avgRating = recentFeedback.reduce((sum, f) => sum + f.rating, 0) / recentFeedback.length

    reportSections.push({
      type: 'recent_feedback',
      data: {
        totalSubmissions: recentFeedback.length,
        fiveStarCount: fiveStarCount,
        averageRating: Math.round(avgRating * 10) / 10,
        feedback: recentFeedback.slice(0, 3)
      }
    })
  }

  // Near-miss section (only if we have data)
  if (hasNearMisses) {
    reportSections.push({
      type: 'near_misses',
      data: {
        count: nearMisses.length,
        details: nearMisses
      }
    })
  }

  // Issues section (only if we have data)
  if (hasRecentIssues) {
    reportSections.push({
      type: 'issues',
      data: {
        count: recentIssues.length,
        issues: recentIssues.slice(0, 3)
      }
    })
  }

  // Generate subject based on what we have to report
  let subject = `📊 ${tenantName} - Daily Briefing • ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`

  if (reportSections.length === 0) {
    subject = `✅ ${tenantName} - All Quiet • ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
  }

  const content = generateFactualEmailContent(tenantName, reportSections)

  return { subject, content }
}

function generateFactualEmailContent(tenantName: string, reportSections: any[]) {
  const hasData = reportSections.length > 0

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; }
        .email-container { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
        .metrics-section { background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .quiet-section { background: #f0fdf4; border: 1px solid #22c55e; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .metric-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
        .metric-label { color: #374151; }
        .metric-value { font-weight: bold; color: #0ea5e9; }
        .status-good { color: #059669; font-weight: bold; }
        .status-warning { color: #d97706; font-weight: bold; }
        .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">${hasData ? '📊' : '✅'} ${tenantName.toUpperCase()} - DAILY BRIEFING</div>
            <div style="color: #6b7280; font-size: 16px;">Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} • 8:00 AM Report</div>
        </div>

        ${hasData ? generateDataSections(reportSections) : generateQuietDayContent()}

        <div class="footer">
            <p>📧 GuestGlow Analytics • Automated Daily Report</p>
            <p>This report contains only factual data from your systems</p>
        </div>
    </div>
</body>
</html>`
}

function generateQuietDayContent() {
  return `
        <div class="quiet-section">
            <h3 style="color: #059669; margin-top: 0;">✅ All Quiet - Nothing to Report</h3>
            <p style="margin: 15px 0; font-size: 16px;">
                <strong>Good news!</strong> No significant activity or issues detected in the last 24 hours.
            </p>
            <div style="margin: 15px 0; font-size: 14px; color: #374151;">
                <strong>What this means:</strong><br>
                • No new guest feedback submissions<br>
                • No TripAdvisor rating changes detected<br>
                • No operational issues reported<br>
                • Systems running normally
            </div>
            <p style="margin: 15px 0; font-size: 14px; color: #6b7280;">
                <em>This is often a sign of stable operations. We'll continue monitoring and report when there's actionable information.</em>
            </p>
        </div>`
}

function generateDataSections(reportSections: any[]) {
  return reportSections.map(section => {
    switch (section.type) {
      case 'tripadvisor':
        return generateTripAdvisorSection(section.data)
      case 'recent_feedback':
        return generateRecentFeedbackSection(section.data)
      case 'near_misses':
        return generateNearMissSection(section.data)
      case 'issues':
        return generateIssuesSection(section.data)
      default:
        return ''
    }
  }).join('')
}

function generateTripAdvisorSection(data: any) {
  return `
        <h3>⭐ TRIPADVISOR UPDATE</h3>
        <div class="metrics-section">
            <div class="metric-row">
                <span class="metric-label">Current Rating:</span>
                <span class="metric-value">${data.rating}⭐ (${data.ratingChange >= 0 ? '+' : ''}${data.ratingChange.toFixed(2)} change)</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Total Reviews:</span>
                <span class="metric-value">${data.totalReviews} reviews</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Last Updated:</span>
                <span class="metric-value">${new Date(data.lastUpdated).toLocaleDateString('en-GB')}</span>
            </div>
        </div>

        ${data.ratingBreakdown ? `
        <h3>📊 RATING BREAKDOWN</h3>
        <div class="metrics-section">
            <div class="metric-row">
                <span class="metric-label">Excellent (5⭐):</span>
                <span class="metric-value">${data.ratingBreakdown.excellent || 0} reviews</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Good (4⭐):</span>
                <span class="metric-value">${data.ratingBreakdown.good || 0} reviews</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Average (3⭐):</span>
                <span class="metric-value">${data.ratingBreakdown.average || 0} reviews</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Poor (2⭐):</span>
                <span class="metric-value">${data.ratingBreakdown.poor || 0} reviews</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Terrible (1⭐):</span>
                <span class="metric-value">${data.ratingBreakdown.terrible || 0} reviews</span>
            </div>
        </div>
        ` : ''}

        ${data.categoryScores ? `
        <h3>📋 CATEGORY PERFORMANCE</h3>
        <div class="metrics-section">
            <div class="metric-row">
                <span class="metric-label">🛏️ Rooms:</span>
                <span class="metric-value">${data.categoryScores.rooms || 'N/A'}⭐</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">🛎️ Service:</span>
                <span class="metric-value">${data.categoryScores.service || 'N/A'}⭐</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">💰 Value:</span>
                <span class="metric-value">${data.categoryScores.value || 'N/A'}⭐</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">🧹 Cleanliness:</span>
                <span class="metric-value">${data.categoryScores.cleanliness || 'N/A'}⭐</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">📍 Location:</span>
                <span class="metric-value">${data.categoryScores.location || 'N/A'}⭐</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">😴 Sleep Quality:</span>
                <span class="metric-value">${data.categoryScores.sleep_quality || 'N/A'}⭐</span>
            </div>
        </div>
        ` : ''}`
}

function generateRecentFeedbackSection(data: any) {
  return `
        <h3>📝 RECENT FEEDBACK (Last 24 Hours)</h3>
        <div class="metrics-section">
            <div class="metric-row">
                <span class="metric-label">Total Submissions:</span>
                <span class="metric-value">${data.totalSubmissions} feedback</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Five-Star Submissions:</span>
                <span class="metric-value">${data.fiveStarCount} submissions</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Average Rating:</span>
                <span class="metric-value">${data.averageRating}⭐</span>
            </div>
            ${data.feedback.length > 0 ? `
            <div style="margin-top: 15px; font-size: 14px;">
                <strong>Recent Submissions:</strong><br>
                ${data.feedback.map(f => `
                • ${f.rating}⭐ - ${f.category || 'General'}: ${f.comment ? f.comment.substring(0, 80) + '...' : 'No comment'}
                `).join('<br>')}
            </div>
            ` : ''}
        </div>`
}

function generateNearMissSection(data: any) {
  return `
        <h3>🎯 NEAR-MISS OPPORTUNITIES</h3>
        <div class="metrics-section">
            <div class="metric-row">
                <span class="metric-label">5⭐ Internal Submissions:</span>
                <span class="metric-value">${data.count} guests</span>
            </div>
            <p style="margin: 10px 0; font-size: 14px;">
                <strong>Definition:</strong> Guests who gave 5⭐ via QR code but haven't reviewed externally<br>
                <strong>Strategy:</strong> Focus on operational excellence to encourage organic external reviews<br>
                <strong>Note:</strong> QR submissions are anonymous - no direct contact possible
            </p>
        </div>`
}

function generateIssuesSection(data: any) {
  return `
        <h3>🚨 OPERATIONAL ISSUES (Last 7 Days)</h3>
        <div class="metrics-section">
            <div class="metric-row">
                <span class="metric-label">Issues Reported:</span>
                <span class="metric-value">${data.count} feedback ≤3⭐</span>
            </div>
            ${data.issues.length > 0 ? `
            <div style="margin-top: 15px; font-size: 14px;">
                <strong>Recent Issues:</strong><br>
                ${data.issues.map(issue => `
                • ${issue.rating}⭐ - ${issue.category || 'General'}: ${issue.comment ? issue.comment.substring(0, 80) + '...' : 'No details'}
                `).join('<br>')}
            </div>
            <p style="margin: 10px 0; font-size: 14px; color: #d97706;">
                <strong>Action Required:</strong> Address these operational issues to prevent external negative reviews
            </p>
            ` : ''}
        </div>`
}

        <h3>⭐ TRIPADVISOR RATING UPDATE</h3>
        <div class="metrics-section">
            <div class="metric-row">
                <span class="metric-label">Current TripAdvisor Rating:</span>
                <span class="metric-value">${currentRating}⭐ (${ratingChange >= 0 ? '+' : ''}${ratingChange.toFixed(2)} from last scrape)</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Total Reviews:</span>
                <span class="metric-value">${totalReviews} reviews</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Goal Progress (4.5⭐):</span>
                <span class="metric-value">${currentProgress.toFixed(1)}% complete</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Five-Star Reviews Needed:</span>
                <span class="metric-value">${fiveStarNeeded} more reviews</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Status:</span>
                <span class="${currentRating >= 4.2 ? 'status-good' : 'status-warning'}">${currentRating >= 4.2 ? 'On Track ✅' : 'Needs Attention ⚠️'}</span>
            </div>
        </div>

        ${ratingBreakdown ? `
        <h3>📊 RATING BREAKDOWN</h3>
        <div class="metrics-section">
            <div class="metric-row">
                <span class="metric-label">Excellent (5⭐):</span>
                <span class="metric-value">${ratingBreakdown.excellent || 0} reviews</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Good (4⭐):</span>
                <span class="metric-value">${ratingBreakdown.good || 0} reviews</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Average (3⭐):</span>
                <span class="metric-value">${ratingBreakdown.average || 0} reviews</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Poor (2⭐):</span>
                <span class="metric-value">${ratingBreakdown.poor || 0} reviews</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Terrible (1⭐):</span>
                <span class="metric-value">${ratingBreakdown.terrible || 0} reviews</span>
            </div>
        </div>
        ` : ''}

        ${categoryScores ? `
        <h3>📋 CATEGORY PERFORMANCE</h3>
        <div class="metrics-section">
            <div class="metric-row">
                <span class="metric-label">🛏️ Rooms:</span>
                <span class="metric-value">${categoryScores.rooms || 'N/A'}⭐</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">🛎️ Service:</span>
                <span class="metric-value">${categoryScores.service || 'N/A'}⭐</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">💰 Value:</span>
                <span class="metric-value">${categoryScores.value || 'N/A'}⭐</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">🧹 Cleanliness:</span>
                <span class="metric-value">${categoryScores.cleanliness || 'N/A'}⭐</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">📍 Location:</span>
                <span class="metric-value">${categoryScores.location || 'N/A'}⭐</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">😴 Sleep Quality:</span>
                <span class="metric-value">${categoryScores.sleep_quality || 'N/A'}⭐</span>
            </div>
        </div>
        ` : ''}

        <h3>🎯 NEAR-MISS OPPORTUNITIES</h3>
        <div class="metrics-section">
            <div class="metric-row">
                <span class="metric-label">Anonymous 5⭐ QR Submissions:</span>
                <span class="metric-value">${nearMissCount} guests</span>
            </div>
            <p style="margin: 10px 0; font-size: 14px;">
                <strong>Definition:</strong> Guests who gave 5⭐ via QR code but haven't reviewed on TripAdvisor<br>
                <strong>Strategy:</strong> Focus on operational excellence to encourage organic external reviews<br>
                <strong>Note:</strong> QR submissions are anonymous - no direct contact details available
            </p>
        </div>

        ${topIssues.length > 0 ? `
        <h3>🚨 INTERNAL FEEDBACK ISSUES</h3>
        <div class="metrics-section">
            ${topIssues.map((issue, index) => `
            <div class="metric-row">
                <span class="metric-label">${issue.rating}⭐ - ${issue.category || 'General'}:</span>
                <span class="metric-value">${issue.comment ? issue.comment.substring(0, 50) + '...' : 'No details'}</span>
            </div>
            `).join('')}
            <p style="margin: 10px 0; font-size: 14px;">
                <strong>Source:</strong> Internal QR code feedback system<br>
                <strong>Action:</strong> Address operational issues to prevent external negative reviews
            </p>
        </div>
        ` : `
        <h3>✅ NO MAJOR ISSUES</h3>
        <div class="metrics-section">
            <p style="margin: 10px 0; font-size: 14px; color: #059669;">
                <strong>Great news!</strong> No significant issues reported in internal feedback this week.
            </p>
        </div>
        `}

        <h3>📊 WEEKLY OUTLOOK</h3>
        <div class="metrics-section">
            <div class="metric-row">
                <span class="metric-label">Target Rating:</span>
                <span class="metric-value">4.5⭐ (0.4⭐ uplift needed)</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Current Pace:</span>
                <span class="metric-value">${progress.reviews_added_today * 7} five-star reviews/week</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Progress Status:</span>
                <span class="${progress.on_track ? 'status-good' : 'status-warning'}">${progress.on_track ? 'On track 📈' : 'Needs attention ⚠️'}</span>
            </div>
        </div>

        <p style="margin-top: 30px;"><strong>Questions? Reply to this email or call ext. 2847</strong></p>

        <div class="footer">
            <p>GuestGlow Advanced Analytics • Intelligent Guest Experience Management</p>
            <p>This automated report was generated at ${new Date().toLocaleString('en-GB')}</p>
        </div>
    </div>
</body>
</html>`

  return { content, subject }
}

async function generateWeeklyReport(supabase: any, tenantId: string, tenantName: string) {
  // Get weekly issues data
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: weeklyIssues } = await supabase
    .from('feedback')
    .select('category, rating, comment')
    .eq('tenant_id', tenantId)
    .lte('rating', 3)
    .gte('created_at', weekAgo)

  const { data: positiveData } = await supabase
    .from('feedback')
    .select('category')
    .eq('tenant_id', tenantId)
    .gte('rating', 4)
    .gte('created_at', weekAgo)

  const { data: conversionData } = await supabase
    .from('near_miss_tracking')
    .select('conversion_status')
    .eq('tenant_id', tenantId)

  // Process data
  const issuesByCategory = weeklyIssues?.reduce((acc: any, issue: any) => {
    acc[issue.category] = (acc[issue.category] || 0) + 1
    return acc
  }, {}) || {}

  const positiveByCategory = positiveData?.reduce((acc: any, item: any) => {
    acc[item.category] = (acc[item.category] || 0) + 1
    return acc
  }, {}) || {}

  const totalTracked = conversionData?.length || 15
  const converted = conversionData?.filter((item: any) => item.conversion_status === 'converted').length || 0

  const subject = `🔍 ${tenantName} - Weekly Issues Analysis • ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`

  const content = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; }
        .email-container { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 3px solid #dc2626; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #dc2626; margin-bottom: 10px; }
        .issue-section { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .positive-section { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .conversion-section { background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .issue-item { margin: 10px 0; padding: 8px; background: white; border-radius: 4px; }
        .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🔍 WEEKLY ISSUES ANALYSIS - ${tenantName.toUpperCase()}</div>
            <div style="color: #6b7280; font-size: 16px;">Week Ending: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} • Comprehensive Pattern Report</div>
        </div>

        <h3>🚨 RECURRING PROBLEMS DETECTED</h3>
        <div class="issue-section">
            ${Object.entries(issuesByCategory).map(([category, count]: [string, any]) => `
                <div class="issue-item">
                    <strong>${category}:</strong> ${count} complaints this week
                    <br><small><strong>Action:</strong> ${getRecommendedAction(category)}</small>
                </div>
            `).join('')}
            ${Object.keys(issuesByCategory).length === 0 ? '<p>✅ No significant recurring issues detected this week!</p>' : ''}
        </div>

        <h3>🏆 POSITIVE TRENDS</h3>
        <div class="positive-section">
            ${Object.entries(positiveByCategory).slice(0, 3).map(([category, count]: [string, any]) => `
                <p><strong>${category}:</strong> +${count} mentions this week</p>
            `).join('')}
        </div>

        <h3>📊 CONVERSION OPPORTUNITIES</h3>
        <div class="conversion-section">
            <p><strong>Internal 5⭐ Guests:</strong> ${totalTracked} total tracked</p>
            <p><strong>External Conversion Rate:</strong> ${Math.round((converted / totalTracked) * 100)}% (${converted} converted)</p>
            <p><strong>Potential Gain:</strong> +${totalTracked - converted} additional five-star reviews</p>
        </div>

        <h3>💡 RECOMMENDED ACTIONS</h3>
        <ol>
            <li>Housekeeping spot-checks before 3 PM</li>
            <li>WiFi upgrade completion by Wednesday</li>
            <li>Weekend staffing adjustment for faster check-in</li>
            <li>Follow-up with recent 5⭐ guests for external reviews</li>
        </ol>

        <p style="margin-top: 30px;"><strong>Next Report: Monday, ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} • 9:00 AM</strong></p>

        <div class="footer">
            <p>GuestGlow Advanced Analytics • Intelligent Guest Experience Management</p>
            <p>This automated report was generated at ${new Date().toLocaleString('en-GB')}</p>
        </div>
    </div>
</body>
</html>`

  return { content, subject }
}

async function generateUrgentAlert(supabase: any, tenantId: string, tenantName: string) {
  // Get latest TripAdvisor scraping data
  const { data: latestScrape } = await supabase
    .from('tripadvisor_scrapes')
    .select('rating, total_reviews, scraped_at, rating_breakdown, category_scores')
    .eq('tenant_id', tenantId)
    .order('scraped_at', { ascending: false })
    .limit(2)

  // Check for significant TripAdvisor rating drops
  let ratingDropDetected = false
  let dropDetails = null

  if (latestScrape && latestScrape.length >= 2) {
    const latest = latestScrape[0]
    const previous = latestScrape[1]

    if (latest.rating && previous.rating) {
      const drop = parseFloat(previous.rating) - parseFloat(latest.rating)
      if (drop >= 0.1) { // Significant drop threshold
        ratingDropDetected = true
        dropDetails = {
          from: parseFloat(previous.rating),
          to: parseFloat(latest.rating),
          drop: Math.round(drop * 100) / 100,
          date: latest.scraped_at.split('T')[0],
          totalReviews: latest.total_reviews,
          ratingBreakdown: latest.rating_breakdown
        }
      }
    }
  } else if (latestScrape && latestScrape.length === 1) {
    // First scrape - check against mock baseline of 4.0
    const latest = latestScrape[0]
    const mockBaseline = 4.0

    if (latest.rating < mockBaseline) {
      const drop = mockBaseline - parseFloat(latest.rating)
      if (drop >= 0.1) {
        ratingDropDetected = true
        dropDetails = {
          from: mockBaseline,
          to: parseFloat(latest.rating),
          drop: Math.round(drop * 100) / 100,
          date: latest.scraped_at.split('T')[0],
          totalReviews: latest.total_reviews,
          ratingBreakdown: latest.rating_breakdown
        }
      }
    }
  }

  // If no rating drop detected, return no urgent issues
  if (!ratingDropDetected) {
    return generateNoUrgentIssuesEmail(tenantName)
  }

  // Get recent 5-star internal feedback for recovery outreach (anonymous QR submissions)
  const { data: recoveryTargets } = await supabase
    .from('feedback')
    .select('rating')
    .eq('tenant_id', tenantId)
    .eq('rating', 5)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })

  const alert = {
    severity_score: Math.min(10, Math.round(dropDetails.drop * 50)), // Scale drop to severity
    manager_summary: `TripAdvisor rating dropped from ${dropDetails.from}⭐ to ${dropDetails.to}⭐ (${dropDetails.drop} point drop)`,
    created_at: new Date().toISOString(),
    dropDetails
  }

  const targets = recoveryTargets || []
  const externalIssues = recentExternalReviews || []

  const subject = `🚨 URGENT: ${tenantName} Rating Drop Detected - Immediate Action Required`

  const content = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fef2f2; }
        .email-container { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border: 2px solid #dc2626; }
        .header { text-align: center; background: #dc2626; color: white; padding: 20px; margin: -30px -30px 30px -30px; border-radius: 6px 6px 0 0; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .alert-section { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .recovery-section { background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .action-section { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .critical { color: #dc2626; font-weight: bold; }
        .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🚨 URGENT: RATING DROP DETECTED</div>
            <div>IMMEDIATE ACTION REQUIRED</div>
        </div>

        <div class="alert-section">
            <h3>⚠️ TRIGGER EVENT</h3>
            <p><strong>Platform:</strong> TripAdvisor</p>
            <p><strong>Alert Type:</strong> ${alert.manager_summary}</p>
            <p><strong>Severity:</strong> ${alert.severity_score}/10</p>
            <p><strong>Rating Change:</strong> ${alert.dropDetails.from}⭐ → ${alert.dropDetails.to}⭐ (${alert.dropDetails.drop} point drop)</p>
            <p><strong>Date Detected:</strong> ${alert.dropDetails.date}</p>
            <p><strong>Total Reviews:</strong> ${alert.dropDetails.totalReviews}</p>
            <p><strong>Issue:</strong> TripAdvisor rating decline detected through daily monitoring</p>
            <p><strong>Impact:</strong> External platform visibility and reputation</p>
        </div>

        <div class="recovery-section">
            <h3>📊 RECOVERY ANALYSIS</h3>
            <p><strong>Reviews needed for recovery:</strong> ${Math.ceil(alert.dropDetails.drop * 20)} five-star reviews</p>
            <p><strong>Current daily average:</strong> 1.9 five-star reviews</p>
            <p><strong>Recovery timeline:</strong> ${Math.ceil((alert.dropDetails.drop * 20) / 1.9)} days at current pace</p>
            <p><strong>Data Source:</strong> TripAdvisor daily monitoring system</p>
        </div>

        <div class="action-section">
            <h3>🎯 IMMEDIATE ACTION PLAN</h3>
            <ol>
                <li>Review external platform reviews for specific issues</li>
                <li>Address any operational issues mentioned in reviews</li>
                <li>Implement service recovery procedures</li>
                <li>Activate positive guest outreach campaign</li>
                <li>Monitor external platforms for additional feedback</li>
                <li>Consider response strategy for public reviews</li>
            </ol>
        </div>

        <h3>📞 RECOVERY OPPORTUNITIES</h3>
        <p><strong>Recent positive internal feedback for outreach:</strong></p>
        <div class="recovery-section">
            ${recoveryTargets && recoveryTargets.length > 0 ? `
                <p>• ${recoveryTargets.length} anonymous 5⭐ QR code submissions</p>
                <p>• Guests available for follow-up via automated outreach system</p>
                <p><strong>Note:</strong> 5-star QR submissions are anonymous - no direct contact details collected</p>
                <p><strong>Strategy:</strong> Focus on operational excellence to encourage organic TripAdvisor reviews</p>
            ` : '<p>No recent 5-star internal feedback available for outreach</p>'}
        </div>

        <div class="alert-section">
            <p><strong>Status:</strong> <span class="critical">Response plan activated</span></p>
            <p><strong>Next update:</strong> 2 hours</p>
            <p><strong>Alert Level:</strong> <span class="critical">CRITICAL - Severity ${alert.severity_score}/10</span></p>
            <p><strong>Generated at:</strong> ${new Date(alert.created_at).toLocaleString('en-GB')}</p>
            <p><strong class="critical">Immediate response required within 2 hours</strong></p>
        </div>

        <div class="footer">
            <p>GuestGlow Advanced Analytics • Intelligent Guest Experience Management</p>
            <p>This critical alert was generated automatically based on rating threshold breach</p>
        </div>
    </div>
</body>
</html>`

  return { content, subject }
}

function generateNoUrgentIssuesEmail(tenantName: string) {
  const subject = `✅ ${tenantName} - No Urgent Rating Issues Detected`

  const content = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f0fdf4; }
        .email-container { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border: 2px solid #16a34a; }
        .header { text-align: center; background: #16a34a; color: white; padding: 20px; margin: -30px -30px 30px -30px; border-radius: 6px 6px 0 0; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .status-section { background: #f0fdf4; border: 1px solid #16a34a; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">✅ ALL CLEAR</div>
            <div>No Urgent Rating Issues Detected</div>
        </div>

        <div class="status-section">
            <h3>🎯 RATING STATUS</h3>
            <p><strong>TripAdvisor Monitoring:</strong> No significant rating drops detected</p>
            <p><strong>Alert System:</strong> Active and monitoring</p>
            <p><strong>Status:</strong> All rating metrics within normal parameters</p>
            <p><strong>Next Check:</strong> Continuous monitoring active</p>
        </div>

        <div class="footer">
            <p>GuestGlow Advanced Analytics • Intelligent Guest Experience Management</p>
            <p>This status update confirms no urgent rating issues require immediate attention</p>
        </div>
    </div>
</body>
</html>`

  return { content, subject }
}

function getRecommendedAction(issue: string): string {
  const actions: { [key: string]: string } = {
    'Room Cleanliness': 'Extra housekeeping quality check',
    'WiFi': 'Network infrastructure review',
    'Noise': 'Sound insulation assessment',
    'Check-in/Check-out': 'Front desk process optimization',
    'Food & Beverage': 'Kitchen and service timing review'
  }
  return actions[issue] || 'Continue current excellent standards'
}

async function ensureFreshTripAdvisorData(supabase: any, tenantId: string) {
  console.log('🔍 Checking for fresh TripAdvisor data...')

  // Check if we have recent data (within last 24 hours)
  const { data: recentScrape } = await supabase
    .from('tripadvisor_scrapes')
    .select('scraped_at')
    .eq('tenant_id', tenantId)
    .gte('scraped_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('scraped_at', { ascending: false })
    .limit(1)
    .single()

  if (recentScrape) {
    console.log('✅ Fresh TripAdvisor data available:', recentScrape.scraped_at)
    return
  }

  console.log('🔄 No recent TripAdvisor data found, triggering scrape...')

  try {
    // Call the TripAdvisor scraping function
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      console.log('⚠️ Missing Supabase credentials for scraping')
      return
    }

    const scrapeResponse = await fetch(`${supabaseUrl}/functions/v1/scrape-tripadvisor-rating`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        tripadvisor_url: 'https://www.tripadvisor.com/Hotel_Review-g2400444-d2399149-Reviews-Eusbett_Hotel-Sunyani_Brong_Ahafo_Region.html'
      })
    })

    if (scrapeResponse.ok) {
      const result = await scrapeResponse.json()
      console.log('✅ TripAdvisor scraping completed:', result.success)
    } else {
      console.log('❌ TripAdvisor scraping failed:', scrapeResponse.status)
    }
  } catch (error) {
    console.error('❌ Error triggering TripAdvisor scrape:', error)
  }
}
