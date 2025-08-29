import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DailyProgressRequest {
  tenant_id: string
  date?: string
}

interface DailyMetrics {
  date: string
  overall_rating: number
  google_rating?: number
  booking_rating?: number
  tripadvisor_rating?: number
  total_reviews: number
  five_star_count: number
  reviews_added_today: number
  rating_change: number
  goal_progress_percentage: number
  on_track: boolean
  near_misses_today: number
  recurring_issues: string[]
  recommendations: string[]
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

    const { tenant_id, date }: DailyProgressRequest = await req.json()
    const reportDate = date || new Date().toISOString().split('T')[0]
    
    console.log('📊 Generating daily progress report for:', tenant_id, 'on', reportDate)

    // Calculate today's rating metrics
    const todayMetrics = await calculateDailyMetrics(supabase, tenant_id, reportDate)

    // Store in daily progress table
    await storeDailyProgress(supabase, tenant_id, todayMetrics)

    // Generate morning briefing email content
    const briefingContent = generateMorningBriefing(todayMetrics)

    // Send to GM and stakeholders
    const recipients = [
      'gm@eusbetthotel.com',
      'erbennett@gmail.com',
      'g.basera@yahoo.com',
      'gizzy@guest-glow.com'
    ]

    let emailsSent = 0
    for (const recipient of recipients) {
      try {
        await sendBriefingEmail(recipient, briefingContent, todayMetrics)
        emailsSent++
      } catch (error) {
        console.error(`Failed to send briefing to ${recipient}:`, error)
      }
    }

