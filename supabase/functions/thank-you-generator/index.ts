import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ThankYouRequest {
  reviewText: string
  rating: number
  isExternal: boolean
  guestName: string
  tenant_id: string
  tenant_slug: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const request: ThankYouRequest = await req.json()
    console.log('🙏 Generating thank you response for:', {
      guest: request.guestName,
      rating: request.rating,
      tenant: request.tenant_slug
    })

    const response = generateThankYouResponse(request)

    return new Response(
      JSON.stringify({
        success: true,
        response: response,
        guest_name: request.guestName,
        rating: request.rating
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Failed to generate thank you response:', error)
    
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
 * Generate personalized thank you response based on rating and feedback
 */
function generateThankYouResponse(request: ThankYouRequest): string {
  const hotelName = request.tenant_slug.charAt(0).toUpperCase() + request.tenant_slug.slice(1) + ' Hotel'
  const guestName = request.guestName || 'Guest'
  
  if (request.rating >= 4) {
    return generatePositiveResponse(guestName, hotelName, request.rating)
  } else if (request.rating === 3) {
    return generateNeutralResponse(guestName, hotelName)
  } else {
    return generateNegativeResponse(guestName, hotelName, request.reviewText)
  }
}

/**
 * Generate response for positive ratings (4-5 stars)
 */
function generatePositiveResponse(guestName: string, hotelName: string, rating: number): string {
  const responses = [
    `Dear ${guestName},

Thank you so much for your wonderful ${rating}-star review! We're absolutely delighted to hear that you had such a positive experience with us.

Your kind words mean the world to our team, and we'll be sure to share your feedback with everyone who contributed to making your stay special.

We would be honored to welcome you back anytime, and we'll continue working hard to exceed your expectations.

If you enjoyed your stay, we'd be grateful if you could share your experience on TripAdvisor or Google Reviews to help other travelers discover what makes ${hotelName} special.

Warm regards,
The ${hotelName} Team`,

    `Dear ${guestName},

What fantastic news to receive your ${rating}-star rating! Thank you for taking the time to share your positive experience with us.

It's guests like you who make our work so rewarding. We're thrilled that we were able to provide you with the exceptional service and comfort you deserve.

We hope to have the pleasure of hosting you again soon. Until then, we'll keep working to maintain the high standards that made your stay memorable.

With sincere appreciation,
The ${hotelName} Guest Relations Team`
  ]
  
  return responses[Math.floor(Math.random() * responses.length)]
}

/**
 * Generate response for neutral ratings (3 stars)
 */
function generateNeutralResponse(guestName: string, hotelName: string): string {
  return `Dear ${guestName},

Thank you for your feedback and for choosing ${hotelName} for your stay.

We appreciate you taking the time to share your experience with us. While we're glad you stayed with us, we recognize that your experience may not have been everything you hoped for.

Your feedback is valuable to us as we continuously work to improve our services and facilities. We'd welcome the opportunity to learn more about your stay and how we can better serve you in the future.

If you have any specific suggestions or concerns you'd like to discuss, please don't hesitate to reach out to us directly.

We hope to have another chance to exceed your expectations on a future visit.

Best regards,
The ${hotelName} Management Team`
}

/**
 * Generate response for negative ratings (1-2 stars)
 */
function generateNegativeResponse(guestName: string, hotelName: string, reviewText: string): string {
  const hasSpecificIssues = reviewText && reviewText.length > 20 && reviewText !== 'Anonymous low rating feedback - guest chose not to provide details'
  
  if (hasSpecificIssues) {
    return `Dear ${guestName},

Thank you for bringing your concerns to our attention. We sincerely apologize that your experience at ${hotelName} did not meet your expectations.

We take all guest feedback seriously, and your comments have been immediately forwarded to our management team for review and action. We are committed to addressing the issues you've raised to ensure they don't affect future guests.

We would very much like the opportunity to make this right. A member of our senior management team will be reaching out to you personally within the next 24 hours to discuss your experience and explore how we can resolve these matters.

Your satisfaction is our top priority, and we are determined to restore your confidence in ${hotelName}.

Thank you for giving us the chance to improve.

Sincerely,
The ${hotelName} Management Team

P.S. We will be implementing immediate measures to address your concerns and prevent similar issues in the future.`
  } else {
    return `Dear ${guestName},

Thank you for your feedback. We're sorry to learn that your experience at ${hotelName} didn't meet your expectations.

While we would have appreciated more specific details about your concerns, we take all guest feedback seriously. We are committed to providing exceptional service to every guest, and it's clear we fell short during your stay.

We would welcome the opportunity to learn more about your experience and discuss how we can improve. A member of our management team would be happy to speak with you directly.

We hope you'll consider giving us another chance to provide you with the outstanding service and hospitality that ${hotelName} is known for.

With sincere apologies,
The ${hotelName} Management Team`
  }
}
