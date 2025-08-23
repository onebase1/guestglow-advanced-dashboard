// Test script to create draft responses for testing the Reject & Regenerate functionality
// Run this in the browser console on your dashboard page

async function createTestDraftResponses() {
  console.log('Creating test draft responses...');
  
  // First, let's get some existing external reviews
  const { data: reviews, error: reviewsError } = await supabase
    .from('external_reviews')
    .select('*')
    .limit(3);
    
  if (reviewsError) {
    console.error('Error fetching reviews:', reviewsError);
    return;
  }
  
  if (!reviews || reviews.length === 0) {
    console.log('No external reviews found. Creating a test review first...');
    
    // Create a test external review
    const { data: newReview, error: insertError } = await supabase
      .from('external_reviews')
      .insert({
        place_name: 'Eusbett Hotel',
        provider: 'google',
        review_id: 'test-' + Date.now(),
        review_rating: 2,
        review_text: 'Very disappointed with our stay. The room was not clean on arrival and the shower had very low pressure. Staff was unhelpful when we complained. Would not recommend.',
        author_name: 'Test Guest',
        review_date: new Date().toISOString(),
        sentiment: 'negative',
        response_required: true,
        priority: 'high',
        status: 'new'
      })
      .select()
      .single();
      
    if (insertError) {
      console.error('Error creating test review:', insertError);
      return;
    }
    
    reviews.push(newReview);
  }
  
  // Create draft responses for the reviews
  for (const review of reviews.slice(0, 2)) {
    const oldStyleResponse = `Dear ${review.author_name || 'Valued Guest'}, We sincerely apologize for your disappointing experience. Your feedback is extremely important to us, and we are taking immediate action to address the issues you've raised. Please contact our management team directly so we can make this right. We are committed to regaining your trust and confidence. - Eusbett Hotel Management`;
    
    const { error: responseError } = await supabase
      .from('review_responses')
      .insert({
        external_review_id: review.id,
        response_text: oldStyleResponse,
        status: 'draft',
        ai_model_used: 'test-old-format',
        response_version: 1,
        priority: review.review_rating <= 2 ? 'high' : 'normal'
      });
      
    if (responseError) {
      console.error('Error creating draft response:', responseError);
    } else {
      console.log(`Created draft response for review ${review.id}`);
    }
  }
  
  console.log('Test draft responses created! Refresh the page to see them.');
}

// Run the function
createTestDraftResponses();
