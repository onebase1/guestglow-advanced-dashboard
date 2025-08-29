import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncRequest {
  tenant_id: string
  platforms: string[]
}

interface ExternalReview {
  platform: string
  platform_review_id: string
  guest_name?: string
  rating: number
  review_text?: string
  review_date: string
  platform_url?: string
  verified_stay: boolean
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

    const { tenant_id, platforms }: SyncRequest = await req.json()

    console.log('🔄 Starting external review sync for tenant:', tenant_id)
    console.log('📱 Platforms to sync:', platforms)

    const syncResults = []

    for (const platform of platforms) {
      try {
        console.log(`🔍 Syncing reviews from ${platform}...`)
        const reviews = await fetchPlatformReviews(platform, tenant_id)
        const syncResult = await syncReviewsToDatabase(supabase, reviews, tenant_id, platform)
        syncResults.push({ platform, ...syncResult })
        
        // Check for rating drops
        await checkRatingDropAlerts(supabase, tenant_id, platform)
        
      } catch (error) {
        console.error(`❌ Failed to sync ${platform} reviews:`, error)
        syncResults.push({ platform, success: false, error: error.message })
      }
    }

    // Update daily progress
    await updateDailyProgress(supabase, tenant_id)

    return new Response(
      JSON.stringify({ success: true, syncResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('❌ External review sync error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function fetchPlatformReviews(platform: string, tenantId: string): Promise<ExternalReview[]> {
  // For now, return mock data - in production this would call actual APIs
  console.log(`📊 Fetching ${platform} reviews for tenant ${tenantId}`)
  
  // Mock data for demonstration
  const mockReviews: ExternalReview[] = [
    {
      platform,
      platform_review_id: `${platform}_${Date.now()}_1`,
      guest_name: 'John Smith',
      rating: 4,
      review_text: 'Great hotel with excellent service. The room was clean and comfortable.',
      review_date: new Date().toISOString(),
      platform_url: `https://${platform}.com/review/123`,
      verified_stay: true
    },
    {
      platform,
      platform_review_id: `${platform}_${Date.now()}_2`,
      guest_name: 'Sarah Johnson',
      rating: 5,
      review_text: 'Outstanding experience! Will definitely return.',
      review_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      platform_url: `https://${platform}.com/review/124`,
      verified_stay: true
    }
  ]

  return mockReviews
}

async function syncReviewsToDatabase(
  supabase: any, 
  reviews: ExternalReview[], 
  tenantId: string, 
  platform: string
): Promise<{ success: boolean; synced: number; skipped: number; error?: string }> {
  let synced = 0
  let skipped = 0

  for (const review of reviews) {
    try {
      // Check if review already exists
      const { data: existing } = await supabase
        .from('external_reviews')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('platform', platform)
        .eq('platform_review_id', review.platform_review_id)
        .single()

      if (existing) {
        skipped++
        continue
      }

      // Insert new review
      const { error } = await supabase
        .from('external_reviews')
        .insert({
          tenant_id: tenantId,
          platform: review.platform,
          platform_review_id: review.platform_review_id,
          guest_name: review.guest_name,
          rating: review.rating,
          review_text: review.review_text,
          review_date: review.review_date,
          platform_url: review.platform_url,
          verified: review.verified_stay,
          response_required: review.rating <= 3 // Require response for low ratings
        })

      if (error) {
        console.error('Failed to insert review:', error)
        continue
      }

      synced++
    } catch (error) {
      console.error('Error processing review:', error)
      continue
    }
  }

  return { success: true, synced, skipped }
}

async function checkRatingDropAlerts(supabase: any, tenantId: string, platform: string) {
  try {
    // Get recent rating average
    const { data: recentReviews } = await supabase
      .from('external_reviews')
      .select('rating')
      .eq('tenant_id', tenantId)
      .eq('platform', platform)
      .gte('review_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('review_date', { ascending: false })

    if (!recentReviews || recentReviews.length === 0) return

    const recentAverage = recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length

    // Get historical average (last 30 days before the recent 7 days)
    const { data: historicalReviews } = await supabase
      .from('external_reviews')
      .select('rating')
      .eq('tenant_id', tenantId)
      .eq('platform', platform)
      .gte('review_date', new Date(Date.now() - 37 * 24 * 60 * 60 * 1000).toISOString()) // 37 days ago
      .lt('review_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // 7 days ago
      .order('review_date', { ascending: false })

    if (!historicalReviews || historicalReviews.length === 0) return

    const historicalAverage = historicalReviews.reduce((sum, r) => sum + r.rating, 0) / historicalReviews.length
    const ratingDrop = historicalAverage - recentAverage

    // Alert if rating dropped by more than 0.3 points
    if (ratingDrop > 0.3) {
      console.log(`🚨 Rating drop alert: ${platform} rating dropped by ${ratingDrop.toFixed(2)} points`)
      
      // In production, this would send an urgent alert email
      await supabase.functions.invoke('send-urgent-rating-alert', {
        body: {
          tenant_id: tenantId,
          platform,
          rating_drop: ratingDrop,
          recent_average: recentAverage,
          historical_average: historicalAverage
        }
      })
    }
  } catch (error) {
    console.error('Error checking rating drop alerts:', error)
  }
}

async function updateDailyProgress(supabase: any, tenantId: string) {
  try {
    const today = new Date().toISOString().split('T')[0]

    // Calculate today's metrics
    const { data: allReviews } = await supabase
      .from('external_reviews')
      .select('rating, platform')
      .eq('tenant_id', tenantId)

    if (!allReviews || allReviews.length === 0) return

    // Calculate overall metrics
    const totalReviews = allReviews.length
    const overallRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    
    const ratingCounts = {
      five_star: allReviews.filter(r => r.rating === 5).length,
      four_star: allReviews.filter(r => r.rating === 4).length,
      three_star: allReviews.filter(r => r.rating === 3).length,
      two_star: allReviews.filter(r => r.rating === 2).length,
      one_star: allReviews.filter(r => r.rating === 1).length
    }

    // Calculate platform-specific ratings
    const googleReviews = allReviews.filter(r => r.platform === 'google')
    const bookingReviews = allReviews.filter(r => r.platform === 'booking.com')
    const tripadvisorReviews = allReviews.filter(r => r.platform === 'tripadvisor')

    const googleRating = googleReviews.length > 0 ? 
      googleReviews.reduce((sum, r) => sum + r.rating, 0) / googleReviews.length : null
    const bookingRating = bookingReviews.length > 0 ? 
      bookingReviews.reduce((sum, r) => sum + r.rating, 0) / bookingReviews.length : null
    const tripadvisorRating = tripadvisorReviews.length > 0 ? 
      tripadvisorReviews.reduce((sum, r) => sum + r.rating, 0) / tripadvisorReviews.length : null

    // Upsert daily progress
    await supabase
      .from('daily_rating_progress')
      .upsert({
        tenant_id: tenantId,
        progress_date: today,
        overall_rating: Math.round(overallRating * 10) / 10,
        google_rating: googleRating ? Math.round(googleRating * 10) / 10 : null,
        booking_rating: bookingRating ? Math.round(bookingRating * 10) / 10 : null,
        tripadvisor_rating: tripadvisorRating ? Math.round(tripadvisorRating * 10) / 10 : null,
        total_reviews: totalReviews,
        five_star_count: ratingCounts.five_star,
        four_star_count: ratingCounts.four_star,
        three_star_count: ratingCounts.three_star,
        two_star_count: ratingCounts.two_star,
        one_star_count: ratingCounts.one_star,
        reviews_added_today: 0, // Would be calculated from today's synced reviews
        rating_change: 0.0, // Would be calculated from yesterday's rating
        goal_progress_percentage: 0.0, // Would be calculated from rating goals
        on_track: true
      })

    console.log('✅ Daily progress updated successfully')
  } catch (error) {
    console.error('Error updating daily progress:', error)
  }
}
