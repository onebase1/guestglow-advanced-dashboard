import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RequestBody {
  tenant_id?: string
  manager_email: string
  manager_name?: string
  note?: string
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const body: RequestBody = await req.json().catch(() => ({} as RequestBody))

    const payload = {
      id: crypto.randomUUID(),
      tenant_id: body.tenant_id ?? '27843a9a-b53f-482a-87ba-1a3e52f55dc1',
      manager_email: body.manager_email,
      manager_name: body.manager_name ?? null,
      note: body.note ?? null,
      requested_at: new Date().toISOString()
    }

    const { error } = await supabase.from('gm_access_requests').insert(payload)
    if (error) throw error

    // Send notification via existing send-tenant-emails function
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-tenant-emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        email_type: 'system_notification',
        recipient_email: 'security@guest-glow.com',
        cc_emails: ['info@guest-glow.com'],
        subject: 'GM Dashboard Access Request',
        html_content: `<p>New GM access request received.</p><p><strong>Email:</strong> ${payload.manager_email}<br/><strong>Name:</strong> ${payload.manager_name ?? '-'}<br/><strong>Tenant:</strong> ${payload.tenant_id}</p>`,
        tenant_id: payload.tenant_id,
        tenant_slug: 'eusbett',
        priority: 'high'
      })
    })

    return new Response(JSON.stringify({ success: true, message: 'Request recorded' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

