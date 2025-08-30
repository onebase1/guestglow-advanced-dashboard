import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SatisfactionFollowupRequest {
  feedback_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = (Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const requestData: SatisfactionFollowupRequest = await req.json();
    const { feedback_id } = requestData;

    if (!feedback_id) {
      return new Response(JSON.stringify({
        error: 'feedback_id is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('📧 Satisfaction Follow-up: Processing feedback ID:', feedback_id);

    // Get feedback details
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback')
      .select(`
        id,
        guest_name,
        guest_email,
        room_number,
        rating,
        feedback_text,
        issue_category,
        created_at,
        resolved_at,
        status
      `)
      .eq('id', feedback_id)
      .single();

    if (feedbackError || !feedback) {
      console.error('Feedback not found:', feedbackError);
      return new Response(JSON.stringify({
        error: 'Feedback not found',
        feedback_id
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Only send satisfaction follow-up if guest provided email
    if (!feedback.guest_email) {
      console.log('⚠️ No guest email provided, skipping satisfaction follow-up');
      return new Response(JSON.stringify({
        success: true,
        message: 'No guest email provided, satisfaction follow-up skipped',
        feedback_id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if we already sent a satisfaction follow-up for this feedback
    const { data: existingFollowup } = await supabase
      .from('communication_logs')
      .select('id')
      .eq('feedback_id', feedback_id)
      .eq('email_type', 'satisfaction_followup')
      .single();

    if (existingFollowup) {
      console.log('⚠️ Satisfaction follow-up already sent for this feedback');
      return new Response(JSON.stringify({
        success: true,
        message: 'Satisfaction follow-up already sent',
        feedback_id,
        existing_followup_id: existingFollowup.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get tenant information
    const { data: tenantInfo } = await supabase
      .from('tenants')
      .select('name, slug')
      .eq('slug', 'eusbett')
      .single();

    const tenantName = tenantInfo?.name || 'Eusbett Hotel';

    // Create satisfaction survey email
    const subject = `How did we do? Your feedback resolution follow-up - ${tenantName}`;
    
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; margin-bottom: 10px;">Thank you for your feedback!</h1>
          <p style="color: #6b7280; font-size: 16px;">We wanted to follow up on your recent experience</p>
        </div>
        
        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #3b82f6;">
          <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">Your Original Feedback</h2>
          <p><strong>Date:</strong> ${new Date(feedback.created_at).toLocaleDateString()}</p>
          <p><strong>Room:</strong> ${feedback.room_number || 'Not specified'}</p>
          <p><strong>Rating:</strong> ${feedback.rating}/5 stars</p>
          <p><strong>Category:</strong> ${feedback.issue_category}</p>
          ${feedback.resolved_at ? `<p><strong>Resolved:</strong> ${new Date(feedback.resolved_at).toLocaleDateString()}</p>` : ''}
        </div>

        <div style="background: #f0f9ff; padding: 25px; border-radius: 8px; margin-bottom: 25px; text-align: center;">
          <h2 style="color: #1e40af; margin-top: 0; margin-bottom: 20px;">How satisfied are you with our response?</h2>
          <p style="color: #1e40af; margin-bottom: 25px;">Your feedback helps us improve our service quality</p>
          
          <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
            <a href="mailto:basera@btinternet.com?subject=Satisfaction Survey - Very Satisfied&body=Feedback ID: ${feedback_id}%0D%0A%0D%0AI am VERY SATISFIED with how my feedback was handled."
               style="display: inline-block; background: #10b981; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 5px;">
              😊 Very Satisfied
            </a>
            <a href="mailto:basera@btinternet.com?subject=Satisfaction Survey - Satisfied&body=Feedback ID: ${feedback_id}%0D%0A%0D%0AI am SATISFIED with how my feedback was handled."
               style="display: inline-block; background: #3b82f6; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 5px;">
              🙂 Satisfied
            </a>
            <a href="mailto:basera@btinternet.com?subject=Satisfaction Survey - Neutral&body=Feedback ID: ${feedback_id}%0D%0A%0D%0AI am NEUTRAL about how my feedback was handled."
               style="display: inline-block; background: #f59e0b; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 5px;">
              😐 Neutral
            </a>
            <a href="mailto:basera@btinternet.com?subject=Satisfaction Survey - Dissatisfied&body=Feedback ID: ${feedback_id}%0D%0A%0D%0AI am DISSATISFIED with how my feedback was handled. Here's why:"
               style="display: inline-block; background: #ef4444; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 5px;">
              😞 Dissatisfied
            </a>
          </div>
        </div>

        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="color: #166534; margin-top: 0; margin-bottom: 15px;">We Value Your Opinion</h3>
          <p style="color: #166534; margin: 0; font-size: 14px;">
            Your satisfaction is our priority. If you have any additional comments or concerns, 
            please don't hesitate to reach out to us directly at 
            <a href="mailto:basera@btinternet.com" style="color: #166534; font-weight: 500;">basera@btinternet.com</a>
          </p>
        </div>

        <div style="text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          <p>Thank you for helping us improve our service!</p>
          <p style="margin-top: 15px;">
            <strong>The ${tenantName} Guest Relations Team</strong>
          </p>
          <p style="font-size: 12px; margin-top: 15px; color: #9ca3af;">
            Feedback ID: ${feedback_id} | This is an automated follow-up from GuestGlow
          </p>
        </div>
      </div>`;

    // Send satisfaction follow-up email
    const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-tenant-emails', {
      body: {
        feedback_id: feedback_id,
        email_type: 'satisfaction_followup',
        recipient_email: feedback.guest_email,
        cc_emails: ['gizzy@guest-glow.com'],
        subject: subject,
        html_content: emailContent,
        tenant_id: '27843a9a-b53f-482a-87ba-1a3e52f55dc1',
        tenant_slug: 'eusbett',
        priority: 'normal'
      }
    });

    if (emailError) {
      console.error('Failed to send satisfaction follow-up email:', emailError);
      throw new Error(`Email sending failed: ${emailError.message}`);
    }

    // Log the satisfaction follow-up
    await supabase
      .from('system_logs')
      .insert({
        tenant_id: '27843a9a-b53f-482a-87ba-1a3e52f55dc1',
        event_type: 'system_event',
        event_category: 'satisfaction_followup',
        event_name: 'satisfaction_survey_sent',
        event_data: {
          feedback_id,
          guest_name: feedback.guest_name,
          guest_email: feedback.guest_email,
          room_number: feedback.room_number,
          original_rating: feedback.rating,
          issue_category: feedback.issue_category
        },
        severity: 'info'
      });

    console.log('✅ Satisfaction follow-up sent successfully:', {
      feedback_id,
      guest_email: feedback.guest_email,
      guest_name: feedback.guest_name
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Satisfaction follow-up sent successfully',
      feedback_id,
      guest_email: feedback.guest_email,
      email_sent: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in send-satisfaction-followup:', error);
    return new Response(JSON.stringify({
      error: 'Satisfaction follow-up failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
