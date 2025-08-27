import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScheduleDetailedThankYouRequest {
  feedback_id: string
  guest_name: string
  guest_email: string
  room_number?: string
  rating: number
  feedback_text: string
  issue_category?: string
  tenant_id: string
  tenant_slug: string
  delay_minutes?: number // Default to 3 minutes for testing, 15 for production
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

    const request: ScheduleDetailedThankYouRequest = await req.json()
    console.log('📅 Scheduling detailed thank you email for:', {
      feedback_id: request.feedback_id,
      guest: request.guest_name,
      rating: request.rating,
      delay_minutes: request.delay_minutes || 3
    })

    // Only schedule if guest provided email
    if (!request.guest_email) {
      console.log('⚠️ No guest email provided, skipping detailed thank you scheduling')
      return new Response(JSON.stringify({
        success: true,
        message: 'No guest email provided, detailed thank you skipped',
        feedback_id: request.feedback_id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if we already scheduled a detailed thank you for this feedback
    const { data: existingSchedule } = await supabase
      .from('email_queue')
      .select('id')
      .eq('metadata->>feedback_id', request.feedback_id)
      .eq('email_type', 'detailed_thankyou')
      .single()

    if (existingSchedule) {
      console.log('⚠️ Detailed thank you already scheduled for this feedback')
      return new Response(JSON.stringify({
        success: true,
        message: 'Detailed thank you already scheduled',
        feedback_id: request.feedback_id,
        existing_schedule_id: existingSchedule.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Generate the detailed thank you content using AI-powered generator
    const { data: thankYouData, error: thankYouError } = await supabase.functions.invoke('ai-response-generator', {
      body: {
        reviewText: request.feedback_text,
        rating: request.rating,
        isExternal: false,
        guestName: request.guest_name,
        tenant_id: request.tenant_id,
        tenant_slug: request.tenant_slug
      }
    })

    if (thankYouError) {
      console.error('Failed to generate thank you content:', thankYouError)
      throw new Error(`Thank you generation failed: ${thankYouError.message}`)
    }

    // Calculate scheduled time (3 minutes from now for testing, 15 for production)
    const delayMinutes = request.delay_minutes || 3
    const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString()

    // Create email HTML content
    const hotelName = request.tenant_slug.charAt(0).toUpperCase() + request.tenant_slug.slice(1) + ' Hotel'
    const subject = `Thank You for Your Feedback - ${hotelName}`
    
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
          .content { padding: 30px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .feedback-summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .rating { color: #ffa500; font-weight: bold; }
          .highlight { background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Thank You for Your Feedback</h1>
            <p>${hotelName}</p>
          </div>
          
          <div class="content">
            <div style="white-space: pre-line; font-size: 16px;">
              ${thankYouData.response}
            </div>
            
            <div class="feedback-summary">
              <h3>Your Feedback Summary</h3>
              <p><strong>Rating:</strong> <span class="rating">${request.rating}/5 ⭐</span></p>
              ${request.issue_category ? `<p><strong>Category:</strong> ${request.issue_category}</p>` : ''}
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            ${request.rating <= 3 ? `
            <div class="highlight">
              <strong>We want to make this right.</strong> A member of our team will be in touch with you soon to address your concerns and ensure your satisfaction.
            </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>This email was sent from ${hotelName}</p>
            <p>If you have any questions, please contact us directly.</p>
          </div>
        </div>
      </body>
      </html>
    `

    // Schedule the email in the queue
    const { data: queueResult, error: queueError } = await supabase.functions.invoke('email-queue', {
      body: {
        action: 'add',
        email_data: {
          email_type: 'detailed_thankyou',
          recipient_email: request.guest_email,
          subject: subject,
          html_content: htmlContent,
          tenant_id: request.tenant_id,
          tenant_slug: request.tenant_slug,
          priority: 'normal',
          scheduled_for: scheduledFor,
          feedback_id: request.feedback_id
        }
      }
    })

    if (queueError) {
      console.error('Failed to schedule detailed thank you email:', queueError)
      throw new Error(`Email scheduling failed: ${queueError.message}`)
    }

    // Log the scheduling
    await supabase
      .from('system_logs')
      .insert({
        tenant_id: request.tenant_id,
        event_type: 'system_event',
        event_category: 'detailed_thankyou',
        event_name: 'detailed_thankyou_scheduled',
        event_data: {
          feedback_id: request.feedback_id,
          guest_name: request.guest_name,
          guest_email: request.guest_email,
          room_number: request.room_number,
          rating: request.rating,
          issue_category: request.issue_category,
          scheduled_for: scheduledFor,
          delay_minutes: delayMinutes
        },
        severity: 'info'
      })

    console.log('✅ Detailed thank you email scheduled successfully:', {
      feedback_id: request.feedback_id,
      guest_email: request.guest_email,
      scheduled_for: scheduledFor,
      queue_id: queueResult?.queue_id
    })

    return new Response(JSON.stringify({
      success: true,
      message: 'Detailed thank you email scheduled successfully',
      feedback_id: request.feedback_id,
      scheduled_for: scheduledFor,
      delay_minutes: delayMinutes,
      queue_id: queueResult?.queue_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Failed to schedule detailed thank you email:', error)
    
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
