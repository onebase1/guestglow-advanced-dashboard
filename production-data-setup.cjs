/*
ORPHANED FILE: production-data-setup.cjs
This file appears to be orphaned and no longer used in the current system
Commenting out to prevent accidental execution
TODO: Verify this file is not needed and delete if confirmed

/**
 * Production Data Setup for Client Meeting
 *
 * This script:
 * 1. Seeds REAL Eusbett Hotel reviews from the dataset
 * 2. Deletes fake test reviews after real data is loaded
 * 3. Ensures production-ready data for tomorrow's meeting
 * 4. Applies 30-day auto-response rule for cost control
 */

const { createClient } = require('@supabase/supabase-js')
*/
const fs = require('fs')

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wzfpltamwhkncxjvulik.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6ZnBsdGFtd2hrbmN4anZ1bGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDI5NTksImV4cCI6MjA3MDAxODk1OX0.4m707IwEkfrE-HIJFoP8hUz6VckZTTc_3CgH44f68Hk'

const supabase = createClient(supabaseUrl, supabaseKey)

// Auto-response prevention: no auto-responses for reviews older than 30 days
const AUTO_RESPONSE_CUTOFF_DAYS = 30

async function shouldGenerateAutoResponse(reviewDate) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - AUTO_RESPONSE_CUTOFF_DAYS)
  
  const reviewDateObj = new Date(reviewDate)
  return reviewDateObj >= cutoffDate
}

