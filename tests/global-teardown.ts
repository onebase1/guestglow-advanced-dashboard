/**
 * 🧹 GLOBAL TEST TEARDOWN
 * 
 * Cleans up test environment after escalation system testing
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wzfpltamwhkncxjvulik.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your-service-key'

async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...')
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  
  try {
    // 1. Clean up test feedback data
    console.log('🗑️ Removing test feedback...')
    await supabase
      .from('feedback')
      .delete()
      .or('guest_name.eq.Escalation Test User,guest_name.eq.5-Star Test User')
    
    // 2. Clean up test QR scan logs
    console.log('🗑️ Removing test QR scans...')
    await supabase
      .from('qr_scan_logs')
      .delete()
      .eq('qr_code_id', 'reception_desk_001')
    
    // 3. Clean up test escalation stats
    console.log('🗑️ Removing test escalation stats...')
    await supabase
      .from('escalation_stats')
      .delete()
      .in('manager_email', ['g.basera@yahoo.com', 'basera@btinternet.com'])
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
    
    // 4. Clean up test 5-star conversion logs
    console.log('🗑️ Removing test conversion logs...')
    await supabase
      .from('five_star_conversion_logs')
      .delete()
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
    
    // 5. Reset to production timing (optional - comment out if you want to keep testing timing)
    // console.log('⏰ Resetting to production timing...')
    // await supabase.rpc('execute_sql', {
    //   query: `
    //     UPDATE public.category_routing_configurations 
    //     SET auto_escalation_hours = 0.5  -- 30 minutes for production
    //     WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'eusbett');
    //   `
    // })
    
    console.log('✅ Test environment cleanup complete!')
    
  } catch (error) {
    console.error('❌ Failed to clean up test environment:', error)
    // Don't throw - we don't want cleanup failures to fail the tests
  }
}

export default globalTeardown
