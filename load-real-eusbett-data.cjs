/**
 * URGENT: Load Real Eusbett Hotel Data for Client Meeting
 * 
 * This script loads REAL Eusbett Hotel reviews from the Apify dataset
 * for tomorrow's client meeting. Uses only existing database columns.
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'https://wzfpltamwhkncxjvulik.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6ZnBsdGFtd2hrbmN4anZ1bGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDI5NTksImV4cCI6MjA3MDAxODk1OX0.4m707IwEkfrE-HIJFoP8hUz6VckZTTc_3CgH44f68Hk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function loadRealEusbettData() {
  console.log('🏨 LOADING REAL EUSBETT HOTEL DATA FOR CLIENT MEETING')
  console.log('=' * 60)
  console.log('📅 Meeting: Tomorrow')
  console.log('🎯 Goal: Real client data only')
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

    console.log(`🏨 Found ${eusbettReviews.length} Eusbett Hotel reviews`)

    if (eusbettReviews.length === 0) {
      console.error('❌ No Eusbett Hotel reviews found in dataset!')
      return
    }

    // Show sample
    console.log('\n📋 Sample Eusbett reviews:')
    eusbettReviews.slice(0, 5).forEach((review, index) => {
      console.log(`${index + 1}. ${review.reviewRating}⭐ - ${review.authorName} (${review.reviewDate})`)
      console.log(`   "${review.reviewText.substring(0, 100)}..."`)
    })

    console.log(`\n🚀 Loading ${eusbettReviews.length} REAL Eusbett reviews...`)

    let loadedCount = 0
    let skippedCount = 0

    for (const review of eusbettReviews) {
      try {
        // Check if review already exists
        const { data: existingReview } = await supabase
          .from('external_reviews')
          .select('id')
          .eq('platform_review_id', review.reviewId)
          .single()

        if (existingReview) {
          skippedCount++
          continue
        }

        // Determine sentiment
        const sentiment = review.reviewRating <= 2 ? 'negative' : 
                         review.reviewRating >= 4 ? 'positive' : 'neutral'

        // Create external review with only existing columns
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
            sentiment: sentiment,
            verified: true,
            language: 'en'
          })
          .select('id')
          .single()

        if (reviewError) {
          console.error(`❌ Error creating review ${review.reviewId}:`, reviewError)
          continue
        }

        loadedCount++
        if (loadedCount % 10 === 0) {
          console.log(`✅ Loaded ${loadedCount}/${eusbettReviews.length} reviews...`)
        }

      } catch (error) {
        console.error(`❌ Error processing review ${review.reviewId}:`, error.message)
      }
    }

    console.log(`\n✅ LOADING COMPLETE!`)
    console.log(`📊 Loaded: ${loadedCount} new reviews`)
    console.log(`⏭️  Skipped: ${skippedCount} existing reviews`)

    // Final verification
    const { data: finalReviews } = await supabase
      .from('external_reviews')
      .select('id, guest_name, rating, review_date, platform')
      .eq('tenant_id', tenant.id)
      .order('review_date', { ascending: false })

    console.log(`\n📈 Total Eusbett reviews in database: ${finalReviews?.length || 0}`)

    if (finalReviews && finalReviews.length > 0) {
      console.log(`📅 Date range: ${finalReviews[finalReviews.length - 1]?.review_date} to ${finalReviews[0]?.review_date}`)

      const ratingDistribution = {}
      finalReviews.forEach(r => {
        ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1
      })

      console.log('⭐ Rating distribution:')
      for (let i = 1; i <= 5; i++) {
        console.log(`   ${i}⭐: ${ratingDistribution[i] || 0} reviews`)
      }

      console.log('\n📋 Recent reviews:')
      finalReviews.slice(0, 5).forEach((review, index) => {
        console.log(`${index + 1}. ${review.rating}⭐ - ${review.guest_name} (${review.review_date})`)
      })
    }

    console.log('\n🎉 REAL EUSBETT DATA LOADED SUCCESSFULLY!')
    console.log('🚀 Ready for tomorrow\'s client meeting!')
    console.log('\n💡 Next steps:')
    console.log('1. Test External Review Response Manager')
    console.log('2. Verify responses work with real data')
    console.log('3. Prepare demo workflow for client')
    console.log('4. Show client their actual review data')

  } catch (error) {
    console.error('❌ Loading failed:', error)
  }
}

// Run the loading
if (require.main === module) {
  loadRealEusbettData().catch(console.error)
}

module.exports = { loadRealEusbettData }
