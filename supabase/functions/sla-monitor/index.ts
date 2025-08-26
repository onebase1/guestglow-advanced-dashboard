import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SLACheckResult {
  feedback_id: string;
  guest_name: string;
  guest_email: string;
  room_number: string;
  rating: number;
  issue_category: string;
  created_at: string;
  status: string;
  hours_since_created: number;
  escalation_hours: number;
  assigned_manager: any;
  action_needed: 'reminder' | 'escalation' | 'satisfaction_followup' | 'none';
  escalation_level: number;
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

    console.log('🔍 SLA Monitor: Starting SLA compliance check...');

    // Get all unresolved feedback that needs SLA monitoring
    const { data: unresolvedFeedback, error: feedbackError } = await supabase
      .from('feedback')
      .select(`
        id,
        guest_name,
        guest_email,
        room_number,
        rating,
        issue_category,
        created_at,
        status,
        acknowledged_at,
        resolved_at
      `)
      .in('status', ['pending', 'acknowledged', 'in_progress', 'new'])
      .is('resolved_at', null);

    if (feedbackError) {
      console.error('Error fetching unresolved feedback:', feedbackError);
      throw feedbackError;
    }

    if (!unresolvedFeedback || unresolvedFeedback.length === 0) {
      console.log('✅ SLA Monitor: No unresolved feedback found');
      return new Response(JSON.stringify({
        success: true,
        message: 'No unresolved feedback requiring SLA action',
        checked_count: 0,
        actions_taken: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📋 SLA Monitor: Found ${unresolvedFeedback.length} unresolved feedback items`);

    const slaResults: SLACheckResult[] = [];
    let actionsCount = 0;

    // Process each unresolved feedback item
    for (const feedback of unresolvedFeedback) {
      const createdAt = new Date(feedback.created_at);
      const now = new Date();
      const hoursSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      // Get SLA configuration for this feedback category
      const { data: slaConfig } = await supabase
        .from('category_routing_configurations')
        .select(`
          auto_escalation_hours,
          priority_level,
          manager_id,
          manager_configurations (
            id,
            name,
            email,
            department,
            is_primary
          )
        `)
        .eq('feedback_category', feedback.issue_category)
        .eq('is_active', true)
        .single();

      const escalationHours = slaConfig?.auto_escalation_hours || 4;
      const assignedManager = slaConfig?.manager_configurations;

      // Determine what action is needed
      let actionNeeded: 'reminder' | 'escalation' | 'satisfaction_followup' | 'none' = 'none';
      let escalationLevel = 0;

      // Check if we need to send reminders or escalate
      if (hoursSinceCreated >= 0.5 && !feedback.acknowledged_at) {
        // 30-minute reminder if not acknowledged
        actionNeeded = 'reminder';
        escalationLevel = 1;
      } else if (hoursSinceCreated >= escalationHours) {
        // Escalation needed after configured hours
        actionNeeded = 'escalation';
        escalationLevel = Math.floor(hoursSinceCreated / escalationHours) + 1;
      }

      const result: SLACheckResult = {
        feedback_id: feedback.id,
        guest_name: feedback.guest_name || 'Anonymous',
        guest_email: feedback.guest_email || '',
        room_number: feedback.room_number || '',
        rating: feedback.rating,
        issue_category: feedback.issue_category,
        created_at: feedback.created_at,
        status: feedback.status,
        hours_since_created: Math.round(hoursSinceCreated * 100) / 100,
        escalation_hours: escalationHours,
        assigned_manager: assignedManager,
        action_needed: actionNeeded,
        escalation_level: escalationLevel
      };

      slaResults.push(result);

      // Take action if needed
      if (actionNeeded !== 'none') {
        console.log(`⚠️ SLA Action needed for feedback ${feedback.id}: ${actionNeeded} (Level ${escalationLevel})`);
        
        try {
          if (actionNeeded === 'reminder') {
            await sendReminderEmail(supabase, result);
          } else if (actionNeeded === 'escalation') {
            await sendEscalationEmail(supabase, result);
          }
          actionsCount++;
        } catch (actionError) {
          console.error(`Failed to take action for feedback ${feedback.id}:`, actionError);
        }
      }
    }

    // Log SLA monitoring results
    await supabase
      .from('system_logs')
      .insert({
        tenant_id: '27843a9a-b53f-482a-87ba-1a3e52f55dc1', // Eusbett tenant ID
        event_type: 'system_event',
        event_category: 'sla_monitoring',
        event_name: 'sla_check_completed',
        event_data: {
          total_checked: unresolvedFeedback.length,
          actions_taken: actionsCount,
          reminders_sent: slaResults.filter(r => r.action_needed === 'reminder').length,
          escalations_sent: slaResults.filter(r => r.action_needed === 'escalation').length
        },
        severity: 'info'
      });

    console.log(`✅ SLA Monitor: Completed. Checked ${unresolvedFeedback.length} items, took ${actionsCount} actions`);

    return new Response(JSON.stringify({
      success: true,
      message: 'SLA monitoring completed successfully',
      checked_count: unresolvedFeedback.length,
      actions_taken: actionsCount,
      results: slaResults.filter(r => r.action_needed !== 'none') // Only return items that needed action
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in SLA monitor:', error);
    return new Response(JSON.stringify({
      error: 'SLA monitoring failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Helper function to send reminder emails
async function sendReminderEmail(supabase: any, result: SLACheckResult) {
  const subject = `⏰ 30-Min Reminder: Unacknowledged Feedback - Room ${result.room_number} (${result.rating}⭐)`;
  
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #f59e0b; border-radius: 8px; background: #fffbeb;">
      <h1 style="color: #f59e0b; margin-bottom: 20px;">⏰ 30-Minute SLA Reminder</h1>
      
      <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <h2 style="color: #1f2937; margin-top: 0;">Feedback Details</h2>
        <p><strong>Guest:</strong> ${result.guest_name}</p>
        <p><strong>Room:</strong> ${result.room_number}</p>
        <p><strong>Rating:</strong> ${result.rating}/5 stars</p>
        <p><strong>Category:</strong> ${result.issue_category}</p>
        <p><strong>Time Since Submitted:</strong> ${result.hours_since_created} hours ago</p>
        <p><strong>Status:</strong> ${result.status.toUpperCase()}</p>
      </div>

      <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <h3 style="color: #92400e; margin-top: 0;">⚠️ Action Required</h3>
        <p style="color: #92400e; margin: 0;">This feedback has not been acknowledged within 30 minutes. Please review and acknowledge immediately to maintain SLA compliance.</p>
      </div>

      <div style="text-align: center; margin-top: 20px;">
        <p style="color: #6b7280; font-size: 14px;">This is an automated SLA compliance reminder from GuestGlow</p>
        <p style="color: #6b7280; font-size: 12px;">Feedback ID: ${result.feedback_id}</p>
      </div>
    </div>`;

  const managerEmail = result.assigned_manager?.email || 'system-fallback@guest-glow.com';

  return await supabase.functions.invoke('send-tenant-emails', {
    body: {
      feedback_id: result.feedback_id,
      email_type: 'manager_alert',
      recipient_email: managerEmail,
      cc_emails: ['gizzy@guest-glow.com'],
      subject: subject,
      html_content: emailContent,
      tenant_id: '27843a9a-b53f-482a-87ba-1a3e52f55dc1',
      tenant_slug: 'eusbett',
      priority: 'high'
    }
  });
}

// Helper function to send escalation emails
async function sendEscalationEmail(supabase: any, result: SLACheckResult) {
  const subject = `🚨 SLA ESCALATION: Unresolved Feedback - Room ${result.room_number} (${result.hours_since_created}h overdue)`;
  
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 3px solid #dc2626; border-radius: 8px; background: #fef2f2;">
      <h1 style="color: #dc2626; margin-bottom: 20px;">🚨 SLA ESCALATION - Level ${result.escalation_level}</h1>
      
      <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <h2 style="color: #1f2937; margin-top: 0;">Overdue Feedback Details</h2>
        <p><strong>Guest:</strong> ${result.guest_name}</p>
        <p><strong>Room:</strong> ${result.room_number}</p>
        <p><strong>Rating:</strong> ${result.rating}/5 stars</p>
        <p><strong>Category:</strong> ${result.issue_category}</p>
        <p><strong>Time Overdue:</strong> ${result.hours_since_created} hours (SLA: ${result.escalation_hours}h)</p>
        <p><strong>Current Status:</strong> ${result.status.toUpperCase()}</p>
      </div>

      <div style="background: #fee2e2; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <h3 style="color: #dc2626; margin-top: 0;">🚨 IMMEDIATE ACTION REQUIRED</h3>
        <p style="color: #dc2626; margin: 0;">This feedback has exceeded the ${result.escalation_hours}-hour SLA by ${(result.hours_since_created - result.escalation_hours).toFixed(1)} hours. Immediate resolution is required to prevent further escalation.</p>
      </div>

      <div style="text-align: center; margin-top: 20px;">
        <p style="color: #6b7280; font-size: 14px;">This is an automated SLA escalation from GuestGlow</p>
        <p style="color: #6b7280; font-size: 12px;">Feedback ID: ${result.feedback_id}</p>
      </div>
    </div>`;

  // Escalate to safe fallback for all escalation levels
  const recipientEmail = result.escalation_level >= 3 ? 'system-fallback@guest-glow.com' :
                         result.escalation_level >= 2 ? 'system-fallback@guest-glow.com' :
                         (result.assigned_manager?.email || 'system-fallback@guest-glow.com');

  return await supabase.functions.invoke('send-tenant-emails', {
    body: {
      feedback_id: result.feedback_id,
      email_type: 'manager_alert',
      recipient_email: recipientEmail,
      cc_emails: ['gizzy@guest-glow.com'],
      subject: subject,
      html_content: emailContent,
      tenant_id: '27843a9a-b53f-482a-87ba-1a3e52f55dc1',
      tenant_slug: 'eusbett',
      priority: 'high'
    }
  });
}
