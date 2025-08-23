/**
 * Production-Ready Test for Improved External Review Response System
 * 
 * This script tests the human-like response generation and rates responses
 * based on our critical goals:
 * 1. Human-like, structured, and formatted for easy copy/paste
 * 2. Addresses specific reasons (negative or positive)
 * 3. Professional and appropriate for global deployment
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wzfpltamwhkncxjvulik.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6ZnBsdGFtd2hrbmN4anZ1bGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDI5NTksImV4cCI6MjA3MDAxODk1OX0.4m707IwEkfrE-HIJFoP8hUz6VckZTTc_3CgH44f68Hk'

const supabase = createClient(supabaseUrl, supabaseKey)

// Test reviews covering different scenarios
const testReviews = [
  {
    name: 'Critical Issue Test',
    guest_name: 'Sarah Johnson',
    rating: 1,
    review_text: 'Absolutely terrible experience. The room was filthy with mold in the bathroom, bed sheets had stains, and the shower had no hot water. Staff was extremely rude when I complained and refused to help. The WiFi never worked and I had important business calls to make. Food poisoning from the restaurant - I was sick for days. This place should be shut down. Completely unsafe and unsanitary.',
    platform: 'google',
    sentiment: 'negative',
    expected_manager_alert: true,
    expected_issues: ['cleanliness', 'staff service', 'WiFi', 'food safety', 'health hazard']
  },
  {
    name: 'Moderate Issue Test',
    guest_name: 'Michael Chen',
    rating: 2,
    review_text: 'Room was smaller than expected and WiFi kept dropping out during my video calls. Breakfast was cold and staff seemed overwhelmed. Not the worst but definitely not worth the price.',
    platform: 'tripadvisor',
    sentiment: 'negative',
    expected_manager_alert: false,
    expected_issues: ['room size', 'WiFi', 'breakfast', 'staff service']
  },
  {
    name: 'Mixed Experience Test',
    guest_name: 'Emma Wilson',
    rating: 3,
    review_text: 'The location is great and the room was clean, but the air conditioning was broken and it was very hot. Staff tried to help but couldn\'t fix it. The pool area was nice though.',
    platform: 'booking.com',
    sentiment: 'neutral',
    expected_manager_alert: false,
    expected_issues: ['air conditioning', 'maintenance']
  },
  {
    name: 'Positive Experience Test',
    guest_name: 'David Thompson',
    rating: 4,
    review_text: 'Really enjoyed our stay! The breakfast was excellent, especially the fresh pastries. Staff was friendly and helpful. Only minor issue was the shower pressure could be better.',
    platform: 'tripadvisor',
    sentiment: 'positive',
    expected_manager_alert: false,
    expected_issues: ['shower pressure'],
    positive_aspects: ['breakfast', 'staff service']
  },
  {
    name: 'Excellent Experience Test',
    guest_name: 'Lisa Rodriguez',
    rating: 5,
    review_text: 'Outstanding stay! The pillows were incredibly comfortable, breakfast was the best I\'ve had at any hotel, and the staff went above and beyond to make our anniversary special. The pool area was pristine and the location perfect for exploring the city. Will definitely return!',
    platform: 'google',
    sentiment: 'positive',
    expected_manager_alert: false,
    expected_issues: [],
    positive_aspects: ['pillows', 'breakfast', 'staff service', 'pool', 'location']
  }
]

// Response quality rating criteria
const qualityChecks = {
  humanLike: {
    weight: 25,
    checks: [
      { pattern: /^(Hello|Hi|Dear) \w+,?$/m, points: 5, desc: 'Natural greeting' },
      { avoid: /Thank you for taking the time to share your valuable feedback/i, points: 5, desc: 'Avoids robotic phrases' },
      { avoid: /We deeply appreciate your candid review/i, points: 3, desc: 'Avoids corporate speak' },
      { avoid: /We sincerely apologize for your disappointing experience/i, points: 3, desc: 'Avoids template language' },
      { pattern: /\b(I'm|We're|I appreciate|Your experience)\b/i, points: 5, desc: 'Uses natural language' },
      { pattern: /\b(sorry to hear|glad to hear|pleased|understand)\b/i, points: 4, desc: 'Shows empathy' }
    ]
  },
  structured: {
    weight: 20,
    checks: [
      { pattern: /^.+,\s*$/m, points: 5, desc: 'Proper greeting with comma' },
      { pattern: /\n\n/g, points: 3, desc: 'Has paragraph breaks' },
      { pattern: /(Best regards|Warm regards|Sincerely),?\s*\n/i, points: 5, desc: 'Professional closing' },
      { pattern: /Team$/m, points: 2, desc: 'Ends with team signature' }
    ]
  },
  addressesIssues: {
    weight: 30,
    checks: [
      { dynamic: true, desc: 'Addresses specific issues mentioned' },
      { dynamic: true, desc: 'Acknowledges positive aspects for high ratings' },
      { pattern: /\b(WiFi|internet|connectivity)\b/i, points: 3, desc: 'Addresses WiFi issues when mentioned' },
      { pattern: /\b(breakfast|food|dining)\b/i, points: 3, desc: 'Addresses food issues when mentioned' },
      { pattern: /\b(clean|cleanliness|dirty)\b/i, points: 3, desc: 'Addresses cleanliness when mentioned' },
      { pattern: /\b(staff|service|team)\b/i, points: 3, desc: 'Addresses service when mentioned' }
    ]
  },
  professional: {
    weight: 15,
    checks: [
      { pattern: /\b(guestrelations@|contact|reach out)\b/i, points: 5, desc: 'Provides contact for serious issues' },
      { avoid: /\b(compensation|refund|money back)\b/i, points: 5, desc: 'Avoids financial promises' },
      { pattern: /\b(improve|address|working on|steps)\b/i, points: 3, desc: 'Shows commitment to improvement' },
      { avoid: /\b(lawsuit|legal|sue|court)\b/i, points: 5, desc: 'Avoids legal language' }
    ]
  },
  copyPaste: {
    weight: 10,
    checks: [
      { maxLength: 500, points: 5, desc: 'Appropriate length for platforms' },
      { avoid: /\*\*|\#\#|```/g, points: 5, desc: 'No markdown formatting' },
      { pattern: /^[A-Z]/, points: 2, desc: 'Starts with capital letter' },
      { pattern: /[.!]$/, points: 2, desc: 'Ends with proper punctuation' }
    ]
  }
}

async function testResponseGeneration() {
  console.log('🧪 Testing Production-Ready External Review Response System')
  console.log('=' * 60)

  // Get tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', 'eusbett')
    .single()

  if (tenantError || !tenant) {
    console.error('❌ Tenant not found:', tenantError)
    return
  }

  const results = []

  for (const testCase of testReviews) {
    console.log(`\n🔍 Testing: ${testCase.name}`)
    console.log(`👤 Guest: ${testCase.guest_name} (${testCase.rating}⭐)`)
    console.log(`📝 Review: ${testCase.review_text.substring(0, 100)}...`)

    try {
      // Create test review
      const reviewData = {
        tenant_id: tenant.id,
        platform: testCase.platform,
        platform_review_id: `test-prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        guest_name: testCase.guest_name,
        rating: testCase.rating,
        review_text: testCase.review_text,
        review_date: new Date().toISOString().split('T')[0],
        sentiment: testCase.sentiment
      }

      const { data: newReview, error: reviewError } = await supabase
        .from('external_reviews')
        .insert(reviewData)
        .select('id')
        .single()

      if (reviewError) {
        console.error('❌ Error creating review:', reviewError)
        continue
      }

      // Generate response
      const { data: result, error: functionError } = await supabase.functions.invoke('generate-external-review-response-improved', {
        body: {
          external_review_id: newReview.id,
          platform: testCase.platform,
          guest_name: testCase.guest_name,
          rating: testCase.rating,
          review_text: testCase.review_text,
          review_date: reviewData.review_date,
          sentiment: testCase.sentiment,
          tenant_id: tenant.id,
          regenerate: false
        }
      })

      if (functionError) {
        console.error('❌ Function error:', functionError)
        continue
      }

      if (!result.success) {
        console.error('❌ Response generation failed:', result.error)
        continue
      }

      // Rate the response
      const rating = rateResponse(result.response_text, testCase)
      
      results.push({
        testCase: testCase.name,
        rating: rating.overall,
        response: result.response_text,
        breakdown: rating.breakdown,
        issues: rating.issues
      })

      console.log(`✅ Generated response (${rating.overall}% quality)`)
      console.log(`📊 Breakdown: ${Object.entries(rating.breakdown).map(([k,v]) => `${k}:${v}%`).join(', ')}`)
      
      if (rating.issues.length > 0) {
        console.log(`⚠️  Issues: ${rating.issues.join(', ')}`)
      }

      console.log('\n📋 Generated Response:')
      console.log('─'.repeat(50))
      console.log(result.response_text)
      console.log('─'.repeat(50))

    } catch (error) {
      console.error(`❌ Error testing ${testCase.name}:`, error)
    }

    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  // Summary
  console.log('\n📊 FINAL RESULTS')
  console.log('=' * 60)
  
  const avgRating = results.reduce((sum, r) => sum + r.rating, 0) / results.length
  console.log(`🎯 Overall Quality Score: ${avgRating.toFixed(1)}%`)
  
  results.forEach(result => {
    const status = result.rating >= 80 ? '✅' : result.rating >= 60 ? '⚠️' : '❌'
    console.log(`${status} ${result.testCase}: ${result.rating}%`)
  })

  const passedTests = results.filter(r => r.rating >= 80).length
  console.log(`\n🏆 Tests Passed: ${passedTests}/${results.length}`)
  
  if (avgRating >= 80) {
    console.log('🎉 SYSTEM IS PRODUCTION READY!')
  } else {
    console.log('⚠️  System needs improvement before production')
  }

  return results
}

function rateResponse(responseText, testCase) {
  const breakdown = {}
  const issues = []
  let totalScore = 0
  let maxScore = 0

  for (const [category, config] of Object.entries(qualityChecks)) {
    let categoryScore = 0
    let categoryMax = 0

    for (const check of config.checks) {
      if (check.dynamic) {
        // Dynamic checks based on test case
        if (check.desc.includes('specific issues')) {
          const mentionedIssues = testCase.expected_issues || []
          const addressedIssues = mentionedIssues.filter(issue => 
            responseText.toLowerCase().includes(issue.toLowerCase())
          )
          const points = Math.min(10, (addressedIssues.length / mentionedIssues.length) * 10)
          categoryScore += points
          categoryMax += 10
          
          if (addressedIssues.length < mentionedIssues.length) {
            issues.push(`Missing issues: ${mentionedIssues.filter(i => !addressedIssues.includes(i)).join(', ')}`)
          }
        }
        
        if (check.desc.includes('positive aspects') && testCase.rating >= 4) {
          const positiveAspects = testCase.positive_aspects || []
          const acknowledgedAspects = positiveAspects.filter(aspect =>
            responseText.toLowerCase().includes(aspect.toLowerCase())
          )
          const points = Math.min(8, (acknowledgedAspects.length / positiveAspects.length) * 8)
          categoryScore += points
          categoryMax += 8
        }
        continue
      }

      categoryMax += check.points

      if (check.pattern && check.pattern.test(responseText)) {
        categoryScore += check.points
      } else if (check.avoid && !check.avoid.test(responseText)) {
        categoryScore += check.points
      } else if (check.maxLength && responseText.length <= check.maxLength) {
        categoryScore += check.points
      } else if (!check.pattern && !check.avoid && !check.maxLength) {
        // Default case
        categoryScore += check.points
      } else if (check.pattern && !check.pattern.test(responseText)) {
        issues.push(`Missing: ${check.desc}`)
      } else if (check.avoid && check.avoid.test(responseText)) {
        issues.push(`Found: ${check.desc}`)
      }
    }

    const categoryPercent = categoryMax > 0 ? (categoryScore / categoryMax) * 100 : 100
    breakdown[category] = Math.round(categoryPercent)
    
    totalScore += categoryScore * (config.weight / 100)
    maxScore += categoryMax * (config.weight / 100)
  }

  const overall = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0

  return {
    overall,
    breakdown,
    issues
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testResponseGeneration().catch(console.error)
}

export { testResponseGeneration, rateResponse }
