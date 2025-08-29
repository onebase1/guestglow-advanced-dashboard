import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NearMissRequest {
  tenant_id: string
  days_lookback?: number
}

interface NearMissGuest {
  feedback_id: string
  guest_name: string
  guest_email: string
  internal_rating: number
  stay_date: string
  room_number?: string
  feedback_text?: string
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

    const { tenant_id, days_lookback = 30 }: NearMissRequest = await req.json()
    
    console.log('🔍 Detecting near-misses for tenant:', tenant_id)
    console.log('📅 Looking back:', days_lookback, 'days')

    // Find 5-star internal feedback from specified period
    const fiveStarFeedback = await getFiveStarFeedback(supabase, tenant_id, days_lookback)
    console.log('⭐ Found', fiveStarFeedback.length, '5-star internal feedback entries')

    // Check which guests haven't left external reviews
    const nearMisses: NearMissGuest[] = []
    
    for (const feedback of fiveStarFeedback) {
      if (!feedback.guest_email) continue // Skip if no email
      
      const hasExternalReview = await checkExternalReview(
        supabase,
        feedback.guest_email, 
        feedback.created_at,
        tenant_id
      )
      
      if (!hasExternalReview) {
        nearMisses.push({
          feedback_id: feedback.id,
          guest_name: feedback.guest_name || 'Guest',
          guest_email: feedback.guest_email,
          internal_rating: feedback.rating,
          stay_date: feedback.created_at,
          room_number: feedback.room_number,
          feedback_text: feedback.comment
        })
      }
    }

    console.log('🎯 Identified', nearMisses.length, 'near-miss opportunities')

    // Store near misses in database
    await storeNearMisses(supabase, nearMisses, tenant_id)