    // Check if urgent alerts needed
    if (todayMetrics.rating_change < -0.1) {
      await sendUrgentRatingAlert(supabase, tenant_id, todayMetrics)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        metrics: todayMetrics,
        briefings_sent: emailsSent,
        urgent_alert_sent: todayMetrics.rating_change < -0.1
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('❌ Daily progress report error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function calculateDailyMetrics(supabase: any, tenantId: string, date: string): Promise<DailyMetrics> {
  const today = new Date(date)
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  
  // Get all external reviews
  const { data: allReviews } = await supabase
    .from('external_reviews')
    .select('rating, platform, review_date')
    .eq('tenant_id', tenantId)

  // Get today's reviews
  const { data: todaysReviews } = await supabase
    .from('external_reviews')
    .select('rating, platform')
    .eq('tenant_id', tenantId)
    .eq('review_date', date)

  // Get yesterday's rating for comparison
  const { data: yesterdayProgress } = await supabase
    .from('daily_rating_progress')
    .select('overall_rating')
    .eq('tenant_id', tenantId)
    .eq('progress_date', yesterday.toISOString().split('T')[0])
    .single()

  // Get near misses from today
  const { data: nearMisses } = await supabase
    .from('near_miss_tracking')
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('created_at', date)
    .lt('created_at', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])

  // Get rating goal
  const { data: ratingGoal } = await supabase
    .from('rating_goals')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('goal_type', 'overall')
    .single()

  // Calculate metrics
  const totalReviews = allReviews?.length || 0
  const fiveStarCount = allReviews?.filter(r => r.rating === 5).length || 0
  const overallRating = totalReviews > 0 ? 
    allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0

  // Platform-specific ratings
  const googleReviews = allReviews?.filter(r => r.platform === 'google') || []
  const bookingReviews = allReviews?.filter(r => r.platform === 'booking.com') || []
  const tripadvisorReviews = allReviews?.filter(r => r.platform === 'tripadvisor') || []

  const googleRating = googleReviews.length > 0 ? 
    googleReviews.reduce((sum, r) => sum + r.rating, 0) / googleReviews.length : undefined
  const bookingRating = bookingReviews.length > 0 ? 
    bookingReviews.reduce((sum, r) => sum + r.rating, 0) / bookingReviews.length : undefined
  const tripadvisorRating = tripadvisorReviews.length > 0 ? 
    tripadvisorReviews.reduce((sum, r) => sum + r.rating, 0) / tripadvisorReviews.length : undefined

  const reviewsAddedToday = todaysReviews?.length || 0
  const ratingChange = yesterdayProgress?.overall_rating ? 
    overallRating - yesterdayProgress.overall_rating : 0

  // Calculate goal progress (Eusbett specific: need 278 five-star reviews)
  const goalProgressPercentage = ratingGoal ? 
    Math.min(100, (fiveStarCount / ratingGoal.five_star_reviews_needed) * 100) : 0

  // Determine if on track (need 1.55 reviews per day for Eusbett)
  const dailyTarget = ratingGoal?.daily_target || 1.55
  const onTrack = reviewsAddedToday >= dailyTarget * 0.8 // Allow 20% variance

  // Analyze recurring issues (simplified for now)
  const recurringIssues = await analyzeRecurringIssues(supabase, tenantId)
  
  // Generate recommendations
  const recommendations = generateRecommendations(overallRating, reviewsAddedToday, dailyTarget, onTrack)

  return {
    date,
    overall_rating: Math.round(overallRating * 10) / 10,
    google_rating: googleRating ? Math.round(googleRating * 10) / 10 : undefined,
    booking_rating: bookingRating ? Math.round(bookingRating * 10) / 10 : undefined,
    tripadvisor_rating: tripadvisorRating ? Math.round(tripadvisorRating * 10) / 10 : undefined,
    total_reviews: totalReviews,
    five_star_count: fiveStarCount,
    reviews_added_today: reviewsAddedToday,
    rating_change: Math.round(ratingChange * 100) / 100,
    goal_progress_percentage: Math.round(goalProgressPercentage * 10) / 10,
    on_track: onTrack,
    near_misses_today: nearMisses?.length || 0,
    recurring_issues: recurringIssues,
    recommendations
  }
}

async function analyzeRecurringIssues(supabase: any, tenantId: string): Promise<string[]> {
  // Get recent negative feedback to identify patterns
  const { data: recentFeedback } = await supabase
    .from('feedback')
    .select('comment, category')
    .eq('tenant_id', tenantId)
    .lte('rating', 3)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  const issues: string[] = []
  
  if (recentFeedback && recentFeedback.length > 0) {
    const categories = recentFeedback.reduce((acc, f) => {
      if (f.category) {
        acc[f.category] = (acc[f.category] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    // Identify categories with 2+ complaints
    Object.entries(categories).forEach(([category, count]) => {
      if (count >= 2) {
        issues.push(`${category}: ${count} complaints this week`)
      }
    })
  }

  return issues
}

function generateRecommendations(
  overallRating: number, 
  reviewsToday: number, 
  dailyTarget: number, 
  onTrack: boolean
): string[] {
  const recommendations = []

  if (!onTrack) {
    recommendations.push("📈 Behind daily target - focus on guest experience improvements")
    recommendations.push("📧 Increase follow-up emails to 5-star internal feedback guests")
  }

  if (overallRating < 4.2) {
    recommendations.push("🔧 Address recurring service issues to improve baseline rating")
  }

  if (reviewsToday === 0) {
    recommendations.push("⚠️ No reviews today - check QR code placement and guest engagement")
  }

  if (overallRating >= 4.3) {
    recommendations.push("✅ Strong rating performance - maintain current service standards")
  }

  return recommendations
}

async function storeDailyProgress(supabase: any, tenantId: string, metrics: DailyMetrics) {
  await supabase
    .from('daily_rating_progress')
    .upsert({
      tenant_id: tenantId,
      progress_date: metrics.date,
      overall_rating: metrics.overall_rating,
      google_rating: metrics.google_rating,
      booking_rating: metrics.booking_rating,
      tripadvisor_rating: metrics.tripadvisor_rating,
      total_reviews: metrics.total_reviews,
      five_star_count: metrics.five_star_count,
      four_star_count: 0, // Would be calculated from actual data
      three_star_count: 0,
      two_star_count: 0,
      one_star_count: 0,
      reviews_added_today: metrics.reviews_added_today,
      rating_change: metrics.rating_change,
      goal_progress_percentage: metrics.goal_progress_percentage,
      on_track: metrics.on_track
    })
}

function generateMorningBriefing(metrics: DailyMetrics): string {
  const statusEmoji = metrics.on_track ? '✅' : '⚠️'
  const changeEmoji = metrics.rating_change > 0 ? '📈' : metrics.rating_change < 0 ? '📉' : '➡️'
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Daily Rating Progress - ${metrics.date}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
            .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
            .metric-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; text-align: center; }
            .metric-value { font-size: 24px; font-weight: bold; color: #2563eb; }
            .metric-label { font-size: 12px; color: #6b7280; margin-top: 5px; }
            .status-banner { padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; font-weight: bold; }
            .on-track { background: #d1fae5; color: #065f46; }
            .behind { background: #fef2f2; color: #991b1b; }
            .recommendations { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 15px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🌟 Daily Rating Progress</h1>
                <p>${metrics.date} • Eusbett Hotel</p>
            </div>

            <div class="status-banner ${metrics.on_track ? 'on-track' : 'behind'}">
                ${statusEmoji} Status: ${metrics.on_track ? 'On Track' : 'Behind Target'}
            </div>

            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${metrics.overall_rating}⭐</div>
                    <div class="metric-label">Overall Rating ${changeEmoji} ${metrics.rating_change >= 0 ? '+' : ''}${metrics.rating_change}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${metrics.reviews_added_today}</div>
                    <div class="metric-label">Reviews Added Yesterday</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${metrics.goal_progress_percentage}%</div>
                    <div class="metric-label">Progress to 4.5⭐ Goal</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${metrics.near_misses_today}</div>
                    <div class="metric-label">Near Misses (Lost Opportunities)</div>
                </div>
            </div>

            <h3>📊 Platform Breakdown</h3>
            <ul>
                ${metrics.google_rating ? `<li><strong>Google:</strong> ${metrics.google_rating}⭐</li>` : ''}
                ${metrics.booking_rating ? `<li><strong>Booking.com:</strong> ${metrics.booking_rating}⭐</li>` : ''}
                ${metrics.tripadvisor_rating ? `<li><strong>TripAdvisor:</strong> ${metrics.tripadvisor_rating}⭐</li>` : ''}
                <li><strong>Total Reviews:</strong> ${metrics.total_reviews} (${metrics.five_star_count} five-star)</li>
            </ul>

            ${metrics.recurring_issues.length > 0 ? `
            <h3>🔍 Recurring Issues</h3>
            <ul>
                ${metrics.recurring_issues.map(issue => `<li>${issue}</li>`).join('')}
            </ul>
            ` : ''}

            <div class="recommendations">
                <h3>💡 Today's Recommendations</h3>
                <ul>
                    ${metrics.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>

            <p><small>This automated report is generated daily at 8:00 AM to track progress toward the 4.5⭐ rating goal.</small></p>
        </div>
    </body>
    </html>
  `
}

async function sendBriefingEmail(recipient: string, content: string, metrics: DailyMetrics) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'GuestGlow Analytics <reports@guest-glow.com>',
      to: [recipient],
      subject: `📊 Daily Rating Progress: ${metrics.overall_rating}⭐ ${metrics.on_track ? '✅ On Track' : '⚠️ Behind Target'}`,
      html: content
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to send email to ${recipient}`)
  }
}

async function sendUrgentRatingAlert(supabase: any, tenantId: string, metrics: DailyMetrics) {
  // Implementation for urgent rating drop alerts
  console.log('🚨 Urgent rating alert triggered for rating drop:', metrics.rating_change)
  // This would send immediate alerts to management
}
