import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TenantOnboardingRequest {
  tenant_name: string;
  tenant_slug: string;
  contact_email: string;
  contact_phone?: string;
  primary_color?: string;
  secondary_color?: string;
  logo_url?: string;
  managers: Array<{
    name: string;
    email: string;
    phone?: string;
    department: string;
    title: string;
    is_primary?: boolean;
  }>;
  categories?: Array<{
    category: string;
    sla_hours: number;
    priority: string;
  }>;
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

    const requestData: TenantOnboardingRequest = await req.json();
    
    console.log('🏨 Starting tenant onboarding for:', requestData.tenant_name);

    // Validate required fields
    if (!requestData.tenant_name || !requestData.tenant_slug || !requestData.contact_email) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: tenant_name, tenant_slug, contact_email'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if tenant slug already exists
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', requestData.tenant_slug)
      .single();

    if (existingTenant) {
      return new Response(JSON.stringify({
        success: false,
        error: `Tenant slug '${requestData.tenant_slug}' already exists`
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate managers array
    if (!requestData.managers || requestData.managers.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'At least one manager must be provided'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Ensure at least one primary manager
    const hasPrimaryManager = requestData.managers.some(m => m.is_primary === true);
    if (!hasPrimaryManager) {
      requestData.managers[0].is_primary = true;
    }

    // Create complete tenant using database function
    const { data: result, error: createError } = await supabase.rpc('create_complete_tenant', {
      p_tenant_name: requestData.tenant_name,
      p_tenant_slug: requestData.tenant_slug,
      p_contact_email: requestData.contact_email,
      p_contact_phone: requestData.contact_phone || null,
      p_primary_color: requestData.primary_color || '#1f2937',
      p_secondary_color: requestData.secondary_color || '#3b82f6',
      p_logo_url: requestData.logo_url || null,
      p_managers: JSON.stringify(requestData.managers),
      p_categories: requestData.categories ? JSON.stringify(requestData.categories) : null
    });

    if (createError) {
      console.error('Error creating tenant:', createError);
      throw createError;
    }

    if (!result.success) {
      return new Response(JSON.stringify({
        success: false,
        error: result.error || 'Failed to create tenant'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Tenant created successfully:', result.tenant_id);

    // Generate sample QR codes
    const sampleQRs = [];
    const sampleRooms = ['101', '102', '201', '202'];
    const sampleAreas = ['Lobby', 'Restaurant', 'Pool', 'Gym'];

    for (const room of sampleRooms) {
      const { data: qrData } = await supabase.rpc('generate_tenant_qr_data', {
        p_tenant_slug: requestData.tenant_slug,
        p_room_number: room,
        p_area: null
      });
      if (qrData) sampleQRs.push({ type: 'room', identifier: room, ...qrData });
    }

    for (const area of sampleAreas) {
      const { data: qrData } = await supabase.rpc('generate_tenant_qr_data', {
        p_tenant_slug: requestData.tenant_slug,
        p_room_number: null,
        p_area: area
      });
      if (qrData) sampleQRs.push({ type: 'area', identifier: area, ...qrData });
    }

    // Validate setup completeness
    const { data: validation } = await supabase.rpc('validate_tenant_setup', {
      p_tenant_slug: requestData.tenant_slug
    });

    // Log successful onboarding
    await supabase
      .from('system_logs')
      .insert({
        tenant_id: result.tenant_id,
        event_type: 'system_event',
        event_category: 'tenant_onboarding',
        event_name: 'tenant_created',
        event_data: {
          tenant_name: requestData.tenant_name,
          tenant_slug: requestData.tenant_slug,
          manager_count: requestData.managers.length,
          setup_score: validation?.score || 0
        },
        severity: 'info'
      });

    // Send welcome email to primary manager
    const primaryManager = requestData.managers.find(m => m.is_primary) || requestData.managers[0];
    
    try {
      await supabase.functions.invoke('send-tenant-emails', {
        body: {
          email_type: 'tenant_welcome',
          recipient_email: primaryManager.email,
          subject: `Welcome to GuestGlow - ${requestData.tenant_name} Setup Complete!`,
          html_content: generateWelcomeEmail(requestData, result, validation),
          tenant_id: result.tenant_id,
          tenant_slug: requestData.tenant_slug,
          priority: 'normal'
        }
      });
    } catch (emailError) {
      console.warn('Failed to send welcome email:', emailError);
      // Don't fail the entire onboarding for email issues
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Tenant onboarded successfully!',
      tenant: {
        id: result.tenant_id,
        name: requestData.tenant_name,
        slug: requestData.tenant_slug,
        dashboard_url: `https://guest-glow.com/${requestData.tenant_slug}/dashboard`,
        feedback_url: `https://guest-glow.com/${requestData.tenant_slug}/quick-feedback`
      },
      setup_validation: validation,
      sample_qr_codes: sampleQRs,
      next_steps: [
        'Upload your logo to the assets section',
        'Test the feedback form with sample submissions',
        'Generate QR codes for your specific locations',
        'Configure external review monitoring',
        'Train your staff on the manager dashboard'
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in tenant onboarding:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Tenant onboarding failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function generateWelcomeEmail(tenantData: TenantOnboardingRequest, result: any, validation: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1f2937; margin-bottom: 10px;">🎉 Welcome to GuestGlow!</h1>
        <p style="color: #6b7280; font-size: 16px;">Your feedback management system is ready</p>
      </div>
      
      <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #10b981;">
        <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">Setup Complete for ${tenantData.tenant_name}</h2>
        <p><strong>Tenant Slug:</strong> ${tenantData.tenant_slug}</p>
        <p><strong>Setup Score:</strong> ${validation?.score || 0}/100</p>
        <p><strong>Managers Configured:</strong> ${tenantData.managers.length}</p>
        <p><strong>Dashboard URL:</strong> <a href="https://guest-glow.com/${tenantData.tenant_slug}/dashboard">Access Dashboard</a></p>
      </div>

      <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
        <h3 style="color: #1e40af; margin-top: 0; margin-bottom: 15px;">🚀 Next Steps</h3>
        <ol style="color: #1e40af; margin: 0; padding-left: 20px;">
          <li>Access your dashboard and familiarize yourself with the interface</li>
          <li>Generate QR codes for your specific locations</li>
          <li>Test the feedback submission process</li>
          <li>Configure external review monitoring</li>
          <li>Train your team on the SLA management system</li>
        </ol>
      </div>

      <div style="text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        <p>Need help? Contact support at <a href="mailto:support@guest-glow.com">support@guest-glow.com</a></p>
        <p style="margin-top: 15px;">
          <strong>The GuestGlow Team</strong>
        </p>
      </div>
    </div>`;
}
