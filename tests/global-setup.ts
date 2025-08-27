/**
 * 🔧 GLOBAL TEST SETUP
 * 
 * Prepares the test environment for escalation system testing
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wzfpltamwhkncxjvulik.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your-service-key'

async function globalSetup() {
  console.log('🔧 Setting up test environment...')
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  
  try {
    // 1. Set up testing timing (3-minute intervals)
    console.log('⏰ Configuring testing timing...')
    await supabase.rpc('execute_sql', {
      query: `
        UPDATE public.category_routing_configurations 
        SET auto_escalation_hours = 0.05  -- 3 minutes for testing
        WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'eusbett');
      `
    })
    
    // 2. Ensure test managers are configured
    console.log('👥 Verifying manager configuration...')
    const { data: managers } = await supabase
      .from('manager_configurations')
      .select('*')
      .eq('tenant_id', (await supabase.from('tenants').select('id').eq('slug', 'eusbett').single()).data?.id)
    
    if (!managers || managers.length === 0) {
      console.log('⚠️ No managers found, setting up test managers...')
      
      // Run the simplified escalation setup
      await supabase.rpc('execute_sql', {
        query: `
          -- Set up test managers
          INSERT INTO public.manager_configurations (
              tenant_id,
              manager_name,
              email_address,
              department,
              is_primary,
              escalation_level
          )
          SELECT 
              id as tenant_id,
              'Guest Relations Manager' as manager_name,
              'g.basera@yahoo.com' as email_address,
              'Guest Relations' as department,
              true as is_primary,
              1 as escalation_level
          FROM public.tenants 
          WHERE slug = 'eusbett'
          ON CONFLICT (tenant_id, department) DO UPDATE SET
              email_address = EXCLUDED.email_address,
              escalation_level = EXCLUDED.escalation_level;

          INSERT INTO public.manager_configurations (
              tenant_id,
              manager_name,
              email_address,
              department,
              is_primary,
              escalation_level
          )
          SELECT 
              id as tenant_id,
              'General Manager' as manager_name,
              'basera@btinternet.com' as email_address,
              'Management' as department,
              false as is_primary,
              2 as escalation_level
          FROM public.tenants 
          WHERE slug = 'eusbett'
          ON CONFLICT (tenant_id, department) DO UPDATE SET
              email_address = EXCLUDED.email_address,
              escalation_level = EXCLUDED.escalation_level;
        `
      })
    }
    
    // 3. Clean up any existing test data
    console.log('🧹 Cleaning up existing test data...')
    await supabase
      .from('feedback')
      .delete()
      .or('guest_name.eq.Escalation Test User,guest_name.eq.5-Star Test User')
    
    await supabase
      .from('qr_scan_logs')
      .delete()
      .eq('qr_code_id', 'reception_desk_001')
    
    // 4. Verify SLA functions are available
    console.log('🔍 Verifying SLA functions...')
    try {
      await supabase.functions.invoke('sla-monitor', { body: {} })
      console.log('✅ SLA monitor function available')
    } catch (error) {
      console.warn('⚠️ SLA monitor function not available:', error.message)
    }
    
    console.log('✅ Test environment setup complete!')
    
  } catch (error) {
    console.error('❌ Failed to set up test environment:', error)
    throw error
  }
}

export default globalSetup