async function setupProductionData() {
  console.log('🏨 PRODUCTION DATA SETUP FOR CLIENT MEETING')
  console.log('=' * 60)
  console.log('📅 Meeting: Tomorrow')
  console.log('🎯 Goal: Real Eusbett Hotel reviews only')
  console.log('')

  try {
    // Get tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('slug', 'eusbett')
      .single()

    if (tenantError || !tenant) {
      console.error('❌ Tenant not found:', tenantError)
      return
    }

    console.log(`🏨 Found tenant: ${tenant.name} (${tenant.id})`)

    // Load dataset
    const datasetPath = './dataset_hotel-review-aggregator_2025-06-30_08-27-27-383.json'
    if (!fs.existsSync(datasetPath)) {
      console.error('❌ Dataset file not found:', datasetPath)
      return
    }

    const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'))
    console.log(`📊 Dataset loaded: ${dataset.length} total reviews`)

    // Filter for Eusbett Hotel reviews only
    const eusbettReviews = dataset.filter(review => 
      review.placeName && review.placeName.toLowerCase().includes('eusbett')
    )

    console.log(`🏨 Found ${eusbettReviews.length} Eusbett Hotel reviews in dataset`)

    if (eusbettReviews.length === 0) {
      console.error('❌ No Eusbett Hotel reviews found in dataset!')
      return
    }

    // Show sample of what we found
    console.log('\n📋 Sample Eusbett reviews found:')
    eusbettReviews.slice(0, 3).forEach((review, index) => {
      console.log(`${index + 1}. ${review.reviewRating}⭐ - ${review.authorName} (${review.reviewDate})`)
      console.log(`   "${review.reviewText.substring(0, 80)}..."`)
    })

    console.log(`\n🚀 STEP 1: Loading ${eusbettReviews.length} REAL Eusbett reviews...`)

    let loadedCount = 0
    let autoResponseCount = 0
    let criticalAlertCount = 0

    for (const review of eusbettReviews) {
      try {
        // Check if review already exists
        const { data: existingReview } = await supabase
          .from('external_reviews')
          .select('id')
          .eq('platform_review_id', review.reviewId)
          .single()

        if (existingReview) {
          console.log(`⏭️  Review ${review.reviewId} already exists, skipping...`)
          continue
        }

        // Determine sentiment
        const sentiment = review.reviewRating <= 2 ? 'negative' : 
                         review.reviewRating >= 4 ? 'positive' : 'neutral'

        // Create external review
        const { data: newReview, error: reviewError } = await supabase
          .from('external_reviews')
          .insert({
            tenant_id: tenant.id,
            platform: review.provider,
            platform_review_id: review.reviewId,
            guest_name: review.authorName,
            rating: review.reviewRating,
            review_text: review.reviewText,
            review_date: review.reviewDate,
            sentiment: sentiment
          })
          .select('id')
          .single()

        if (reviewError) {
          console.error(`❌ Error creating review ${review.reviewId}:`, reviewError)
          continue
        }

        loadedCount++
        console.log(`✅ ${loadedCount}/${eusbettReviews.length}: ${review.authorName} (${review.reviewRating}⭐) - ${review.reviewDate}`)

        // Check if we should generate auto-response (30-day rule)
        const shouldAutoRespond = await shouldGenerateAutoResponse(review.reviewDate)

        if (shouldAutoRespond) {
          console.log('   🤖 Generating auto-response (recent review)...')
          
          try {
            const { data: result, error: functionError } = await supabase.functions.invoke('generate-external-review-response-improved', {
              body: {
                external_review_id: newReview.id,
                platform: review.provider,
                guest_name: review.authorName,
                rating: review.reviewRating,
                review_text: review.reviewText,
                review_date: review.reviewDate,
                sentiment: sentiment,
                tenant_id: tenant.id,
                regenerate: false
              }
            })

            if (result?.success) {
              autoResponseCount++
              console.log('   ✅ Auto-response generated')

              // Check for critical alert (only for low ratings)
              if (review.reviewRating <= 3) {
                const { data: alertResult } = await supabase.functions.invoke('external-review-critical-alert', {
                  body: {
                    external_review_id: newReview.id,
                    platform: review.provider,
                    guest_name: review.authorName,
                    rating: review.reviewRating,
                    review_text: review.reviewText,
                    review_date: review.reviewDate,
                    sentiment: sentiment,
                    tenant_id: tenant.id
                  }
                })

                if (alertResult?.critical_alert_needed) {
                  criticalAlertCount++
                  console.log(`   🚨 CRITICAL ALERT! Severity: ${alertResult.severity_score}/10`)
                }
              }
            } else {
              console.log('   ⚠️  Auto-response failed')
            }
          } catch (autoResponseError) {
            console.log('   ⚠️  Auto-response error:', autoResponseError.message)
          }
        } else {
          console.log('   ⏸️  Auto-response skipped (review too old)')
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`❌ Error processing review ${review.reviewId}:`, error)
      }
    }

    console.log(`\n✅ STEP 1 COMPLETE: Loaded ${loadedCount} real Eusbett reviews`)
    console.log(`🤖 Auto-responses generated: ${autoResponseCount}`)
    console.log(`🚨 Critical alerts triggered: ${criticalAlertCount}`)

    // STEP 2: Delete fake test reviews
    console.log(`\n🧹 STEP 2: Cleaning up fake test reviews...`)

    // Identify fake reviews (test patterns)
    const fakePatterns = [
      'test-',
      'debug-',
      'critical-test-',
      'positive-test-',
      'improved-test-',
      'Test Guest',
      'Debug User',
      'Sarah Johnson',
      'Michael Thompson',
      'Emma Wilson',
      'David Thompson',
      'Lisa Rodriguez'
    ]

    let deletedCount = 0

    for (const pattern of fakePatterns) {
      // Delete by platform_review_id pattern
      const { data: fakeByPlatformId } = await supabase
        .from('external_reviews')
        .select('id, platform_review_id, guest_name')
        .ilike('platform_review_id', `%${pattern}%`)

      if (fakeByPlatformId && fakeByPlatformId.length > 0) {
        const { error: deleteError } = await supabase
          .from('external_reviews')
          .delete()
          .ilike('platform_review_id', `%${pattern}%`)

        if (!deleteError) {
          deletedCount += fakeByPlatformId.length
          console.log(`🗑️  Deleted ${fakeByPlatformId.length} reviews with pattern: ${pattern}`)
        }
      }

      // Delete by guest_name pattern
      const { data: fakeByGuestName } = await supabase
        .from('external_reviews')
        .select('id, platform_review_id, guest_name')
        .ilike('guest_name', `%${pattern}%`)

      if (fakeByGuestName && fakeByGuestName.length > 0) {
        const { error: deleteError } = await supabase
          .from('external_reviews')
          .delete()
          .ilike('guest_name', `%${pattern}%`)

        if (!deleteError) {
          deletedCount += fakeByGuestName.length
          console.log(`🗑️  Deleted ${fakeByGuestName.length} reviews with guest: ${pattern}`)
        }
      }
    }

    console.log(`\n✅ STEP 2 COMPLETE: Deleted ${deletedCount} fake test reviews`)

    // Final verification
    console.log(`\n📊 FINAL VERIFICATION:`)
    const { data: finalReviews } = await supabase
      .from('external_reviews')
      .select('id, guest_name, rating, review_date, platform')
      .eq('tenant_id', tenant.id)
      .order('review_date', { ascending: false })

    console.log(`📈 Total reviews in database: ${finalReviews?.length || 0}`)
    console.log(`📅 Date range: ${finalReviews?.[finalReviews.length - 1]?.review_date} to ${finalReviews?.[0]?.review_date}`)

    const ratingDistribution = {}
    finalReviews?.forEach(r => {
      ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1
    })

    console.log('⭐ Rating distribution:')
    for (let i = 1; i <= 5; i++) {
      console.log(`   ${i}⭐: ${ratingDistribution[i] || 0} reviews`)
    }

    console.log('\n🎉 PRODUCTION DATA SETUP COMPLETE!')
    console.log('🚀 Ready for tomorrow\'s client meeting with REAL Eusbett Hotel data!')
    console.log('\n💡 Next steps:')
    console.log('1. Test External Review Response Manager')
    console.log('2. Verify human-like responses are working')
    console.log('3. Check critical alert system')
    console.log('4. Prepare demo workflow for client')

  } catch (error) {
    console.error('❌ Production setup failed:', error)
  }
}

// Run the production setup
if (require.main === module) {
  setupProductionData().catch(console.error)
}

module.exports = { setupProductionData }
*/