    // Send follow-up emails to near-miss guests
    const followUpResults = await sendNearMissFollowups(supabase, nearMisses, tenant_id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        near_misses_found: nearMisses.length,
        follow_ups_sent: followUpResults.sent,
        follow_ups_failed: followUpResults.failed,
        near_misses: nearMisses.map(nm => ({
          guest_name: nm.guest_name,
          guest_email: nm.guest_email,
          internal_rating: nm.internal_rating,
          stay_date: nm.stay_date,
          room_number: nm.room_number
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('❌ Near-miss detection error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function getFiveStarFeedback(supabase: any, tenantId: string, daysLookback: number) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysLookback)

  const { data, error } = await supabase
    .from('feedback')
    .select('id, guest_name, guest_email, rating, comment, room_number, created_at')
    .eq('tenant_id', tenantId)
    .eq('rating', 5)
    .gte('created_at', cutoffDate.toISOString())
    .not('guest_email', 'is', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching 5-star feedback:', error)
    return []
  }

  return data || []
}

async function checkExternalReview(
  supabase: any,
  guestEmail: string, 
  stayDate: string,
  tenantId: string
): Promise<boolean> {
  // Check if guest has left any external review within 30 days of their stay
  const stayDateTime = new Date(stayDate)
  const searchStart = new Date(stayDateTime.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days before
  const searchEnd = new Date(stayDateTime.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days after

  // First check by guest name (since external reviews might not have email)
  const { data: externalReviews, error } = await supabase
    .from('external_reviews')
    .select('id, guest_name, review_date')
    .eq('tenant_id', tenantId)
    .gte('review_date', searchStart.toISOString().split('T')[0])
    .lte('review_date', searchEnd.toISOString().split('T')[0])

  if (error) {
    console.error('Error checking external reviews:', error)
    return false
  }

  // For now, we'll use a simple name matching approach
  // In production, this could be enhanced with fuzzy matching or email correlation
  const guestName = guestEmail.split('@')[0].toLowerCase()
  
  const hasMatchingReview = externalReviews?.some(review => {
    if (!review.guest_name) return false
    const reviewerName = review.guest_name.toLowerCase()
    return reviewerName.includes(guestName) || guestName.includes(reviewerName.split(' ')[0])
  })

  return hasMatchingReview || false
}

async function storeNearMisses(supabase: any, nearMisses: NearMissGuest[], tenantId: string) {
  if (nearMisses.length === 0) return

  const nearMissRecords = nearMisses.map(nm => ({
    tenant_id: tenantId,
    guest_feedback_id: nm.feedback_id,
    internal_rating: nm.internal_rating,
    guest_email: nm.guest_email,
    guest_name: nm.guest_name,
    stay_date: nm.stay_date.split('T')[0], // Extract date part
    conversion_status: 'pending'
  }))

  const { error } = await supabase
    .from('near_miss_tracking')
    .upsert(nearMissRecords, { 
      onConflict: 'guest_feedback_id',
      ignoreDuplicates: false 
    })

  if (error) {
    console.error('Error storing near misses:', error)
  } else {
    console.log('✅ Stored', nearMissRecords.length, 'near-miss records')
  }
}

async function sendNearMissFollowups(
  supabase: any, 
  nearMisses: NearMissGuest[], 
  tenantId: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  // Get tenant information for personalization
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, slug')
    .eq('id', tenantId)
    .single()

  const hotelName = tenant?.name || 'Hotel'
  const tenantSlug = tenant?.slug || 'hotel'

  for (const nearMiss of nearMisses) {
    try {
      // Generate personalized follow-up email
      const emailContent = generateNearMissEmail(nearMiss, hotelName, tenantSlug)
      
      // Send email via Resend
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${hotelName} <noreply@guest-glow.com>`,
          to: [nearMiss.guest_email],
          subject: `Thank you for your wonderful 5-star feedback, ${nearMiss.guest_name}!`,
          html: emailContent
        })
      })

      if (emailResponse.ok) {
        sent++
        
        // Update near-miss record with follow-up timestamp
        await supabase
          .from('near_miss_tracking')
          .update({ followed_up_at: new Date().toISOString() })
          .eq('guest_feedback_id', nearMiss.feedback_id)
          
        console.log('✅ Sent near-miss follow-up to:', nearMiss.guest_email)
      } else {
        failed++
        console.error('❌ Failed to send near-miss follow-up to:', nearMiss.guest_email)
      }
    } catch (error) {
      failed++
      console.error('❌ Error sending near-miss follow-up:', error)
    }
  }

  return { sent, failed }
}

function generateNearMissEmail(nearMiss: NearMissGuest, hotelName: string, tenantSlug: string): string {
  const reviewLinks = {
    google: `https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID`,
    tripadvisor: `https://www.tripadvisor.com/UserReviewEdit-YOUR_HOTEL_ID`,
    booking: `https://www.booking.com/reviewcenter.html`
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thank you for your wonderful feedback!</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .stars { font-size: 24px; color: #fbbf24; margin: 10px 0; }
            .cta-section { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .review-button { background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; margin: 5px; }
            .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Thank you, ${nearMiss.guest_name}!</h1>
                <div class="stars">⭐⭐⭐⭐⭐</div>
                <p>We're thrilled you had such a wonderful experience at ${hotelName}</p>
            </div>

            <p>Dear ${nearMiss.guest_name},</p>

            <p>Thank you so much for your fantastic 5-star feedback about your recent stay${nearMiss.room_number ? ` in Room ${nearMiss.room_number}` : ''}! Your kind words truly made our day.</p>

            <p>We noticed you took the time to share your experience with us directly, and we're wondering if you'd be willing to help other travelers discover ${hotelName} by sharing your experience on one of these platforms:</p>

            <div class="cta-section">
                <h3>Share Your Experience</h3>
                <p>Your review helps other guests choose the perfect place for their stay!</p>
                
                <a href="${reviewLinks.google}" class="review-button">📍 Review on Google</a>
                <a href="${reviewLinks.tripadvisor}" class="review-button">✈️ Review on TripAdvisor</a>
                <a href="${reviewLinks.booking}" class="review-button">🏨 Review on Booking.com</a>
            </div>

            <p>Of course, this is completely optional, but it would mean the world to us and help other travelers discover the exceptional experience you enjoyed.</p>

            <p>Thank you again for choosing ${hotelName}, and we look forward to welcoming you back soon!</p>

            <p>Warm regards,<br>
            The ${hotelName} Team</p>

            <div class="footer">
                <p>This email was sent because you provided 5-star feedback to ${hotelName}</p>
                <p>If you prefer not to receive these follow-ups, please reply to let us know</p>
            </div>
        </div>
    </body>
    </html>
  `
}
