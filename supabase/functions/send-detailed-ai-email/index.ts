import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DetailedEmailRequest {
  feedback_id: string
  guest_name: string
  guest_email: string
  room_number?: string
  rating: number
  feedback_text: string
  issue_category?: string
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

    const request: DetailedEmailRequest = await req.json()
    console.log('📧 Sending detailed AI-powered email for:', {
      feedback_id: request.feedback_id,
      guest: request.guest_name,
      rating: request.rating
    })

    // Only send if guest provided email
    if (!request.guest_email) {
      console.log('⚠️ No guest email provided, skipping detailed email')
      return new Response(JSON.stringify({
        success: true,
        message: 'No guest email provided, detailed email skipped',
        feedback_id: request.feedback_id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Generate AI-powered detailed email content
    console.log('🤖 Generating AI-powered detailed email content...')
    const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-response-generator', {
      body: {
        reviewText: request.feedback_text,
        rating: request.rating,
        isExternal: false,
        guestName: request.guest_name,
        tenant_id: request.tenant_id,
        tenant_slug: request.tenant_slug
      }
    })
    
    if (aiError) {
      console.error('AI generation failed:', aiError)
      throw new Error(`AI generation failed: ${aiError.message}`)
    }

    if (!aiData?.response) {
      throw new Error('No AI response generated')
    }

    console.log('✅ AI content generated successfully')

    // Create email HTML content with AI-generated text
    const hotelName = `${request.tenant_slug.charAt(0).toUpperCase() + request.tenant_slug.slice(1)} Hotel`
    const subject = `Thank You for Your Detailed Feedback - ${hotelName}`
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .header { background: #2c5530; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; white-space: pre-line; font-size: 16px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .ai-badge { background: #e8f5e8; color: #2d5a2d; padding: 5px 10px; border-radius: 15px; font-size: 11px; margin-bottom: 15px; display: inline-block; }
          .feedback-summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .rating { color: #ffa500; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Thank You for Your Detailed Feedback</h1>
            <p>${hotelName}</p>
            <div class="ai-badge">✨ Personalized with AI</div>
          </div>
          
          <div class="content">
            ${aiData.response}
          </div>
          
          <div class="feedback-summary">
            <h3>Your Feedback Summary</h3>
            <p><strong>Rating:</strong> <span class="rating">${request.rating}/5 ⭐</span></p>
            ${request.issue_category ? `<p><strong>Category:</strong> ${request.issue_category}</p>` : ''}
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="footer">
            <p>This email was sent from ${hotelName}</p>
            <p>If you have any questions, please contact us directly.</p>
          </div>
        </div>
      </body>
      </html>
    `

    // Send the email using send-tenant-emails function
    console.log('📤 Sending detailed AI-powered email...')
    const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-tenant-emails', {
      body: {
        feedback_id: request.feedback_id,
        email_type: 'detailed_ai_thankyou',
        recipient_email: request.guest_email,
        subject: subject,
        html_content: htmlContent,
        tenant_id: request.tenant_id,
        tenant_slug: request.tenant_slug,
        priority: 'normal'
      }
    })

    if (emailError) {
      console.error('Failed to send detailed email:', emailError)
      throw new Error(`Email sending failed: ${emailError.message}`)
    }

    console.log('✅ Detailed AI-powered email sent successfully!')

    // Log the communication
    const { error: logError } = await supabase
      .from('communication_logs')
      .insert({
        feedback_id: request.feedback_id,
        guest_name: request.guest_name,
        guest_email: request.guest_email,
        room_number: request.room_number,
        message_type: 'email',
        direction: 'outbound',
        message_content: aiData.response,
        email_subject: subject,
        email_html: htmlContent,
        recipient_email: request.guest_email,
        email_type: 'detailed_ai_thankyou',
        ai_generated: true,
        status: 'sent',
        tenant_id: request.tenant_id,
        priority: 'normal',
        attempt_timestamp: new Date().toISOString()
      })

    if (logError) {
      console.warn('Failed to log communication:', logError)
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Detailed AI-powered email sent successfully',
      feedback_id: request.feedback_id,
      guest_email: request.guest_email,
      ai_generated: true,
      email_result: emailResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Failed to send detailed AI email:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
