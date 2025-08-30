import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApprovalNotificationRequest {
  approval_id: string
  tenant_id: string
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

    const { approval_id, tenant_id }: ApprovalNotificationRequest = await req.json()

    // Get approval details with feedback information
    const { data: approval, error: approvalError } = await supabase
      .from('response_approvals')
      .select(`
        *,
        feedback:feedback_id (
          id,
          guest_name,
          guest_email,
          room_number,
          rating,
          comment
        )
      `)
      .eq('id', approval_id)
      .single()

    if (approvalError || !approval) {
      throw new Error('Approval not found')
    }

    // Generate secure approval tokens
    const { data: approveToken, error: approveError } = await supabase
      .from('approval_tokens')
      .insert({
        approval_id,
        action: 'approve'
      })
      .select('token')
      .single()

    const { data: rejectToken, error: rejectError } = await supabase
      .from('approval_tokens')
      .insert({
        approval_id,
        action: 'reject'
      })
      .select('token')
      .single()

    if (approveError || rejectError || !approveToken || !rejectToken) {
      throw new Error('Failed to generate approval tokens')
    }

    // Generate approval links
    const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '') || 'https://your-project.supabase.co'
    const approveLink = `${baseUrl}/functions/v1/process-approval-action?token=${approveToken.token}&action=approve`
    const rejectLink = `${baseUrl}/functions/v1/process-approval-action?token=${rejectToken.token}&action=reject`

    // Generate email content
    const emailContent = generateApprovalEmail(approval, approveLink, rejectLink)

    // Send notification email
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'GuestGlow Alerts <alerts@guest-glow.com>',
        to: [
          'basera@btinternet.com', // TEMPORARY: Replaced guestrelations@eusbetthotel.com for security testing
          'gizzy@guest-glow.com',
          'g.basera@yahoo.com',
          'gm@eusbetthotels.com',
          'erbennett@gmail.com'
        ],
        subject: `🚨 HIGH RISK Response Requires Approval - ${approval.risk_factors.join(', ')}`,
        html: emailContent
      })
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      throw new Error(`Email sending failed: ${errorText}`)
    }

    const emailResult = await emailResponse.json()

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_id: emailResult.id,
        approve_token: approveToken.token,
        reject_token: rejectToken.token
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Approval notification error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

function generateApprovalEmail(approval: any, approveLink: string, rejectLink: string): string {
  const feedback = approval.feedback
  const riskFactorsList = approval.risk_factors.map((factor: string) => `<li style="color: #7f1d1d;">${factor}</li>`).join('')
  
  return `
    <div style="max-width: 600px; font-family: Arial, sans-serif;">
        
        <!-- Alert Header -->
        <div style="background: #dc2626; color: white; padding: 15px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">⚠️ HUMAN APPROVAL REQUIRED</h2>
            <p style="margin: 5px 0 0 0;">High-risk response detected - manual review needed</p>
        </div>
        
        <!-- Why Approval is Needed -->
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 0;">
            <h3 style="color: #dc2626; margin-top: 0;">🎯 WHY APPROVAL IS REQUIRED:</h3>
            <p style="margin: 0; font-weight: bold; color: #991b1b;">
                ${approval.risk_explanation}
            </p>
            <ul style="color: #7f1d1d;">
                ${riskFactorsList}
            </ul>
        </div>
        
        <!-- Risk Assessment -->
        <div style="background: #f9f9f9; padding: 15px;">
            <p><strong>Risk Score:</strong> ${approval.risk_score || 0}/100</p>
            <p><strong>AI Confidence:</strong> ${Math.round((approval.ai_confidence_score || 0) * 100)}%</p>
            <p><strong>Severity:</strong> ${approval.severity_level}</p>
            <p><strong>Categories:</strong> ${approval.risk_factors.join(', ')}</p>
        </div>
        
        <!-- Original Feedback -->
        <div style="margin: 20px 0;">
            <h3>📝 Original Guest Feedback:</h3>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; border-left: 4px solid #6b7280;">
                <p><strong>Guest:</strong> ${feedback?.guest_name || 'Anonymous'} | <strong>Room:</strong> ${feedback?.room_number || 'N/A'} | <strong>Rating:</strong> ${feedback?.rating || 'N/A'}/5</p>
                <p>${feedback?.comment || 'No comment provided'}</p>
            </div>
        </div>
        
        <!-- AI Generated Response -->
        <div style="margin: 20px 0;">
            <h3>🤖 Proposed AI Response:</h3>
            <div style="background: #eff6ff; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">
                ${approval.generated_response}
            </div>
        </div>
        
        <!-- Action Buttons -->
        <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f9fafb; border-radius: 8px;">
            <p style="margin-bottom: 20px; font-weight: bold;">Please review and take action:</p>
            
            <a href="${approveLink}" 
               style="background: #16a34a; color: white; padding: 15px 30px; text-decoration: none; 
                      border-radius: 8px; margin: 0 10px; font-weight: bold; display: inline-block;">
               ✅ APPROVE & SEND
            </a>
            
            <a href="${rejectLink}" 
               style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; 
                      border-radius: 8px; margin: 0 10px; font-weight: bold; display: inline-block;">
               ❌ REJECT (No Response)
            </a>
        </div>
        
        <!-- Footer -->
        <div style="background: #f3f4f6; padding: 15px; border-radius: 0 0 8px 8px; color: #6b7280; font-size: 12px;">
            <p><strong>⏰ Expires:</strong> 24 hours from now</p>
            <p><strong>📧 Feedback ID:</strong> ${feedback?.id || approval.feedback_id}</p>
            <p>If no action is taken within 24 hours, no response will be sent to the guest.</p>
        </div>
        
    </div>
  `
}
