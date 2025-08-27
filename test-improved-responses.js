/*
ORPHANED FILE: test-improved-responses.js
This file appears to be orphaned and no longer used in the current system
Commenting out to prevent accidental execution
TODO: Verify this file is not needed and delete if confirmed

/**
 * Test script for improved external review response generation
 *
 * This script demonstrates the new human-like response generation system
 * by creating test reviews and generating varied responses.
 */

import { createClient } from '@supabase/supabase-js'
*/
import fs from 'fs'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

const supabase = createClient(supabaseUrl, supabaseKey)

// Sample reviews from the dataset to test with
const testReviews = [
  {
    guest_name: 'Prince B',
    rating: 1,
    review_text: 'I only got there for them to tell me NO ROOMS. After endless efforts for them to even get me an invoice for payment. The staff seem helpless and not on top of their game. Totally confused. They asked us to wait till 12pm to see if some occupants will leave the rooms. That was surprising because they couldn\'t even confirm that on their system. We waited and waited as no one was telling us anything. Well, we had to quickly look for another hotel who accepted us well. Obviously Eusbett hotel is overwhelmed by the patronage it receives. Their website is poor as you can\'t even book from there. There will not respond to the emails. My calls were picked but three different attendants could not even do a simple booking for me, only to fly from Accra to Sunyani and you say no room. To think that they even picked us from the airport. They can do better in order to be considered a top hotel.',
    platform: 'tripadvisor',
    sentiment: 'negative'
  },
  {
    guest_name: 'Eugene S',
    rating: 1,
    review_text: 'I have previously stayed at the hotel in the new section with no issues, I have now returned and was sectioned in room 1103, You cannot sleep as the music is too loud, I also ordered room service and did not receive it. This is now a night club and not a hotel to get relaxation anymore.',
    platform: 'tripadvisor',
    sentiment: 'negative'
  },
  {
    guest_name: 'Emmanuel B',
    rating: 4,
    review_text: 'Comfortable stay. However, I will recommend you put a caution statement at the washroom indicating that the first drops of shower within the first 1 minute is very hot so it\'s advisable to stay away. I nearly got scalded on my first day. That notwithstanding, it was an enjoyable stay.',
    platform: 'tripadvisor',
    sentiment: 'positive'
  },
  {
    guest_name: 'Genevieve M',
    rating: 5,
    review_text: 'The pillow is wonderful. Even if you don\'t bring any toiletries, don\'t be perturbed because they have got you covered. The food is good, the breakfast is the greatest. I really loved my stay here and so everytime I come to Sunyani, I\'d definitely come here❤️',
    platform: 'tripadvisor',
    sentiment: 'positive'
  },
  {
    guest_name: 'Swt J',
    rating: 2,
    review_text: 'The food I had was Jollof, I\'ve tasted their food and really enjoyed years back but the subsequent ones I had is nothing to write home. Today I bought Jollof (take home) really tasted awful, couldn\'t eat half of it. Don\'t know it their previous chef has been changed cos looks like anytime I go the food keeps getting worse. As for the staff they keep conversing, I had to walk to them to place my order but they still had to finish with their convo b4 responding to me smh',
    platform: 'tripadvisor',
    sentiment: 'negative'
  }
]

async function seedTestReviews() {
  try {
    console.log('🌱 Seeding test reviews for improved response generation...')
    
    // Get the default tenant (Eusbett)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', 'eusbett')
      .single()

    if (tenantError || !tenant) {
      console.error('❌ Tenant not found:', tenantError)
      return
    }

    console.log('✅ Found tenant:', tenant.id)

    // Insert test reviews
    for (const review of testReviews) {
      const reviewData = {
        tenant_id: tenant.id,
        platform: review.platform,
        platform_review_id: `test-improved-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        guest_name: review.guest_name,
        rating: review.rating,
        review_text: review.review_text,
        review_date: new Date().toISOString().split('T')[0],
        sentiment: review.sentiment
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

      console.log(`✅ Created review for ${review.guest_name} (${review.rating}⭐)`)

      // Generate improved response using the SUPABASE edge function
      try {
        const { data: result, error: functionError } = await supabase.functions.invoke('generate-external-review-response-improved', {
          body: {
            external_review_id: newReview.id,
            platform: review.platform,
            guest_name: review.guest_name,
            rating: review.rating,
            review_text: review.review_text,
            review_date: reviewData.review_date,
            sentiment: review.sentiment,
            tenant_id: tenant.id,
            regenerate: false
          }
        })

        if (!functionError && result?.success) {
          console.log(`✨ Generated improved response for ${review.guest_name}`)
          console.log(`📝 Response preview: ${result.response_text.substring(0, 100)}...`)
        } else {
          console.error(`❌ Failed to generate response for ${review.guest_name}:`, functionError?.message || result?.error)
        }
      } catch (error) {
        console.error(`❌ Error calling Supabase function for ${review.guest_name}:`, error)
      }

      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log('🎉 Test review seeding completed!')
    console.log('📊 Check the External Review Response Manager to see the improved responses')
    
  } catch (error) {
    console.error('❌ Error seeding test reviews:', error)
  }
}

// Function to compare old vs new responses
async function compareResponses() {
  try {
    console.log('🔍 Comparing old vs new response styles...')
    
    const { data: responses, error } = await supabase
      .from('review_responses')
      .select(`
        *,
        external_reviews (
          guest_name,
          rating,
          review_text
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('❌ Error fetching responses:', error)
      return
    }

    console.log('\n📊 Recent Response Analysis:')
    console.log('=' * 50)

    responses.forEach((response, index) => {
      const review = response.external_reviews
      console.log(`\n${index + 1}. ${review.guest_name} (${review.rating}⭐)`)
      console.log(`Model: ${response.ai_model_used}`)
      console.log(`Status: ${response.status}`)
      console.log(`Response preview: ${response.response_text.substring(0, 150)}...`)
      
      // Check for robotic phrases
      const roboticPhrases = [
        'Thank you for taking the time to share your valuable feedback with us',
        'We deeply appreciate your candid review',
        'We sincerely apologize for your disappointing experience'
      ]
      
      const hasRoboticLanguage = roboticPhrases.some(phrase => 
        response.response_text.includes(phrase)
      )
      
      console.log(`🤖 Contains robotic language: ${hasRoboticLanguage ? 'YES' : 'NO'}`)
    })

  } catch (error) {
    console.error('❌ Error comparing responses:', error)
  }
}

// Main execution
async function main() {
  const command = process.argv[2]
  
  switch (command) {
    case 'seed':
      await seedTestReviews()
      break
    case 'compare':
      await compareResponses()
      break
    default:
      console.log('Usage:')
      console.log('  node test-improved-responses.js seed     - Seed test reviews')
      console.log('  node test-improved-responses.js compare  - Compare response styles')
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { seedTestReviews, compareResponses }
*/
