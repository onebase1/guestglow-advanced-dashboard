import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AIRequest {
  reviewText: string
  rating: number
  isExternal: boolean
  platform?: string
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
    const request: AIRequest = await req.json()
    console.log('🤖 Generating AI response for:', {
      guest: request.guestName,
      rating: request.rating,
      tenant: request.tenant_slug,
      isExternal: request.isExternal
    })

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get tenant information for personalization
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, brand_voice, contact_email')
      .eq('id', request.tenant_id)
      .single()

    const hotelName = tenant?.name || `${request.tenant_slug.charAt(0).toUpperCase() + request.tenant_slug.slice(1)} Hotel`
    const brandVoice = tenant?.brand_voice || 'professional and friendly'

    // Generate AI-powered response using OpenAI
    const response = await generateAIResponse({
      reviewText: request.reviewText,
      rating: request.rating,
      guestName: request.guestName,
      hotelName,
      brandVoice,
      isExternal: request.isExternal,
      platform: request.platform
    })

    return new Response(
      JSON.stringify({
        success: true,
        response: response,
        guest_name: request.guestName,
        rating: request.rating,
        type: request.isExternal ? 'external_response' : 'guest_thank_you'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ AI response generation failed:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        fallback_response: generateFallbackResponse()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 with fallback instead of error
      }
    )
  }
})

/**
 * Generate AI-powered response using OpenAI
 */
async function generateAIResponse(params: {
  reviewText: string
  rating: number
  guestName: string
  hotelName: string
  brandVoice: string
  isExternal: boolean
  platform?: string
}): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  
  if (!openaiApiKey) {
    console.warn('⚠️ OpenAI API key not found, using template response')
    return generateTemplateResponse(params)
  }

  const prompt = createPrompt(params)
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'system',
            content: `You are a professional hotel guest relations specialist. Generate ${params.isExternal ? 'public review responses' : 'personalized guest thank-you emails'} that are warm, genuine, concise, and ${params.brandVoice}. Keep to the requested structure and approximate word count.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: params.isExternal ? 250 : 320,
        temperature: 0.7,
        presence_penalty: 0.3,
        frequency_penalty: 0.2
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content?.trim() || generateTemplateResponse(params)

  } catch (error) {
    console.error('OpenAI API call failed:', error)
    return generateTemplateResponse(params)
  }
}

/**
 * Create appropriate prompt based on context
 */
function createPrompt(params: {
  reviewText: string
  rating: number
  guestName: string
  hotelName: string
  brandVoice: string
  isExternal: boolean
  platform?: string
}): string {
  if (params.isExternal) {
    // External review response prompt
    return `Generate a professional response to this ${params.platform || 'online'} review:

Guest: ${params.guestName}
Rating: ${params.rating}/5 stars
Review: "${params.reviewText}"
Hotel: ${params.hotelName}

Requirements:
- Professional and ${params.brandVoice} tone
- Address specific points mentioned in the review
- Thank the guest for their feedback
- ${params.rating <= 3 ? 'Acknowledge concerns and show commitment to improvement' : 'Express gratitude and invite them back'}
- Keep under 200 words, 3 short paragraphs max
- Sign as "${params.hotelName} Management Team"`
  }

  // Internal guest thank-you email prompt (short, structured)
  const issueAnalysis = analyzeIssues(params.reviewText, params.rating)

  return `Generate a concise, personalized thank-you/apology email for a hotel guest.

Guest: ${params.guestName}
Rating: ${params.rating}/5 stars
Feedback: "${params.reviewText}"
Hotel: ${params.hotelName}
Issues identified: ${issueAnalysis.join(', ') || 'None'}

Strict format and style:
- 130–170 words total
- Exactly 4 short paragraphs, each 1–2 sentences (no more, no less)
- First line must be: "Dear ${params.guestName},"
- Paragraph 1: Thank them and reference the ${params.rating}-star rating
- Paragraph 2: ${params.rating <= 3 ? 'One-sentence apology referencing the key issue(s) succinctly' : 'One-sentence appreciation referencing a specific highlight'}
- Paragraph 3: 1–2 specific action(s) we are taking (concise, factual), e.g., “we’re working with our technical/service team to review and resolve”
- Paragraph 4: Invite them back and offer to assist directly (do not promise contact; do not imply a specific person will reach out)
- After paragraph 4, add exactly two lines: "Warm regards," then "${params.hotelName} Team"
- Tone: warm, sincere, professional, and ${params.brandVoice}
- Avoid repetition and long sentences; no bullet points; no headings
- Do NOT say phrases like "we want to make this right", "a member of our team will be in touch", "AI", or anything that reveals automation

Output: plain text only.`
}

/**
 * Analyze feedback text for specific issues
 */
function analyzeIssues(feedbackText: string, _rating: number): string[] {
  const issues: string[] = []
  const text = feedbackText.toLowerCase()
  
  // Common hotel issues
  if (text.includes('room') && (text.includes('dirty') || text.includes('clean'))) issues.push('room cleanliness')
  if (text.includes('staff') && (text.includes('rude') || text.includes('unfriendly'))) issues.push('staff service')
  if (text.includes('noise') || text.includes('loud')) issues.push('noise levels')
  if (text.includes('wifi') || text.includes('internet')) issues.push('internet connectivity')
  if (text.includes('breakfast') || text.includes('food')) issues.push('dining experience')
  if (text.includes('check') && text.includes('in')) issues.push('check-in process')
  if (text.includes('parking')) issues.push('parking')
  if (text.includes('temperature') || text.includes('hot') || text.includes('cold')) issues.push('room temperature')
  
  return issues
}

/**
 * Generate template response when AI is unavailable
 */
function generateTemplateResponse(params: {
  reviewText: string
  rating: number
  guestName: string
  hotelName: string
  isExternal: boolean
}): string {
  if (params.isExternal) {
    return `Dear ${params.guestName},

Thank you for taking the time to share your ${params.rating}-star review. Your feedback is invaluable to us as we continuously strive to improve our services.

${params.rating >= 4 
  ? "We're delighted to hear about your positive experience and look forward to welcoming you back soon."
  : "We sincerely apologize that your experience didn't meet expectations. We take all feedback seriously and are committed to making improvements."
}

Warm regards,
The ${params.hotelName} Management Team`
  }

  return `Dear ${params.guestName},

Thank you so much for taking the time to share your feedback about your recent stay with us at ${params.hotelName}. Your ${params.rating}-star rating and detailed comments are incredibly valuable to our team.

${params.rating >= 4 
  ? `We're absolutely thrilled to hear that you had such a positive experience! It's guests like you who make our work so rewarding, and we're grateful for your kind words.

We hope to have the pleasure of welcoming you back soon for another exceptional stay.`
  : `We sincerely apologize that your experience didn't meet the high standards we strive for. Your feedback helps us identify areas where we can improve, and we're committed to making the necessary changes.

We would welcome the opportunity to provide you with a much better experience in the future.`
}

With warm regards,
The ${params.hotelName} Guest Relations Team`
}

/**
 * Generate fallback response for errors
 */
function generateFallbackResponse(): string {
  return `Dear Guest,

Thank you for your valuable feedback. We truly appreciate you taking the time to share your experience with us.

Your comments help us continuously improve our services, and we're grateful for your input.

We hope to have the opportunity to welcome you back soon.

Warm regards,
The Guest Relations Team`
}
