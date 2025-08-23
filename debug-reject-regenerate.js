/**
 * Debug Reject & Regenerate Issue
 * 
 * This script helps debug why rejected responses disappear instead of regenerating
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wzfpltamwhkncxjvulik.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6ZnBsdGFtd2hrbmN4anZ1bGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDI5NTksImV4cCI6MjA3MDAxODk1OX0.4m707IwEkfrE-HIJFoP8hUz6VckZTTc_3CgH44f68Hk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugRejectRegenerate() {
  console.log('🔍 Debugging Reject & Regenerate Issue')
  console.log('=' * 50)

  try {
    // Get tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', 'eusbett')
      .single()

    if (!tenant) {
      console.error('❌ Tenant not found')
      return
    }

    console.log(`🏨 Using tenant: ${tenant.id}`)

    // Step 1: Create a test review
    console.log('\n📝 Step 1: Creating test review...')
    const { data: newReview, error: reviewError } = await supabase
      .from('external_reviews')
      .insert({
        tenant_id: tenant.id,
        platform: 'google',
        platform_review_id: 'debug-test-' + Date.now(),
        guest_name: 'Debug User',
        rating: 2,
        review_text: 'The WiFi was terrible and breakfast was cold. Staff seemed overwhelmed.',
        review_date: new Date().toISOString().split('T')[0],
        sentiment: 'negative'
      })
      .select('id')
      .single()

    if (reviewError) {
      console.error('❌ Error creating review:', reviewError)
      return
    }

    console.log(`✅ Review created: ${newReview.id}`)

    // Step 2: Create an initial draft response
    console.log('\n📝 Step 2: Creating initial draft response...')
    const { data: initialResponse, error: responseError } = await supabase
      .from('review_responses')
      .insert({
        external_review_id: newReview.id,
        response_text: 'Dear Debug User, We sincerely apologize for your disappointing experience...',
        status: 'draft',
        ai_model_used: 'test-initial',
        response_version: 1,
        tenant_id: tenant.id,
        priority: 'high'
      })
      .select('id')
      .single()

    if (responseError) {
      console.error('❌ Error creating initial response:', responseError)
      return
    }

    console.log(`✅ Initial response created: ${initialResponse.id}`)

    // Step 3: Check current responses
    console.log('\n📊 Step 3: Current responses before reject...')
    const { data: beforeResponses } = await supabase
      .from('review_responses')
      .select('id, status, response_text')
      .eq('external_review_id', newReview.id)

    console.log(`Found ${beforeResponses?.length || 0} responses:`)
    beforeResponses?.forEach(r => {
      console.log(`  - ${r.id}: ${r.status} (${r.response_text.substring(0, 50)}...)`)
    })

    // Step 4: Simulate the reject process
    console.log('\n🔄 Step 4: Simulating reject & regenerate...')
    
    // Mark as rejected
    const { error: rejectError } = await supabase
      .from('review_responses')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: 'Debug test rejection'
      })
      .eq('id', initialResponse.id)

    if (rejectError) {
      console.error('❌ Error rejecting response:', rejectError)
      return
    }

    console.log('✅ Response marked as rejected')

    // Step 5: Call the improved response function
    console.log('\n🤖 Step 5: Calling improved response function...')
    const { data: result, error: functionError } = await supabase.functions.invoke('generate-external-review-response-improved', {
      body: {
        external_review_id: newReview.id,
        platform: 'google',
        guest_name: 'Debug User',
        rating: 2,
        review_text: 'The WiFi was terrible and breakfast was cold. Staff seemed overwhelmed.',
        review_date: new Date().toISOString().split('T')[0],
        sentiment: 'negative',
        tenant_id: tenant.id,
        regenerate: true
      }
    })

    if (functionError) {
      console.error('❌ Function error:', functionError)
      return
    }

    console.log('📤 Function response:', JSON.stringify(result, null, 2))

    // Step 6: Check responses after regenerate
    console.log('\n📊 Step 6: Responses after regenerate...')
    await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds

    const { data: afterResponses } = await supabase
      .from('review_responses')
      .select('id, status, response_text, ai_model_used, created_at')
      .eq('external_review_id', newReview.id)
      .order('created_at', { ascending: false })

    console.log(`Found ${afterResponses?.length || 0} responses:`)
    afterResponses?.forEach(r => {
      console.log(`  - ${r.id}: ${r.status} (${r.ai_model_used}) - ${r.response_text.substring(0, 50)}...`)
    })

    // Step 7: Analysis
    console.log('\n🔍 Step 7: Analysis...')
    const draftResponses = afterResponses?.filter(r => r.status === 'draft') || []
    const rejectedResponses = afterResponses?.filter(r => r.status === 'rejected') || []

    console.log(`📊 Draft responses: ${draftResponses.length}`)
    console.log(`📊 Rejected responses: ${rejectedResponses.length}`)

    if (draftResponses.length === 0) {
      console.log('❌ ISSUE FOUND: No new draft response was created!')
      console.log('🔧 This explains why the response disappears from pending')
    } else {
      console.log('✅ SUCCESS: New draft response was created')
      console.log(`📝 New response preview: ${draftResponses[0].response_text.substring(0, 100)}...`)
    }

    // Step 8: Check if function actually succeeded
    if (result?.success) {
      console.log('✅ Function reported success')
      if (result.response_id) {
        console.log(`📝 Function created response ID: ${result.response_id}`)
      }
    } else {
      console.log('❌ Function reported failure:', result?.error)
    }

  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

// Run the debug
if (import.meta.url === `file://${process.argv[1]}`) {
  debugRejectRegenerate().catch(console.error)
}

export { debugRejectRegenerate }
