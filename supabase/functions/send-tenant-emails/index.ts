import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  feedback_id?: string
  email_type: string
  recipient_email: string
  cc_emails?: string[]
  bcc_emails?: string[]
  subject: string
  html_content: string
  tenant_id: string
  tenant_slug: string
  priority: 'low' | 'normal' | 'high'
  custom_note?: string
}

interface ResendResponse {
  id: string
  from: string
  to: string[]
  created_at: string
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

    const emailRequest: EmailRequest = await req.json()
    console.log('📧 Email request received:', {
      type: emailRequest.email_type,
      recipient: emailRequest.recipient_email,
      tenant: emailRequest.tenant_slug,
      priority: emailRequest.priority
    })

    // Get Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }

    // Determine sender based on email type
    const senderConfig = getSenderConfig(emailRequest.email_type)

    // Tenant-specific display name
    const hotelName = emailRequest.tenant_slug
      ? emailRequest.tenant_slug.charAt(0).toUpperCase() + emailRequest.tenant_slug.slice(1) + ' Hotel'
      : 'Hotel Team'
    const displayName = emailRequest.email_type === 'guest_confirmation'
      ? `${hotelName} Team`
      : emailRequest.email_type === 'detailed_thankyou'
        ? `${hotelName} Guest Relations`
        : senderConfig.name

    // Prepare email payload for Resend
    const emailPayload = {
      from: `${displayName} <${senderConfig.from}>`,
      to: [emailRequest.recipient_email],
      cc: emailRequest.cc_emails || [],
      bcc: emailRequest.bcc_emails || [],
      subject: emailRequest.subject,
      html: emailRequest.html_content,
      headers: {
        'X-Entity-Ref-ID': emailRequest.feedback_id || 'system',
        'X-Tenant-Slug': emailRequest.tenant_slug,
        'X-Email-Type': emailRequest.email_type,
        'X-Priority': emailRequest.priority
      },
      reply_to: emailRequest.email_type === 'detailed_thankyou' ? 'guestrelations@guest-glow.com' : undefined
    }

    console.log('📤 Sending email via Resend:', {
      from: emailPayload.from,
      to: emailPayload.to,
      subject: emailPayload.subject
    })

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text()
      console.error('❌ Resend API error:', errorText)
      throw new Error(`Resend API error: ${resendResponse.status} - ${errorText}`)
    }

    const resendResult: ResendResponse = await resendResponse.json()
    console.log('✅ Email sent successfully:', resendResult.id)

    // Log email to communication_logs table
    await logEmailCommunication(supabase, emailRequest, resendResult)

    return new Response(
      JSON.stringify({
        success: true,
        email_id: resendResult.id,
        message: 'Email sent successfully',
        sender: senderConfig.from,
        recipient: emailRequest.recipient_email
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Email sending failed:', error)

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
 * Get sender configuration based on email type
 */
function getSenderConfig(emailType: string): { from: string; name: string } {
  const senderConfigs = {
    // Manager and system alerts
    'manager_alert': {
      from: 'alerts@guest-glow.com',
      name: 'GuestGlow Alerts'
    },
    'system_notification': {
      from: 'system@guest-glow.com',
      name: 'GuestGlow System'
    },
    'escalation': {
      from: 'urgent@guest-glow.com',
      name: 'GuestGlow Urgent'
    },

    // Guest communications
    'guest_confirmation': {
      from: 'donotreply@guest-glow.com',
      name: 'Eusbett Hotel Team'
    },
    'guest_thank_you': {
      from: 'feedback@guest-glow.com',
      name: 'GuestGlow Feedback'
    },
      'detailed_thankyou': {
        from: 'guestrelations@guest-glow.com',
        name: 'GuestGlow Guest Relations'
      },

    'satisfaction_followup': {
      from: 'relations@guest-glow.com',
      name: 'GuestGlow Guest Relations'
    },
    'feedback_link': {
      from: 'feedback@guest-glow.com',
      name: 'GuestGlow Feedback'
    },

    // Reports and analytics
    'gm_introduction_preview': {
      from: 'analytics@guest-glow.com',
      name: 'GuestGlow Analytics'
    },
    'gm_introduction_production': {
      from: 'analytics@guest-glow.com',
      name: 'GuestGlow Analytics'
    },
    'daily_report': {
      from: 'reports@guest-glow.com',
      name: 'GuestGlow Reports'
    },
    'weekly_report': {
      from: 'reports@guest-glow.com',
      name: 'GuestGlow Reports'
    },

    // Tenant management
    'tenant_welcome': {
      from: 'welcome@guest-glow.com',
      name: 'GuestGlow Welcome'
    }
  }

  return senderConfigs[emailType] || {
    from: 'system@guest-glow.com',
    name: 'GuestGlow System'
  }
}

/**
 * Log email communication to database
 */
async function logEmailCommunication(
  supabase: any,
  emailRequest: EmailRequest,
  resendResult: ResendResponse
) {
  try {
    const logEntry = {
      tenant_id: emailRequest.tenant_id,
      feedback_id: emailRequest.feedback_id || null,
      email_type: emailRequest.email_type,
      recipient_email: emailRequest.recipient_email,
      sender_email: resendResult.from,
      subject: emailRequest.subject,
      status: 'sent',
      external_id: resendResult.id,
      priority: emailRequest.priority,
      metadata: {
        cc_emails: emailRequest.cc_emails,
        bcc_emails: emailRequest.bcc_emails,
        custom_note: emailRequest.custom_note,
        resend_created_at: resendResult.created_at
      }
    }

    console.log('📝 Logging email communication with entry:', {
      email_type: logEntry.email_type,
      recipient: logEntry.recipient_email,
      feedback_id: logEntry.feedback_id
    })

    const { error } = await supabase
      .from('communication_logs')
      .insert(logEntry)

    if (error) {
      console.error('⚠️ Failed to log email communication:', error)
    } else {
      console.log('📝 Email communication logged successfully')
    }
  } catch (error) {
    console.error('⚠️ Error logging email communication:', error)
  }
}
