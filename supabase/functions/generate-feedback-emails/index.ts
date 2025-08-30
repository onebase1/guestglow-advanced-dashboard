import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FeedbackEmailRequest {
  feedback_id: string
  guest_name: string
  guest_email?: string
  room_number?: string
  rating: number
  feedback_text: string
  issue_category: string
  check_in_date?: string
  tenant_id: string
  tenant_slug: string
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

    const feedbackRequest: FeedbackEmailRequest = await req.json()
    console.log('📧 Processing feedback emails for:', {
      feedback_id: feedbackRequest.feedback_id,
      guest: feedbackRequest.guest_name,
      rating: feedbackRequest.rating,
      category: feedbackRequest.issue_category
    })

    const results = {
      manager_email: null,
      guest_email: null,
      errors: []
    }

    // 1. Send manager notification email
    try {
      const managerResult = await sendManagerNotification(supabase, feedbackRequest)
      results.manager_email = managerResult
      console.log('✅ Manager notification sent')
    } catch (error) {
      console.error('❌ Manager notification failed:', error)
      results.errors.push(`Manager notification: ${error.message}`)
    }

    // 2. Send guest confirmation email (if email provided)
    if (feedbackRequest.guest_email) {
      try {
        const guestResult = await sendGuestConfirmation(supabase, feedbackRequest)
        results.guest_email = guestResult
        console.log('✅ Guest confirmation sent')
      } catch (error) {
        console.error('❌ Guest confirmation failed:', error)
        results.errors.push(`Guest confirmation: ${error.message}`)
      }

      // 3. Schedule detailed AI-powered thank-you email (3 minutes delay)
      try {
        // Schedule the detailed email using a separate function call
        if (feedbackRequest.guest_email) {
          console.log('⏰ Scheduling detailed AI email for 3 minutes from now...')

          // Use schedule-detailed-thankyou function instead of the problematic delayed function
          const delayedEmailResult = await supabase.functions.invoke('schedule-detailed-thankyou', {
            body: {
              feedback_id: feedbackRequest.feedback_id,
              guest_name: feedbackRequest.guest_name,
              guest_email: feedbackRequest.guest_email,
              room_number: feedbackRequest.room_number,
              rating: feedbackRequest.rating,
              feedback_text: feedbackRequest.feedback_text,
              issue_category: feedbackRequest.issue_category,
              tenant_id: feedbackRequest.tenant_id,
              tenant_slug: feedbackRequest.tenant_slug,
              delay_minutes: 3
            }
          })

          if (delayedEmailResult.error) {
            console.error('❌ Failed to schedule delayed email:', delayedEmailResult.error)
          } else {
            console.log('✅ Detailed AI email scheduled successfully for 3 minutes')
          }

        } else {
          console.log('⚠️ No guest email provided, skipping detailed AI email')
        }
        console.log('✅ Detailed thank-you email scheduled')
      } catch (error) {
        console.error('❌ Detailed thank-you scheduling failed:', error)
        results.errors.push(`Detailed thank-you scheduling: ${error.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        feedback_id: feedbackRequest.feedback_id,
        results,
        message: 'Feedback emails processed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Feedback email processing failed:', error)
    
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
 * Send manager notification email with AI-powered analysis
 */
async function sendManagerNotification(supabase: any, feedback: FeedbackEmailRequest) {
  // Get manager configuration for the category
  const managerConfig = await getManagerForCategory(supabase, feedback.tenant_id, feedback.issue_category)
  
  // Get AI-powered severity assessment and recommendations
  const aiAnalysis = await analyzeFeedbackSeverity(supabase, feedback)
  
  const subject = `${aiAnalysis.alertType} - Room ${feedback.room_number || 'N/A'} - ${feedback.guest_name} (${feedback.rating}/5 stars)`
  
  // Determine CC emails based on AI analysis
  const ccEmails = ['g.basera@yahoo.com', 'basera@btinternet.com'] // TEMPORARY: Replaced guestrelations@eusbetthotel.com for security testing
  if (aiAnalysis.requiresGMEscalation) {
    const gmEmail = Deno.env.get('GENERAL_MANAGER_EMAIL') || 'basera@btinternet.com'
    if (!ccEmails.includes(gmEmail)) {
      ccEmails.push(gmEmail)
    }
  }
  
  const htmlContent = generateEnhancedManagerEmailHtml(feedback, managerConfig, aiAnalysis)

  // Send via send-tenant-emails function
  const { data, error } = await supabase.functions.invoke('send-tenant-emails', {
    body: {
      feedback_id: feedback.feedback_id,
      email_type: 'manager_alert',
      recipient_email: managerConfig.email,
      cc_emails: ccEmails,
      subject: subject,
      html_content: htmlContent,
      tenant_id: feedback.tenant_id,
      tenant_slug: feedback.tenant_slug,
      priority: aiAnalysis.priority
    }
  })

  if (error) throw error
  return data
}

/**
 * Send guest confirmation email
 */
async function sendGuestConfirmation(supabase: any, feedback: FeedbackEmailRequest) {
  const subject = `Thank you for your feedback - ${feedback.tenant_slug.charAt(0).toUpperCase() + feedback.tenant_slug.slice(1)} Hotel`
  
  const htmlContent = generateGuestEmailHtml(feedback)

  // Send via send-tenant-emails function
  const { data, error } = await supabase.functions.invoke('send-tenant-emails', {
    body: {
      feedback_id: feedback.feedback_id,
      email_type: 'guest_confirmation',
      recipient_email: feedback.guest_email,
      subject: subject,
      html_content: htmlContent,
      tenant_id: feedback.tenant_id,
      tenant_slug: feedback.tenant_slug,
      priority: 'normal'
    }
  })

  if (error) throw error
  return data
}

/**
 * Get manager configuration for feedback category
 */
async function getManagerForCategory(supabase: any, tenantId: string, category: string) {
  // Try to get from manager_configurations table first
  const { data: managerConfig, error } = await supabase
    .from('manager_configurations')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('department', category)
    .eq('is_active', true)
    .single()

  if (managerConfig && !error) {
    return {
      name: managerConfig.manager_name,
      email: managerConfig.email_address,
      department: managerConfig.department
    }
  }

  // Fallback to environment variables (for backward compatibility)
  const envConfig = getEnvironmentManagerConfig(category)
  if (envConfig.email !== 'manager@hotel.com') {
    return envConfig
  }

  // Final fallback to system default
  return {
    name: 'Hotel Manager',
    email: 'g.basera@yahoo.com',
    department: category
  }
}

/**
 * Get manager config from environment variables
 */
function getEnvironmentManagerConfig(category: string) {
  const configs = {
    'Food & Beverage': {
      name: Deno.env.get('FOOD_BEVERAGE_MANAGER_NAME') || 'Food & Beverage Manager',
      email: Deno.env.get('FOOD_BEVERAGE_MANAGER_EMAIL') || 'manager@hotel.com',
      department: 'Food & Beverage'
    },
    'Housekeeping': {
      name: Deno.env.get('HOUSEKEEPING_MANAGER_NAME') || 'Housekeeping Manager',
      email: Deno.env.get('HOUSEKEEPING_MANAGER_EMAIL') || 'manager@hotel.com',
      department: 'Housekeeping'
    },
    'Front Desk': {
      name: Deno.env.get('FRONT_DESK_MANAGER_NAME') || 'Front Desk Manager',
      email: Deno.env.get('FRONT_DESK_MANAGER_EMAIL') || 'manager@hotel.com',
      department: 'Front Desk'
    },
    'Maintenance': {
      name: Deno.env.get('MAINTENANCE_MANAGER_NAME') || 'Maintenance Manager',
      email: Deno.env.get('MAINTENANCE_MANAGER_EMAIL') || 'manager@hotel.com',
      department: 'Maintenance'
    },
    'Security': {
      name: Deno.env.get('SECURITY_MANAGER_NAME') || 'Security Manager',
      email: Deno.env.get('SECURITY_MANAGER_EMAIL') || 'manager@hotel.com',
      department: 'Security'
    }
  }

  return configs[category] || {
    name: Deno.env.get('GENERAL_MANAGER_NAME') || 'General Manager',
    email: Deno.env.get('GENERAL_MANAGER_EMAIL') || 'manager@hotel.com',
    department: 'Management'
  }
}

/**
 * Analyze feedback severity and generate recommendations using AI
 */
async function analyzeFeedbackSeverity(supabase: any, feedback: FeedbackEmailRequest) {
  try {
    // Call AI response generator for severity analysis
    const { data: aiResponse, error } = await supabase.functions.invoke('ai-response-generator', {
      body: {
        guest_name: feedback.guest_name,
        feedback_text: feedback.feedback_text,
        rating: feedback.rating,
        issue_category: feedback.issue_category,
        room_number: feedback.room_number,
        analysis_type: 'severity_assessment'
      }
    })

    if (error || !aiResponse?.content) {
      // Fallback to rule-based analysis
      return getFallbackSeverityAnalysis(feedback)
    }

    return parseSeverityAnalysis(aiResponse.content, feedback)
  } catch (error) {
    console.error('AI severity analysis failed:', error)
    return getFallbackSeverityAnalysis(feedback)
  }
}

/**
 * Parse AI response for severity indicators
 */
function parseSeverityAnalysis(aiContent: string, feedback: FeedbackEmailRequest) {
  const content = aiContent.toLowerCase()
  
  // Check for high-escalation keywords in AI response
  const highEscalationKeywords = [
    'safety', 'security', 'harassment', 'discrimination', 'health violation',
    'mold', 'bed bugs', 'assault', 'theft', 'legal action', 'lawsuit',
    'emergency', 'danger', 'threat', 'misconduct', 'inappropriate behavior'
  ]
  
  const requiresGMEscalation = highEscalationKeywords.some(keyword => 
    content.includes(keyword) || feedback.feedback_text.toLowerCase().includes(keyword)
  )
  
  // Determine severity level
  let severityLevel = 'Medium'
  let alertType = '🔔 New Feedback Alert'
  let urgencyIndicator = 'Standard review recommended'
  
  if (requiresGMEscalation || feedback.rating <= 2) {
    severityLevel = 'High'
    alertType = '🚨 High Priority Alert'
    urgencyIndicator = 'Immediate attention required due to serious concerns'
  } else if (feedback.rating <= 3) {
    severityLevel = 'Medium'
    alertType = '⚠️ Medium Priority Alert' 
    urgencyIndicator = 'Prompt attention needed to address guest concerns'
  }
  
  return {
    severity: severityLevel,
    alertType,
    urgencyIndicator,
    requiresGMEscalation,
    priority: requiresGMEscalation || feedback.rating <= 2 ? 'high' : 'normal',
    recommendations: generateSmartRecommendations(feedback, severityLevel)
  }
}

/**
 * Generate smart recommendations based on feedback analysis
 */
function generateSmartRecommendations(feedback: FeedbackEmailRequest, severity: string) {
  const recommendations = []
  const timeline = []
  
  // Base recommendations (no compensation/goodwill gestures)
  if (feedback.rating <= 2) {
    recommendations.push(`Contact ${feedback.guest_name} within 24 hours to apologize for the service shortfall and address their concerns directly.`)
    timeline.push('Within 24 hours: Guest contact and apology')
  } else if (feedback.rating <= 3) {
    recommendations.push(`Follow up with ${feedback.guest_name} within 48 hours to acknowledge their feedback and discuss improvements.`)
    timeline.push('Within 48 hours: Guest acknowledgment and follow-up')
  }
  
  // Category-specific recommendations
  const category = feedback.issue_category.toLowerCase()
  
  if (category.includes('cleanliness') || category.includes('housekeeping')) {
    recommendations.push('Conduct immediate room inspection and housekeeping quality audit.')
    recommendations.push('Review and reinforce cleaning protocols with housekeeping staff.')
    timeline.push('Within 4 hours: Room inspection and immediate remedial action')
    timeline.push('Within 3 days: Staff training on cleaning standards')
  } else if (category.includes('service') || category.includes('front desk')) {
    recommendations.push('Review staff interactions and provide immediate coaching on guest engagement and service standards.')
    recommendations.push('Schedule refresher training session for service staff on customer service best practices.')
    timeline.push('Within 24 hours: Staff coaching session')
    timeline.push('Within 7 days: Service training completion')
  } else if (category.includes('food') || category.includes('beverage')) {
    recommendations.push('Review kitchen operations and food quality control procedures.')
    recommendations.push('Coordinate with culinary team to address specific concerns raised.')
    timeline.push('Within 2 hours: Kitchen inspection and quality review')
    timeline.push('Within 5 days: Culinary team briefing and process improvements')
  } else if (category.includes('facilities') || category.includes('maintenance')) {
    recommendations.push('Conduct immediate facility inspection and prioritize necessary repairs.')
    recommendations.push('Update maintenance schedules to prevent similar issues.')
    timeline.push('Within 4 hours: Facility inspection and urgent repairs')
    timeline.push('Within 48 hours: Maintenance schedule review and updates')
  }
  
  // Always add monitoring
  recommendations.push('Monitor future guest feedback for similar issues to ensure corrective actions are effective.')
  timeline.push('Ongoing: Monitor effectiveness of corrective measures')
  
  return { actions: recommendations, timeline }
}

/**
 * Fallback severity analysis when AI is unavailable
 */
function getFallbackSeverityAnalysis(feedback: FeedbackEmailRequest) {
  const highRiskKeywords = [
    'safety', 'security', 'mold', 'bed bugs', 'harassment', 'assault', 'theft',
    'discrimination', 'inappropriate', 'legal', 'lawsuit', 'danger', 'emergency'
  ]
  
  const feedbackLower = feedback.feedback_text.toLowerCase()
  const hasHighRiskKeywords = highRiskKeywords.some(keyword => feedbackLower.includes(keyword))
  
  let severity = 'Medium'
  let alertType = '🔔 New Feedback Alert'
  let urgencyIndicator = 'Standard review recommended'
  
  if (hasHighRiskKeywords || feedback.rating <= 2) {
    severity = 'High'
    alertType = '🚨 High Priority Alert'
    urgencyIndicator = 'Immediate attention required due to serious concerns'
  }
  
  return {
    severity,
    alertType, 
    urgencyIndicator,
    requiresGMEscalation: hasHighRiskKeywords,
    priority: hasHighRiskKeywords || feedback.rating <= 2 ? 'high' : 'normal',
    recommendations: generateSmartRecommendations(feedback, severity)
  }
}

/**
 * Generate enhanced HTML content for manager notification email
 */
function generateEnhancedManagerEmailHtml(feedback: FeedbackEmailRequest, manager: any, aiAnalysis: any): string {
  const urgencyColor = aiAnalysis.severity === 'High' ? '#dc2626' : aiAnalysis.severity === 'Medium' ? '#f59e0b' : '#059669'
  const hotelName = feedback.tenant_slug.charAt(0).toUpperCase() + feedback.tenant_slug.slice(1) + ' Hotel'

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 700px;">
      <div style="background: ${urgencyColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Guest Feedback Alert</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">${hotelName}</p>
      </div>

      <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Dear ${hotelName} Management Team,</h2>

        <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid ${urgencyColor};">
          <h3 style="color: #333; margin-top: 0; font-size: 18px;">📋 Guest Feedback Alert</h3>
          <p><strong>Guest Name:</strong> ${feedback.guest_name}</p>
          <p><strong>Room Number:</strong> ${feedback.room_number || 'Not provided'}</p>
          <p><strong>Rating:</strong> ${feedback.rating}/5 stars</p>
          <p><strong>Issue Category:</strong> ${feedback.issue_category}</p>
          <p><strong>Feedback:</strong> ${feedback.feedback_text}</p>
          <p><strong>Feedback Submitted:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Severity Assessment:</strong> <span style="color: ${urgencyColor}; font-weight: bold;">${aiAnalysis.severity}</span></p>
          <p><strong>Urgency Indicator:</strong> ${aiAnalysis.urgencyIndicator}</p>
        </div>

        ${aiAnalysis.recommendations.actions.length > 0 ? `
        <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #0066cc;">
          <h3 style="color: #0066cc; margin-top: 0; font-size: 18px;">💡 Recommended Actions:</h3>
          <ol style="margin: 0; padding-left: 20px;">
            ${aiAnalysis.recommendations.actions.map(action => `<li style="margin-bottom: 8px;">${action}</li>`).join('')}
          </ol>
        </div>
        ` : ''}

        ${aiAnalysis.recommendations.timeline.length > 0 ? `
        <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #059669;">
          <h3 style="color: #059669; margin-top: 0; font-size: 18px;">⏱️ Suggested Timeline for Follow-Up:</h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${aiAnalysis.recommendations.timeline.map(item => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        <div style="background: #e3f2fd; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; color: #1976d2; font-weight: bold;">Thank you for your prompt attention to this matter to uphold the service standards of ${hotelName}.</p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px; margin: 0;">
            <strong>${hotelName} Guest Experience Alert System</strong>
          </p>
          <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">Feedback ID: ${feedback.feedback_id}</p>
        </div>
      </div>
    </div>
  `
}

/**
 * Generate HTML content for guest confirmation email
 */
function generateGuestEmailHtml(feedback: FeedbackEmailRequest): string {
  const hotelName = feedback.tenant_slug.charAt(0).toUpperCase() + feedback.tenant_slug.slice(1) + ' Hotel'
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
      <div style="background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 300;">Thank You for Your Feedback</h1>
        <p style="margin: 5px 0 0 0; font-size: 16px; opacity: 0.9;">${hotelName}</p>
      </div>

      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0; font-size: 20px; font-weight: 400;">Dear ${feedback.guest_name},</h2>

        <p style="font-size: 16px; line-height: 1.7;">Thank you for taking the time to share your feedback with us. We have received your comments and truly value your input.</p>

        <p style="font-size: 16px; line-height: 1.7;">Your feedback helps us continuously improve the experience for all our guests during their stay with us.</p>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 14px; margin: 0;">
            Warm regards,<br>
            <strong>Guest Relations Team</strong><br>
            <span style="font-size: 13px; color: #999;">${hotelName}</span>
          </p>
          
          <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 11px; line-height: 1.4; margin: 0;">
              This email was sent by GuestGlow (DreamPath Ltd) on behalf of ${hotelName}.<br>
              If you wish to stop receiving feedback confirmations, please contact the hotel directly.<br>
              DreamPath Ltd, 72 Newholme Estate, TS28 5EN, Wingate, United Kingdom
            </p>
          </div>
        </div>
      </div>
    </div>
  `
}

/**
 * Generate structured email content matching the reference image format
 */
function generateStructuredEmailContent(params: {
  guestName: string
  hotelName: string
  rating: number
  feedbackText: string
  roomNumber?: string
  aiContent?: string
}): string {
  const { guestName, hotelName, rating, feedbackText, roomNumber, aiContent } = params

  // If we have AI content, extract key points and structure them properly
  let structuredResponse = ''

  if (aiContent && aiContent.length > 100) {
    // Extract the main apology/acknowledgment and key points from AI content
    const lines = aiContent.split('\n').filter(line => line.trim().length > 0)
    const mainContent = lines.slice(0, 3).join(' ').replace(/\s+/g, ' ').trim()
    structuredResponse = mainContent.substring(0, 400) + (mainContent.length > 400 ? '...' : '')
  }

  // Fallback structured content matching the reference format
  if (!structuredResponse) {
    if (rating <= 3) {
      structuredResponse = `We sincerely apologize that your experience did not meet your expectations, particularly with the issues you mentioned in your feedback. We understand how important it is for our guests to enjoy delicious meals served promptly, and we are truly sorry for falling short in these areas.

Please rest assured that your comments have been shared with our culinary and service teams. We are taking immediate steps to review our food preparation standards and to reinforce our training for timely service. Your feedback is invaluable in helping us improve and ensure a much better experience for all our guests in the future.

Once again, we apologize for the inconvenience you encountered. Should you have any further questions or concerns, or would like to discuss your experience in more detail, please do not hesitate to reach out to us directly.`
    } else {
      structuredResponse = `Thank you so much for taking the time to share your positive feedback about your recent stay with us. We're delighted to hear that you had such a wonderful experience!

Your kind words mean a great deal to our entire team, and we're thrilled that we were able to provide you with the exceptional service and comfort you deserve. It's guests like you who inspire us to maintain our high standards of hospitality.

We hope to have the pleasure of welcoming you back soon for another memorable stay.`
    }
  }

  return `<p>Dear ${guestName},</p>

<p>Thank you for taking the time to share your feedback regarding your recent stay in Room ${roomNumber || 'N/A'} at ${hotelName}.</p>

<p>${structuredResponse}</p>

<div class="signature">
<p>Warm regards,</p>
<p><strong>${hotelName} Team</strong></p>
</div>`
}
