import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EscalationRequest {
  feedback_id: string;
  escalation_level: number;
  reason: string;
  current_manager_id?: string;
}

interface ManagerHierarchy {
  primary: any;
  backup: any;
  general_manager: any;
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

    const requestData: EscalationRequest = await req.json();
    const { feedback_id, escalation_level, reason, current_manager_id } = requestData;

    if (!feedback_id || !escalation_level) {
      return new Response(JSON.stringify({
        error: 'feedback_id and escalation_level are required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔄 Escalation Manager: Processing escalation', {
      feedback_id,
      escalation_level,
      reason
    });

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

    // Get management hierarchy for this feedback category
    const hierarchy = await getManagementHierarchy(supabase, feedback.issue_category);
    
    // Determine next escalation target based on level
    const nextManager = getNextEscalationTarget(hierarchy, escalation_level);
    
    if (!nextManager) {
      console.log('⚠️ Maximum escalation level reached');
      return new Response(JSON.stringify({
        success: true,
        message: 'Maximum escalation level reached',
        feedback_id,
        escalation_level
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create escalation record
    const { data: escalationRecord, error: escalationError } = await supabase
      .from('escalation_logs')
      .insert({
        feedback_id,
        escalation_level,
        from_manager_id: current_manager_id,
        to_manager_id: nextManager.id,
        escalation_reason: reason,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (escalationError) {
      console.error('Failed to create escalation record:', escalationError);
      // Continue even if logging fails
    }

    // Send escalation email
    await sendEscalationNotification(supabase, feedback, nextManager, escalation_level, reason);

    // Update feedback status to indicate escalation
    await supabase
      .from('feedback')
      .update({
        status: 'escalated',
        updated_at: new Date().toISOString()
      })
      .eq('id', feedback_id);

    // Log escalation event
    await supabase
      .from('system_logs')
      .insert({
        tenant_id: '27843a9a-b53f-482a-87ba-1a3e52f55dc1',
        event_type: 'system_event',
        event_category: 'escalation',
        event_name: 'feedback_escalated',
        event_data: {
          feedback_id,
          escalation_level,
          from_manager: current_manager_id,
          to_manager: nextManager.id,
          to_manager_name: nextManager.name,
          to_manager_email: nextManager.email,
          reason
        },
        severity: escalation_level >= 3 ? 'critical' : 'warning'
      });

    console.log('✅ Escalation completed:', {
      feedback_id,
      escalation_level,
      escalated_to: nextManager.name,
      escalated_to_email: nextManager.email
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Feedback escalated successfully',
      feedback_id,
      escalation_level,
      escalated_to: {
        id: nextManager.id,
        name: nextManager.name,
        email: nextManager.email,
        department: nextManager.department,
        title: nextManager.title
      },
      escalation_record_id: escalationRecord?.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in escalation-manager:', error);
    return new Response(JSON.stringify({
      error: 'Escalation failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Helper function to get management hierarchy
async function getManagementHierarchy(supabase: any, issueCategory: string): Promise<ManagerHierarchy> {
  // Get category routing configuration
  const { data: categoryConfig } = await supabase
    .from('category_routing_configurations')
    .select(`
      manager_id,
      manager_configurations (
        id,
        name,
        email,
        department,
        title,
        is_primary
      )
    `)
    .eq('feedback_category', issueCategory)
    .eq('is_active', true)
    .single();

  // Get all managers for fallback hierarchy
  const { data: allManagers } = await supabase
    .from('manager_configurations')
    .select('*')
    .eq('is_active', true)
    .order('is_primary', { ascending: false });

  const primary = categoryConfig?.manager_configurations || allManagers?.find(m => m.is_primary);
  const backup = allManagers?.find(m => !m.is_primary && m.department !== 'Management');
  const general_manager = allManagers?.find(m => m.department === 'Management' || m.title.toLowerCase().includes('general'));

  return {
    primary: primary || { id: null, name: 'Primary Manager', email: 'g.basera@yahoo.com', department: 'Operations', title: 'Manager' },
    backup: backup || { id: null, name: 'Backup Manager', email: 'g.basera@yahoo.com', department: 'Operations', title: 'Assistant Manager' },
    general_manager: general_manager || { id: null, name: 'General Manager', email: 'g.basera@yahoo.com', department: 'Management', title: 'General Manager' }
  };
}

// Helper function to determine next escalation target
function getNextEscalationTarget(hierarchy: ManagerHierarchy, escalationLevel: number) {
  switch (escalationLevel) {
    case 1:
      return hierarchy.primary;
    case 2:
      return hierarchy.backup;
    case 3:
    case 4:
    case 5:
      return hierarchy.general_manager;
    default:
      return null; // Maximum escalation reached
  }
}

// Helper function to send escalation notification
async function sendEscalationNotification(supabase: any, feedback: any, manager: any, escalationLevel: number, reason: string) {
  const urgencyLevel = escalationLevel >= 3 ? 'CRITICAL' : escalationLevel >= 2 ? 'HIGH' : 'MEDIUM';
  const subject = `🚨 ESCALATION Level ${escalationLevel}: ${urgencyLevel} - Room ${feedback.room_number} (${feedback.rating}⭐)`;
  
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 3px solid #dc2626; border-radius: 8px; background: #fef2f2;">
      <h1 style="color: #dc2626; margin-bottom: 20px;">🚨 FEEDBACK ESCALATION - Level ${escalationLevel}</h1>
      
      <div style="background: #fee2e2; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <h2 style="color: #dc2626; margin-top: 0;">URGENT: ${urgencyLevel} Priority</h2>
        <p style="color: #dc2626; margin: 0; font-weight: 500;">This feedback has been escalated to you for immediate attention.</p>
      </div>

      <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <h3 style="color: #1f2937; margin-top: 0;">Feedback Details</h3>
        <p><strong>Guest:</strong> ${feedback.guest_name || 'Anonymous'}</p>
        <p><strong>Room:</strong> ${feedback.room_number || 'Not specified'}</p>
        <p><strong>Rating:</strong> ${feedback.rating}/5 stars</p>
        <p><strong>Category:</strong> ${feedback.issue_category}</p>
        <p><strong>Submitted:</strong> ${new Date(feedback.created_at).toLocaleString()}</p>
        <p><strong>Current Status:</strong> ${feedback.status.toUpperCase()}</p>
      </div>

      <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <h3 style="color: #1f2937; margin-top: 0;">Feedback Content</h3>
        <blockquote style="background: white; padding: 15px; border-left: 4px solid #6b7280; margin: 0; font-style: italic;">
          "${feedback.feedback_text}"
        </blockquote>
      </div>

      <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <h3 style="color: #92400e; margin-top: 0;">Escalation Reason</h3>
        <p style="color: #92400e; margin: 0;">${reason}</p>
      </div>

      <div style="background: #dbeafe; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <h3 style="color: #1e40af; margin-top: 0;">Required Actions</h3>
        <ul style="color: #1e40af; margin: 0; padding-left: 20px;">
          <li>Review and acknowledge this escalation immediately</li>
          <li>Contact the guest directly if email provided: ${feedback.guest_email || 'No email provided'}</li>
          <li>Investigate and resolve the underlying issue</li>
          <li>Update feedback status once resolved</li>
          <li>Document resolution actions taken</li>
        </ul>
      </div>

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">This escalation was automatically generated by GuestGlow SLA Management</p>
        <p style="color: #6b7280; font-size: 12px;">Feedback ID: ${feedback.id} | Escalation Level: ${escalationLevel}</p>
      </div>
    </div>`;

  return await supabase.functions.invoke('send-tenant-emails', {
    body: {
      feedback_id: feedback.id,
      email_type: 'manager_alert',
      recipient_email: manager.email,
      cc_emails: ['gizzy@guest-glow.com'],
      subject: subject,
      html_content: emailContent,
      tenant_id: '27843a9a-b53f-482a-87ba-1a3e52f55dc1',
      tenant_slug: 'eusbett',
      priority: 'high'
    }
  });
}
