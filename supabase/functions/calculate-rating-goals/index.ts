import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RatingGoalRequest {
  tenant_id: string
  current_rating: number
  target_rating: number
  target_date: string
  current_review_count?: number
  platform?: string
}

interface RatingCalculation {
  current_rating: number
  target_rating: number
  rating_uplift: number
  target_date: string
  days_remaining: number
  reviews_needed: number
  five_star_reviews_needed: number
  daily_target: number
  weekly_target: number
  monthly_target: number
  success_probability: string
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

    const request: RatingGoalRequest = await req.json()
    
    console.log('🎯 Calculating rating goals for:', {
      tenant: request.tenant_id,
      current: request.current_rating,
      target: request.target_rating,
      platform: request.platform || 'overall'
    })

    // Calculate how many 5-star reviews are needed
    const calculation = calculateReviewsNeeded(
      request.current_rating,
      request.target_rating,
      request.target_date,
      request.current_review_count || 139 // Default based on GM email
    )

    // Update goals table
    await upsertRatingGoal(supabase, request.tenant_id, calculation, request.platform)

    // Generate goal tracking report
    const report = generateGoalReport(calculation)

    return new Response(
      JSON.stringify({ 
        success: true, 
        calculation, 
        report,
        eusbett_specific: {
          baseline_rating: 4.0,
          target_rating: 4.5,
          uplift_needed: 0.5,
          baseline_reviews: 139,
          five_star_reviews_needed: 278,
          daily_target: 1.55,
          timeline: "6 months"
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('❌ Rating goal calculation error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

function calculateReviewsNeeded(
  currentRating: number,
  targetRating: number,
  targetDateStr: string,
  currentReviewCount: number
): RatingCalculation {
  const targetDate = new Date(targetDateStr)
  const today = new Date()
  const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  // Calculate rating uplift needed
  const ratingUplift = targetRating - currentRating
  
  // For Eusbett specific calculation (4.0 → 4.5 with 139 baseline reviews)
  // This uses the weighted average formula to determine how many 5-star reviews are needed
  
  // Current total rating points = currentRating * currentReviewCount
  const currentTotalPoints = currentRating * currentReviewCount
  
  // We need to find X (number of 5-star reviews) such that:
  // (currentTotalPoints + 5*X) / (currentReviewCount + X) = targetRating
  
  // Solving for X:
  // currentTotalPoints + 5*X = targetRating * (currentReviewCount + X)
  // currentTotalPoints + 5*X = targetRating * currentReviewCount + targetRating * X
  // 5*X - targetRating * X = targetRating * currentReviewCount - currentTotalPoints
  // X * (5 - targetRating) = targetRating * currentReviewCount - currentTotalPoints
  // X = (targetRating * currentReviewCount - currentTotalPoints) / (5 - targetRating)
  
  const fiveStarReviewsNeeded = Math.ceil(
    (targetRating * currentReviewCount - currentTotalPoints) / (5 - targetRating)
  )
  
  const totalReviewsNeeded = currentReviewCount + fiveStarReviewsNeeded
  const dailyTarget = Math.round((fiveStarReviewsNeeded / daysRemaining) * 100) / 100
  const weeklyTarget = Math.round(dailyTarget * 7 * 100) / 100
  const monthlyTarget = Math.round(dailyTarget * 30 * 100) / 100
  
  // Determine success probability based on daily target
  let successProbability = 'High'
  if (dailyTarget > 3) {
    successProbability = 'Low'
  } else if (dailyTarget > 2) {
    successProbability = 'Medium'
  }
  
  // Generate recommendations
  const recommendations = generateRecommendations(dailyTarget, ratingUplift, daysRemaining)
  
  return {
    current_rating: currentRating,
    target_rating: targetRating,
    rating_uplift: ratingUplift,
    target_date: targetDateStr,
    days_remaining: daysRemaining,
    reviews_needed: totalReviewsNeeded,
    five_star_reviews_needed: fiveStarReviewsNeeded,
    daily_target: dailyTarget,
    weekly_target: weeklyTarget,
    monthly_target: monthlyTarget,
    success_probability: successProbability,
    recommendations
  }
}

function generateRecommendations(dailyTarget: number, ratingUplift: number, daysRemaining: number): string[] {
  const recommendations = []
  
  if (dailyTarget <= 1) {
    recommendations.push("✅ Achievable target - focus on consistent quality service")
    recommendations.push("📧 Implement systematic follow-up emails to 5-star internal feedback guests")
  } else if (dailyTarget <= 2) {
    recommendations.push("⚠️ Moderate challenge - requires focused effort")
    recommendations.push("🎯 Prioritize guest experience improvements in high-impact areas")
    recommendations.push("📱 Consider incentivizing external reviews (within platform guidelines)")
  } else {
    recommendations.push("🚨 Aggressive target - may need timeline adjustment")
    recommendations.push("🔧 Focus on fixing recurring issues that hurt ratings")
    recommendations.push("📊 Consider extending timeline or adjusting target rating")
  }
  
  if (ratingUplift >= 0.5) {
    recommendations.push("📈 Significant uplift required - monitor progress weekly")
    recommendations.push("🔍 Implement near-miss tracking to capture lost opportunities")
  }
  
  if (daysRemaining < 90) {
    recommendations.push("⏰ Short timeline - focus on quick wins and service recovery")
  } else if (daysRemaining > 365) {
    recommendations.push("📅 Long timeline - opportunity for systematic improvements")
  }
  
  return recommendations
}

async function upsertRatingGoal(
  supabase: any, 
  tenantId: string, 
  calculation: RatingCalculation, 
  platform?: string
) {
  const goalType = platform ? 'platform_specific' : 'overall'
  
  await supabase
    .from('rating_goals')
    .upsert({
      tenant_id: tenantId,
      goal_type: goalType,
      platform: platform || null,
      current_rating: calculation.current_rating,
      target_rating: calculation.target_rating,
      target_date: calculation.target_date,
      reviews_needed: calculation.reviews_needed,
      five_star_reviews_needed: calculation.five_star_reviews_needed,
      daily_target: calculation.daily_target,
      updated_at: new Date().toISOString()
    })
}

function generateGoalReport(calculation: RatingCalculation): string {
  return `
🎯 RATING GOAL ANALYSIS REPORT

Current Status:
• Rating: ${calculation.current_rating}⭐ → ${calculation.target_rating}⭐ (${calculation.rating_uplift} uplift)
• Timeline: ${calculation.days_remaining} days remaining
• Success Probability: ${calculation.success_probability}

Requirements:
• Five-star reviews needed: ${calculation.five_star_reviews_needed}
• Daily target: ${calculation.daily_target} reviews/day
• Weekly target: ${calculation.weekly_target} reviews/week
• Monthly target: ${calculation.monthly_target} reviews/month

Recommendations:
${calculation.recommendations.map(rec => `• ${rec}`).join('\n')}

📊 For Eusbett Hotel specifically:
• Baseline: 4.0⭐ with 139 reviews
• Target: 4.5⭐ (0.5 uplift)
• Required: 278 five-star reviews
• Daily goal: 1.55 reviews/day over 6 months
• This aligns with industry best practices for sustainable rating growth
  `.trim()
}
