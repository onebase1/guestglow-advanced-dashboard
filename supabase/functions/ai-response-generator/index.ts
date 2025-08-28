import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AIRequest {
  reviewText?: string
  feedback_text?: string
  rating: number
  isExternal?: boolean
  platform?: string
  guestName?: string
  guest_name?: string
  tenant_id: string
  tenant_slug: string
  issue_category?: string
  room_number?: string
  analysis_type?: 'severity_assessment' | 'guest_response'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const request: AIRequest = await req.json()
    
    // Handle both old and new request formats
    const guestName = request.guestName || request.guest_name || 'Guest'
    const feedbackText = request.reviewText || request.feedback_text || ''
    const analysisType = request.analysis_type || 'guest_response'
    
    console.log('🤖 Generating AI response for:', {
      guest: guestName,
      rating: request.rating,
      tenant: request.tenant_slug,
      isExternal: request.isExternal,
      analysisType
    })
    
    // Handle severity analysis requests
    if (analysisType === 'severity_assessment') {
      const severityResponse = await generateSeverityAnalysis({
        feedbackText,
        rating: request.rating,
        guestName,
        issueCategory: request.issue_category || 'General',
        roomNumber: request.room_number
      })
      
      return new Response(
        JSON.stringify({
          success: true,
          content: severityResponse,
          type: 'severity_analysis'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

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
      reviewText: feedbackText,
      rating: request.rating,
      guestName,
      hotelName,
      brandVoice,
      isExternal: request.isExternal || false,
      platform: request.platform
    })

    return new Response(
      JSON.stringify({
        success: true,
        response: response,
        guest_name: guestName,
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

Write a warm, detailed, and professional guest relations email response:

Structure and Content:
- 180-250 words total (generous length for proper warmth)
- 4-5 natural paragraphs of varying length (no rigid sentence limits)
- First line: "Dear ${params.guestName},"

Opening Paragraph:
- Express genuine gratitude: "Thank you very much for taking the time to share your feedback regarding your recent experience at ${params.hotelName}"  
- DO NOT mention star rating in opening - save rating reference for natural placement later if needed

Issue Acknowledgment (for ratings ≤3):
- Specific empathy: Reference the exact issue they mentioned
- Sincere apology: "Please accept our apologies for any inconvenience this may have caused"
- Show understanding: "We understand how important [their concern] is for our guests"

Action Paragraph:
- Detailed explanation of steps being taken
- Mention specific teams/departments when appropriate
- Show proactive commitment to resolution

Closing Paragraphs:
- Reinforce priorities: "Your comfort and satisfaction are our top priorities"
- Connect feedback to improvement: "your feedback helps us to continually improve our service"
- Future engagement: "we hope to continue providing you with excellent service" or "please let us know if there's anything else we can do for you"

Sign-off: "Warm regards,\n${params.hotelName} Team"

Tone: Warm, genuine, detailed, empathetic, and professional
ALWAYS use "we" not "I" - this is from the Guest Relations Team
CRITICAL: DO NOT mention star rating or rating numbers in the first paragraph - focus on gratitude and feedback acknowledgment
DO NOT mention compensation, goodwill gestures, refunds, or monetary offers

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

Thank you for taking the time to share your review with us. Your feedback is invaluable to us as we continuously strive to improve our services.

${params.rating >= 4 
  ? "We're delighted to hear about your positive experience and hope to continue providing you with excellent service throughout your stay."
  : "We sincerely apologize that your experience didn't meet expectations. We take all feedback seriously and are committed to making improvements."
}

Warm regards,
The ${params.hotelName} Management Team`
  }

  return `Dear ${params.guestName},

Thank you so much for taking the time to share your feedback about your recent stay with us at ${params.hotelName}. Your detailed comments are incredibly valuable to our team.

${params.rating >= 4 
  ? `We're absolutely thrilled to hear that you had such a positive experience! It's guests like you who make our work so rewarding, and we're grateful for your kind words.

We hope to have the pleasure of welcoming you back soon for another exceptional stay.`
  : `We sincerely apologize that your experience didn't meet the high standards we strive for. Your feedback helps us identify areas where we can improve, and we're committed to making the necessary changes.

We would welcome the opportunity to provide you with a much better experience in the future.`
}

Warm regards,
The ${params.hotelName} Guest Relations Team`
}

/**
 * Generate AI-powered severity analysis for feedback
 */
async function generateSeverityAnalysis(params: {
  feedbackText: string
  rating: number
  guestName: string
  issueCategory: string
  roomNumber?: string
}): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  
  if (!openaiApiKey) {
    console.warn('⚠️ OpenAI API key not found, using rule-based severity analysis')
    return generateRuleBasedSeverityAnalysis(params.feedbackText, params.rating)
  }

  const prompt = createSeverityAnalysisPrompt(params)
  
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
            content: 'You are a hotel guest experience analyst. Your job is to analyze guest feedback and determine severity levels for management escalation. Focus on safety, security, health violations, staff misconduct, discrimination, and serious operational failures.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content?.trim() || generateRuleBasedSeverityAnalysis(params.feedbackText, params.rating)

  } catch (error) {
    console.error('OpenAI severity analysis failed:', error)
    return generateRuleBasedSeverityAnalysis(params.feedbackText, params.rating)
  }
}

/**
 * Create severity analysis prompt
 */
function createSeverityAnalysisPrompt(params: {
  feedbackText: string
  rating: number
  guestName: string
  issueCategory: string
  roomNumber?: string
}): string {
  return `Analyze this hotel guest feedback for severity level and escalation requirements:

Guest: ${params.guestName}
Room: ${params.roomNumber || 'N/A'}
Rating: ${params.rating}/5 stars
Category: ${params.issueCategory}
Feedback: "${params.feedbackText}"

Determine if this requires GENERAL MANAGER ESCALATION based on:
- Safety/security concerns
- Health violations (mold, bed bugs, food poisoning)
- Staff misconduct or harassment
- Discrimination
- Legal threats or serious liability issues
- Major operational failures

Ignore minor issues like slow wifi, noise, or basic service complaints.

Respond with exactly this format:
SEVERITY: [HIGH/MEDIUM/LOW]
GM_ESCALATION: [YES/NO]
REASON: [Brief explanation in one sentence]
KEYWORDS: [List any serious issue keywords found]`
}

/**
 * Generate rule-based severity analysis when AI is unavailable
 */
function generateRuleBasedSeverityAnalysis(feedbackText: string, rating: number): string {
  const text = feedbackText.toLowerCase()
  
  const criticalKeywords = [
    'safety', 'security', 'mold', 'bed bugs', 'harassment', 'assault', 'theft',
    'discrimination', 'inappropriate', 'legal', 'lawsuit', 'danger', 'emergency',
    'health violation', 'food poisoning', 'misconduct'
  ]
  
  const foundKeywords = criticalKeywords.filter(keyword => text.includes(keyword))
  const hasHighRisk = foundKeywords.length > 0
  
  let severity = 'LOW'
  if (hasHighRisk) {
    severity = 'HIGH'
  } else if (rating <= 2) {
    severity = 'MEDIUM'
  }
  
  return `SEVERITY: ${severity}
GM_ESCALATION: ${hasHighRisk ? 'YES' : 'NO'}
REASON: ${hasHighRisk ? 'Contains serious safety/security/health concerns' : rating <= 2 ? 'Low rating requiring attention' : 'Standard feedback'}
KEYWORDS: ${foundKeywords.join(', ') || 'None'}`
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
