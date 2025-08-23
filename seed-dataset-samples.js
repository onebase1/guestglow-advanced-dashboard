/**
 * Smart Dataset Seeding Script
 * 
 * This script:
 * 1. Adds auto-response prevention rule for reviews older than 1 month
 * 2. Seeds only a few sample reviews from the dataset (not all - too expensive)
 * 3. Preserves existing data
 * 4. Tests automatic actions (critical alerts, etc.)
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wzfpltamwhkncxjvulik.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6ZnBsdGFtd2hrbmN4anZ1bGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDI5NTksImV4cCI6MjA3MDAxODk1OX0.4m707IwEkfrE-HIJFoP8hUz6VckZTTc_3CgH44f68Hk'

const supabase = createClient(supabaseUrl, supabaseKey)

// Auto-response prevention rule: no auto-responses for reviews older than 30 days
const AUTO_RESPONSE_CUTOFF_DAYS = 30

async function shouldGenerateAutoResponse(reviewDate) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - AUTO_RESPONSE_CUTOFF_DAYS)
  
  const reviewDateObj = new Date(reviewDate)
  const shouldGenerate = reviewDateObj >= cutoffDate
  
  console.log(`📅 Review date: ${reviewDate}, Cutoff: ${cutoffDate.toISOString().split('T')[0]}, Auto-response: ${shouldGenerate ? '✅' : '❌'}`)
  
  return shouldGenerate
}

async function seedDatasetSamples() {
  console.log('🌱 Starting Smart Dataset Seeding')
  console.log('=' * 50)

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

    // Select diverse sample reviews (different ratings, dates, issues)
    const sampleReviews = [
      // Critical issue (1-star) - should trigger manager alert if recent
      dataset.find(r => r.reviewRating === 1 && r.reviewText.toLowerCase().includes('poor')),
      
      // Service issue (2-star) - moderate issue
      dataset.find(r => r.reviewRating === 2),
      
      // Mixed experience (3-star)
      dataset.find(r => r.reviewRating === 3),
      
      // Good experience (4-star)
      dataset.find(r => r.reviewRating === 4),
      
      // Excellent experience (5-star) - should get positive response
      dataset.find(r => r.reviewRating === 5),
      
      // Recent review (if any) - to test auto-response
      dataset.find(r => new Date(r.reviewDate) > new Date('2024-12-01'))
    ].filter(Boolean) // Remove any undefined entries

    console.log(`🎯 Selected ${sampleReviews.length} sample reviews for seeding`)

    let seededCount = 0
    let autoResponseCount = 0
    let criticalAlertCount = 0

    for (const review of sampleReviews) {
      try {
        console.log(`\n📝 Processing: ${review.reviewTitle || 'Untitled'} (${review.reviewRating}⭐)`)
        console.log(`👤 Author: ${review.authorName}, Date: ${review.reviewDate}`)
        console.log(`📱 Platform: ${review.provider}`)

        // Check if review already exists
        const { data: existingReview } = await supabase
          .from('external_reviews')
          .select('id')
          .eq('platform_review_id', review.reviewId)
          .single()

        if (existingReview) {
          console.log('⏭️  Review already exists, skipping...')
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
            sentiment: sentiment,
            review_url: review.reviewUrl,
            review_title: review.reviewTitle
          })
          .select('id')
          .single()

        if (reviewError) {
          console.error('❌ Error creating review:', reviewError)
          continue
        }

        seededCount++
        console.log(`✅ Review seeded with ID: ${newReview.id}`)

        // Check if we should generate auto-response
        const shouldAutoRespond = await shouldGenerateAutoResponse(review.reviewDate)

        if (shouldAutoRespond) {
          console.log('🤖 Generating auto-response...')
          
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

            if (functionError) {
              console.error('⚠️  Auto-response failed:', functionError)
            } else if (result.success) {
              autoResponseCount++
              console.log('✅ Auto-response generated')

              // Check for critical alert (only for low ratings)
              if (review.reviewRating <= 3) {
                console.log('🚨 Checking for critical issues...')
                
                const { data: alertResult, error: alertError } = await supabase.functions.invoke('external-review-critical-alert', {
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

                if (alertError) {
                  console.error('⚠️  Critical alert check failed:', alertError)
                } else if (alertResult?.critical_alert_needed) {
                  criticalAlertCount++
                  console.log(`🚨 CRITICAL ALERT TRIGGERED! Severity: ${alertResult.severity_score}/10`)
                  console.log(`📧 Manager email sent for: ${alertResult.primary_issues.join(', ')}`)
                } else {
                  console.log('ℹ️  No critical alert needed')
                }
              }
            } else {
              console.error('⚠️  Auto-response generation failed:', result.error)
            }
          } catch (autoResponseError) {
            console.error('⚠️  Auto-response error:', autoResponseError)
          }
        } else {
          console.log('⏸️  Auto-response skipped (review too old)')
        }

        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (error) {
        console.error(`❌ Error processing review ${review.reviewId}:`, error)
      }
    }

    // Summary
    console.log('\n📊 SEEDING SUMMARY')
    console.log('=' * 50)
    console.log(`✅ Reviews seeded: ${seededCount}`)
    console.log(`🤖 Auto-responses generated: ${autoResponseCount}`)
    console.log(`🚨 Critical alerts triggered: ${criticalAlertCount}`)
    console.log(`⏸️  Auto-responses skipped: ${seededCount - autoResponseCount} (too old)`)

    // Check final counts
    const { data: finalCounts } = await supabase
      .from('external_reviews')
      .select('id')

    console.log(`📈 Total reviews in database: ${finalCounts?.length || 0}`)

    console.log('\n🎉 Smart seeding completed successfully!')
    console.log('\n💡 Next steps:')
    console.log('1. Check External Review Response Manager for new drafts')
    console.log('2. Look for manager alert emails (if any critical issues found)')
    console.log('3. Test the Reject & Regenerate functionality')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
  }
}

// Run the seeding
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatasetSamples().catch(console.error)
}

export { seedDatasetSamples, shouldGenerateAutoResponse }
