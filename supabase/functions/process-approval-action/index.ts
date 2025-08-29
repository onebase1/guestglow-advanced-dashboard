import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    const action = url.searchParams.get('action')

    if (!token || !action) {
      return new Response(
        generateErrorPage('Invalid request', 'Missing token or action parameter'),
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' }, status: 400 }
      )
    }

    // Validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from('approval_tokens')
      .select(`
        *,
        response_approvals:approval_id (
          id,
          feedback_id,
          tenant_id,
          generated_response,
          risk_explanation,
          feedback:feedback_id (
            id,
            guest_name,
            guest_email,
            room_number,
            rating,
            comment
          )
        )
      `)
      .eq('token', token)
      .eq('action', action)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (tokenError || !tokenData) {
      return new Response(
        generateErrorPage('Invalid Token', 'This approval link has expired or has already been used.'),
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' }, status: 400 }
      )
    }

    const approval = tokenData.response_approvals

    // Mark token as used
    await supabase
      .from('approval_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token)

    // Update approval status
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    await supabase
      .from('response_approvals')
      .update({ 
        status: newStatus,
        approved_by: 'email_approval',
        approved_at: new Date().toISOString()
      })
      .eq('id', approval.id)

    // If approved, trigger email sending
    if (action === 'approve') {
      try {
        await supabase.functions.invoke('send-delayed-responses', {
          body: {
            feedback_id: approval.feedback_id,
            force_send: true
          }
        })
      } catch (emailError) {
        console.error('Failed to send approved response:', emailError)
        // Continue - approval was successful even if email failed
      }
    }

    // Generate success page
    const successPage = generateSuccessPage(action, approval)
    
    return new Response(
      successPage,
      { headers: { ...corsHeaders, 'Content-Type': 'text/html' }, status: 200 }
    )

  } catch (error) {
    console.error('Approval processing error:', error)
    return new Response(
      generateErrorPage('Processing Error', 'An error occurred while processing your approval.'),
      { headers: { ...corsHeaders, 'Content-Type': 'text/html' }, status: 500 }
    )
  }
})

function generateSuccessPage(action: string, approval: any): string {
  const actionText = action === 'approve' ? 'APPROVED' : 'REJECTED'
  const actionColor = action === 'approve' ? '#16a34a' : '#dc2626'
  const actionIcon = action === 'approve' ? '✅' : '❌'
  const feedback = approval.feedback

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Response ${actionText}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: ${actionColor}; color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${actionIcon} Response ${actionText}</h1>
                <p>Your decision has been processed successfully</p>
            </div>
            <div class="content">
                <h3>Feedback Details:</h3>
                <p><strong>Guest:</strong> ${feedback?.guest_name || 'Anonymous'}</p>
                <p><strong>Room:</strong> ${feedback?.room_number || 'N/A'}</p>
                <p><strong>Rating:</strong> ${feedback?.rating || 'N/A'}/5</p>
                <p><strong>Comment:</strong> ${feedback?.comment || 'No comment'}</p>
                
                <h3>Risk Assessment:</h3>
                <p>${approval.risk_explanation}</p>
                
                ${action === 'approve' ? 
                  '<p style="color: #16a34a;"><strong>✅ The response has been approved and will be sent to the guest.</strong></p>' :
                  '<p style="color: #dc2626;"><strong>❌ The response has been rejected and will NOT be sent to the guest.</strong></p>'
                }
                
                <p>Processed at: ${new Date().toLocaleString()}</p>
            </div>
            <div class="footer">
                <p>GuestGlow Human-in-Loop Approval System</p>
                <p>This action has been logged for audit purposes.</p>
            </div>
        </div>
    </body>
    </html>
  `
}

function generateErrorPage(title: string, message: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${title}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: #dc2626; color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; text-align: center; }
            .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚫 ${title}</h1>
            </div>
            <div class="content">
                <p>${message}</p>
                <p>If you believe this is an error, please contact the system administrator.</p>
            </div>
            <div class="footer">
                <p>GuestGlow Human-in-Loop Approval System</p>
            </div>
        </div>
    </body>
    </html>
  `
}
