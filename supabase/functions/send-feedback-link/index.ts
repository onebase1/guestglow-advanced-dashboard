import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FeedbackLinkRequest {
  guestEmail: string
  roomNumber?: string
  feedbackUrl: string
  qrCodeUrl?: string
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

    const request: FeedbackLinkRequest = await req.json()
    console.log('📧 Sending feedback link to:', request.guestEmail)

    const subject = `Share Your Experience - Quick Feedback Link`
    const htmlContent = generateFeedbackLinkEmail(request)

    // Send via send-tenant-emails function
    const { data, error } = await supabase.functions.invoke('send-tenant-emails', {
      body: {
        email_type: 'feedback_link',
        recipient_email: request.guestEmail,
        subject: subject,
        html_content: htmlContent,
        tenant_id: 'eusbett-tenant-id', // Default for now
        tenant_slug: 'eusbett',
        priority: 'normal'
      }
    })

    if (error) throw error

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Feedback link sent successfully',
        recipient: request.guestEmail
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Failed to send feedback link:', error)
    
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
 * Generate HTML content for feedback link email
 */
function generateFeedbackLinkEmail(request: FeedbackLinkRequest): string {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
      <div style="background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Share Your Experience</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">We'd love to hear from you!</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Dear Guest,</h2>
        
        <p>Thank you for staying with us! We hope you had a wonderful experience.</p>
        
        <p>We would greatly appreciate if you could take a moment to share your feedback about your stay${request.roomNumber ? ` in Room ${request.roomNumber}` : ''}.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${request.feedbackUrl}" 
             style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Share Your Feedback
          </a>
        </div>
        
        ${request.qrCodeUrl ? `
        <div style="text-align: center; margin: 20px 0;">
          <p style="color: #666; font-size: 14px;">Or scan this QR code:</p>
          <img src="${request.qrCodeUrl}" alt="Feedback QR Code" style="max-width: 200px; height: auto;">
        </div>
        ` : ''}
        
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <h3 style="color: #333; margin-top: 0;">Why Your Feedback Matters</h3>
          <ul style="color: #666;">
            <li>Helps us improve our services</li>
            <li>Ensures future guests have an even better experience</li>
            <li>Takes less than 2 minutes to complete</li>
          </ul>
        </div>
        
        <p style="color: #666; font-size: 14px;">Your feedback is completely confidential and will only be used to improve our services.</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            <strong>The Guest Relations Team</strong>
          </p>
        </div>
      </div>
    </div>
  `
}
