// Send GM Introduction email to Eusbett GM and Edward Bennett
// Uses the latest HTML from GM-Introduction-Email-Enhanced.html
// Safe to run multiple times; sends one email with GM as primary recipient and Edward in CC.

import { readFile } from 'fs/promises'

const SUPABASE_URL = 'https://wzfpltamwhkncxjvulik.supabase.co'

async function main() {
  const html = await readFile('GM-Introduction-Email-Enhanced.html', 'utf8')

  const payload = {
    email_type: 'gm_introduction',
    recipient_email: 'gm@eusbetthotel.com',
    cc_emails: ['erbennett@gmail.com'],
    subject: 'GuestGlow Advanced Analytics - System Introduction for Eusbett Hotel',
    html_content: html,
    tenant_id: '27843a9a-b53f-482a-87ba-1a3e52f55dc1',
    tenant_slug: 'eusbett',
    priority: 'high',
    custom_note: 'Initial GM introduction to GM and Edward as requested.'
  }

  const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-tenant-emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Using anon key for invoking the public function (same as preview script)
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6ZnBsdGFtd2hrbmN4anZ1bGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDI5NTksImV4cCI6MjA3MDAxODk1OX0.4m707IwEkfrE-HIJFoP8hUz6VckZTTc_3CgH44f68Hk'
    },
    body: JSON.stringify(payload)
  })

  const text = await resp.text()
  if (!resp.ok) {
    console.error('Failed to send GM introduction:', resp.status, text)
    process.exit(1)
  }
  console.log('✅ GM introduction sent:', text)
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})

