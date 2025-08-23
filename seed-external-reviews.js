const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://wzfpltamwhkncxjvulik.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6ZnBsdGFtd2hrbmN4anZ1bGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDI5NTksImV4cCI6MjA3MDAxODk1OX0.4m707IwEkfrE-HIJFoP8hUz6VckZTTc_3CgH44f68Hk';

const supabase = createClient(supabaseUrl, supabaseKey);

// Sentiment analysis helper
function analyzeSentiment(rating, reviewText) {
  if (rating <= 2) return 'negative';
  if (rating >= 4) return 'positive';

  // For rating 3, analyze text for sentiment keywords
  const text = reviewText.toLowerCase();
  const negativeWords = ['bad', 'terrible', 'awful', 'poor', 'worst', 'horrible', 'disappointed', 'dirty', 'rude', 'slow'];
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'perfect', 'love', 'best', 'clean', 'friendly'];

  const negativeCount = negativeWords.filter(word => text.includes(word)).length;
  const positiveCount = positiveWords.filter(word => text.includes(word)).length;

  if (negativeCount > positiveCount) return 'negative';
  if (positiveCount > negativeCount) return 'positive';
  return 'neutral';
}

// Generate AI response for reviews that need them
function generateAutoResponse(review) {
  const { authorName, reviewText, reviewRating } = review;
  const guestName = authorName || 'Valued Guest';

  // Extract specific issues from review text
  const text = reviewText.toLowerCase();
  const issues = [];

  if (text.includes('wifi') || text.includes('internet')) issues.push('WiFi connectivity');
  if (text.includes('breakfast') || text.includes('food')) issues.push('food service');
  if (text.includes('room service')) issues.push('room service timing');
  if (text.includes('clean') || text.includes('dirty')) issues.push('room cleanliness');
  if (text.includes('air condition') || text.includes('ac')) issues.push('air conditioning');
  if (text.includes('staff') || text.includes('service')) issues.push('staff service');
  if (text.includes('shower') || text.includes('water')) issues.push('bathroom facilities');
  if (text.includes('noise') || text.includes('loud')) issues.push('noise levels');
  if (text.includes('booking') || text.includes('reservation')) issues.push('booking process');

  // Create response based on rating
  if (reviewRating >= 4) {
    // Positive response
    return `Dear ${guestName},

**Thank you so much for your wonderful review!** We are absolutely delighted to hear about your positive experience with us.

Your kind words about our service mean the world to our entire team. We strive to provide exceptional hospitality, and knowing that we succeeded in making your stay memorable truly makes our day.

We look forward to welcoming you back soon for another outstanding experience. Please don't hesitate to reach out to us directly at **guestrelations@eusbetthotel.com** for any future reservations or special requests.

**Warm regards,**
The Eusbett Hotel Guest Relations Team`;
  } else {
    // Negative/neutral response with specific issue acknowledgment
    const issueText = issues.length > 0
      ? `the specific issues you raised regarding **${issues.join(', ')}**`
      : 'the concerns you experienced during your stay';

    return `Dear ${guestName},

**Thank you for taking the time to share your valuable feedback with us.** We deeply appreciate your candid review as it helps us identify areas where we can enhance our service delivery.

I sincerely apologize for ${issueText}. This does not reflect the **exceptional standards we strive to maintain**, and we take full responsibility for not meeting your expectations. We have immediately addressed these concerns with our team and have implemented enhanced protocols to ensure better service delivery for all our guests.

Your feedback is instrumental in our continuous improvement efforts, and we would be honored to welcome you back to demonstrate the improvements we've made. Please feel free to contact me directly at **guestrelations@eusbetthotel.com** for your next visit, and I will personally ensure your experience exceeds expectations.

**Warm regards,**
The Eusbett Hotel Guest Relations Team`;
  }
}

async function seedExternalReviews() {
  try {
    console.log('🚀 Starting external reviews seeding process...');

    // Read the dataset
    const datasetPath = './dataset_hotel-review-aggregator_2025-06-30_08-27-27-383.json';
    const rawData = fs.readFileSync(datasetPath, 'utf8');
    const reviews = JSON.parse(rawData);

    console.log(`📊 Found ${reviews.length} reviews in dataset`);

    // Get Eusbett tenant ID
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', 'eusbett')
      .single();

    if (tenantError || !tenant) {
      throw new Error('Eusbett tenant not found');
    }

    console.log(`🏨 Using tenant ID: ${tenant.id}`);

    let insertedReviews = 0;
    let generatedResponses = 0;
    let skippedReviews = 0;

    for (const review of reviews) {
      try {
        // Check if review already exists
        const { data: existingReview } = await supabase
          .from('external_reviews')
          .select('id')
          .eq('platform_review_id', review.reviewId)
          .eq('platform', review.provider)
          .single();

        if (existingReview) {
          skippedReviews++;
          continue;
        }

        // Insert external review
        const reviewData = {
          tenant_id: tenant.id,
          platform: review.provider,
          platform_review_id: review.reviewId,
          guest_name: review.authorName,
          rating: review.reviewRating,
          review_text: review.reviewText,
          review_date: review.reviewDate,
          sentiment: analyzeSentiment(review.reviewRating, review.reviewText),
          review_url: review.reviewUrl,
          review_title: review.reviewTitle || null
        };

        const { data: insertedReview, error: reviewError } = await supabase
          .from('external_reviews')
          .insert(reviewData)
          .select('id')
          .single();

        if (reviewError) {
          console.error(`❌ Failed to insert review ${review.reviewId}:`, reviewError);
          continue;
        }

        insertedReviews++;

        // Check if review needs a response (no existing response in dataset or low rating)
        const needsResponse = !review.reviewResponses ||
                             review.reviewResponses.length === 0 ||
                             review.reviewRating <= 3;

        if (needsResponse) {
          // Generate and insert AI response
          const responseText = generateAutoResponse(review);
          const priority = review.reviewRating <= 2 ? 'high' : 'normal';

          const { error: responseError } = await supabase
            .from('review_responses')
            .insert({
              external_review_id: insertedReview.id,
              response_text: responseText,
              status: 'draft',
              ai_model_used: 'auto-generated-seeded',
              response_version: 1,
              tenant_id: tenant.id,
              priority: priority
            });

          if (responseError) {
            console.error(`❌ Failed to generate response for review ${review.reviewId}:`, responseError);
          } else {
            generatedResponses++;
          }
        }

        // Progress indicator
        if (insertedReviews % 10 === 0) {
          console.log(`📈 Progress: ${insertedReviews} reviews inserted, ${generatedResponses} responses generated`);
        }

      } catch (error) {
        console.error(`❌ Error processing review ${review.reviewId}:`, error);
      }
    }

    console.log('\n✅ Seeding completed!');
    console.log(`📊 Summary:`);
    console.log(`   • Reviews inserted: ${insertedReviews}`);
    console.log(`   • Responses generated: ${generatedResponses}`);
    console.log(`   • Reviews skipped (already exist): ${skippedReviews}`);
    console.log(`   • Total processed: ${insertedReviews + skippedReviews}`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedExternalReviews();
}

module.exports = { seedExternalReviews };