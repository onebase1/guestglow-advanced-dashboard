/*
ORPHANED FILE: test-ai-email.js
This file appears to be orphaned and no longer used in the current system
Commenting out to prevent accidental execution
TODO: Verify this file is not needed and delete if confirmed

// Test script for AI-powered email generation
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wzfpltamwhkncxjvulik.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6ZnBsdGFtd2hrbmN4anZ1bGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI4NzQsImV4cCI6MjA1MDU0ODg3NH0.Ej5Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'

const supabase = createClient(supabaseUrl, supabaseKey)
*/

async function testAIEmailGeneration() {
  console.log('🧪 Testing AI-powered email generation...')
  
  try {
    const { data, error } = await supabase.functions.invoke('ai-response-generator', {
      body: {
        reviewText: "The room was clean and the staff was very friendly. Great location near the city center. Would definitely stay again!",
        rating: 5,
        isExternal: false,
        guestName: "John Smith",
        tenant_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        tenant_slug: "eusbett"
      }
    })
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }
    
    console.log('✅ AI Response Generated Successfully!')
    console.log('📧 Email Content:')
    console.log('=' .repeat(50))
    console.log(data.response)
    console.log('=' .repeat(50))
    console.log(`📊 Guest: ${data.guest_name}`)
    console.log(`⭐ Rating: ${data.rating}/5`)
    console.log(`📝 Type: ${data.type}`)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Test with different scenarios
async function runAllTests() {
  console.log('🚀 Starting AI Email Generation Tests\n')
  
  // Test 1: 5-star review
  console.log('Test 1: 5-star positive review')
  await testAIEmailGeneration()
  
  console.log('\n' + '='.repeat(60) + '\n')
  
  // Test 2: 2-star negative review
  console.log('Test 2: 2-star negative review')
  try {
    const { data, error } = await supabase.functions.invoke('ai-response-generator', {
      body: {
        reviewText: "Room was dirty, staff was rude, and the wifi didn't work. Very disappointed with our stay.",
        rating: 2,
        isExternal: false,
        guestName: "Sarah Johnson",
        tenant_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        tenant_slug: "eusbett"
      }
    })
    
    if (error) {
      console.error('❌ Error:', error)
    } else {
      console.log('✅ AI Response Generated Successfully!')
      console.log('📧 Email Content:')
      console.log('=' .repeat(50))
      console.log(data.response)
      console.log('=' .repeat(50))
    }
  } catch (error) {
    console.error('❌ Test 2 failed:', error)
  }
  
  console.log('\n🎉 All tests completed!')
}

runAllTests()
*/
