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

          // Call the delayed email function (non-blocking)
          const delayedEmailResult = await supabase.functions.invoke('send-delayed-ai-email', {
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
 * Send manager notification email
 */
async function sendManagerNotification(supabase: any, feedback: FeedbackEmailRequest) {
  // Get manager configuration for the category
  const managerConfig = await getManagerForCategory(supabase, feedback.tenant_id, feedback.issue_category)
  
  const subject = `🔔 New ${feedback.rating}⭐ Feedback - ${feedback.issue_category} - Room ${feedback.room_number || 'N/A'}`
  
  const htmlContent = generateManagerEmailHtml(feedback, managerConfig)

  // Send via send-tenant-emails function
  const { data, error } = await supabase.functions.invoke('send-tenant-emails', {
    body: {
      feedback_id: feedback.feedback_id,
      email_type: 'manager_alert',
      recipient_email: managerConfig.email,
      cc_emails: ['g.basera@yahoo.com'],
      subject: subject,
      html_content: htmlContent,
      tenant_id: feedback.tenant_id,
      tenant_slug: feedback.tenant_slug,
      priority: feedback.rating <= 2 ? 'high' : 'normal'
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
 * Generate HTML content for manager notification email using template system
 */
function generateManagerEmailHtml(feedback: FeedbackEmailRequest, manager: any): string {
  // Import would be at top in real implementation, using inline for edge function
  const templateData = {
    guest_name: feedback.guest_name,
    room_number: feedback.room_number,
    rating: feedback.rating,
    feedback_text: feedback.feedback_text,
    issue_category: feedback.issue_category,
    manager_name: manager.name,
    manager_department: manager.department,
    feedback_id: feedback.feedback_id,
    tenant_name: feedback.tenant_slug,
    tenant_slug: feedback.tenant_slug
  }

  // Generate template (simplified inline version)
  const urgencyColor = feedback.rating <= 2 ? '#dc2626' : feedback.rating <= 3 ? '#f59e0b' : '#059669'
  const urgencyText = feedback.rating <= 2 ? 'URGENT' : feedback.rating <= 3 ? 'ATTENTION NEEDED' : 'FEEDBACK RECEIVED'

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
      <div style="background: ${urgencyColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">${urgencyText}</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">New ${feedback.rating}⭐ Guest Feedback</p>
      </div>

      <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Dear ${manager.name},</h2>

        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <h3 style="color: #333; margin-top: 0;">Feedback Details</h3>
          <p><strong>Guest:</strong> ${feedback.guest_name}</p>
          <p><strong>Room:</strong> ${feedback.room_number || 'Not provided'}</p>
          <p><strong>Rating:</strong> ${feedback.rating}/5 ⭐</p>
          <p><strong>Category:</strong> ${feedback.issue_category}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>

        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <h3 style="color: #333; margin-top: 0;">Guest Comments</h3>
          <p style="font-style: italic; background: #f1f5f9; padding: 10px; border-radius: 4px;">
            "${feedback.feedback_text}"
          </p>
        </div>

        <div style="background: #e0f2fe; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <h3 style="color: #0277bd; margin-top: 0;">Action Required</h3>
          <p>Please review this feedback and take appropriate action. ${feedback.rating <= 2 ? 'This is a low rating that requires immediate attention.' : 'Please follow up with the guest if needed.'}</p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            <strong>GuestGlow Feedback System</strong>
          </p>
          <p style="color: #999; font-size: 12px;">Feedback ID: ${feedback.feedback_id}</p>
        </div>
      </div>
    </div>
  `
}

/**
 * Generate HTML content for guest confirmation email
 */
function generateGuestEmailHtml(feedback: FeedbackEmailRequest): string {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
      <div style="background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Thank You for Your Feedback</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">${feedback.tenant_slug.charAt(0).toUpperCase() + feedback.tenant_slug.slice(1)} Hotel</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Dear ${feedback.guest_name},</h2>
        
        <p>Thank you for taking the time to share your feedback with us. We have received your ${feedback.rating}-star review and truly appreciate your input.</p>
        
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <h3 style="color: #333; margin-top: 0;">Your Feedback Summary</h3>
          <p><strong>Rating:</strong> ${feedback.rating}/5 ⭐</p>
          <p><strong>Category:</strong> ${feedback.issue_category}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        
        <p>Your feedback has been forwarded to our ${feedback.issue_category} team, and we will review it carefully to improve our services.</p>
        
        ${feedback.rating <= 3 ? `
        <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0;"><strong>We want to make this right.</strong> A member of our team will be in touch with you soon to address your concerns and ensure your satisfaction.</p>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            <strong>The ${feedback.tenant_slug.charAt(0).toUpperCase() + feedback.tenant_slug.slice(1)} Hotel Guest Relations Team</strong>
          </p>
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
