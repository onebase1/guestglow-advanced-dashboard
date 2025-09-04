// CommonJS script to send the updated GM Introduction email to your personal email for review
const fs = require('fs');
const path = require('path');

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), 'GM-Introduction-Email-Enhanced.html');
  const html = fs.readFileSync(filePath, 'utf8');

  const payload = {
    email_type: 'gm_introduction_preview',
    recipient_email: 'g.basera@yahoo.com',
    subject: '[PREVIEW] GuestGlow Advanced Analytics - System Introduction for Eusbett Hotel',
    html_content: html,
    tenant_id: '27843a9a-b53f-482a-87ba-1a3e52f55dc1',
    tenant_slug: 'eusbett',
    priority: 'normal',
    custom_note: 'Preview of the updated GM introduction email.'
  };

  const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-tenant-emails`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error('Failed to send preview:', resp.status, text);
    process.exit(1);
  }

  const result = await resp.json();
  console.log('✅ Preview sent:', result);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

