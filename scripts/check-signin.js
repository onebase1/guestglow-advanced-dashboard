import { createClient } from '@supabase/supabase-js'

const url = 'https://wzfpltamwhkncxjvulik.supabase.co'
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6ZnBsdGFtd2hrbnN4anZ1bGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDI5NTksImV4cCI6MjA3MDAxODk1OX0.4m707IwEkfrE-HIJFoP8hUz6VckZTTc_3CgH44f68Hk'

const EMAIL = process.env.TEST_EMAIL || 'g.basera@yahoo.com'
const PASSWORD = process.env.TEST_PASSWORD || 'test123'

async function main() {
  const supabase = createClient(url, anon)
  const { data, error } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  console.log('signin result:', { error: error?.message || null, user: data?.user?.id || null })
}

main().catch(e => { console.error(e); process.exit(1) })

