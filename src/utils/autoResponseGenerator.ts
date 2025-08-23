import { supabase } from '@/integrations/supabase/client';

/**
 * Automatically generates a response for a new external review
 * This function should be called whenever a new external review is added to the database
 */
export async function generateAutoResponse(externalReviewId: string) {
  try {
    // Get the review details
    const { data: review, error: reviewError } = await supabase
      .from('external_reviews')
      .select(`
        id,
        platform,
        guest_name,
        rating,
        review_text,
        review_date,
        sentiment,
        tenant_id
      `)
      .eq('id', externalReviewId)
      .single();

    if (reviewError || !review) {
      console.error('Error fetching review for auto-response:', reviewError);
      return;
    }

    // Only generate responses for reviews that need them (rating <= 3)
    if (review.rating > 3) {
      console.log('Review does not require response, skipping auto-generation');
      return;
    }

    // Check if a response already exists
    const { data: existingResponse } = await supabase
      .from('review_responses')
      .select('id')
      .eq('external_review_id', externalReviewId)
      .single();

    if (existingResponse) {
      console.log('Response already exists for this review, skipping auto-generation');
      return;
    }

    // Get tenant information
    const { data: tenant } = await supabase
      .from('tenants')
      .select('slug, name, brand_voice')
      .eq('id', review.tenant_id)
      .single();

    // Generate response using the improved format
    const responseText = generateImprovedResponse(review, tenant?.name || 'Eusbett Hotel');

    // Get default tenant if review doesn't have tenant_id
    let tenantId = review.tenant_id;
    if (!tenantId) {
      const { data: defaultTenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', 'eusbett')
        .single();
      tenantId = defaultTenant?.id;
    }

    // Insert the draft response
    const { error: insertError } = await supabase
      .from('review_responses')
      .insert({
        external_review_id: externalReviewId,
        response_text: responseText,
        status: 'draft',
        ai_model_used: 'auto-generated-template',
        response_version: 1,
        tenant_id: tenantId,
        priority: review.rating <= 2 ? 'high' : 'normal'
      });

    if (insertError) {
      console.error('Error creating auto-response:', insertError);
      return;
    }

    console.log('Auto-response generated successfully for review:', externalReviewId);
    
    // Log the auto-generation (only if system_logs table exists)
    try {
      await supabase
        .from('system_logs')
        .insert({
          tenant_id: tenantId,
          event_type: 'system_event',
          event_category: 'auto_response',
          event_name: 'response_auto_generated',
          event_data: {
            external_review_id: externalReviewId,
            rating: review.rating,
            platform: review.platform,
            guest_name: review.guest_name
          },
          severity: 'info'
        });
    } catch (logError) {
      // Ignore logging errors - system_logs table might not exist
      console.log('Could not log to system_logs (table might not exist):', logError);
    }

  } catch (error) {
    console.error('Error in generateAutoResponse:', error);
  }
}

/**
 * Generates an improved response format that addresses specific issues
 */
function generateImprovedResponse(review: any, hotelName: string): string {
  const reviewText = review.review_text.toLowerCase();
  const issues = [];
  
  // Common issue detection
  if (reviewText.includes('wifi') || reviewText.includes('internet')) issues.push('WiFi connectivity');
  if (reviewText.includes('breakfast')) issues.push('breakfast service');
  if (reviewText.includes('room service')) issues.push('room service timing');
  if (reviewText.includes('clean') || reviewText.includes('dirty')) issues.push('room cleanliness');
  if (reviewText.includes('air condition') || reviewText.includes('ac')) issues.push('air conditioning');
  if (reviewText.includes('staff') || reviewText.includes('service')) issues.push('staff service');
  if (reviewText.includes('shower') || reviewText.includes('water pressure')) issues.push('water pressure');
  if (reviewText.includes('noise') || reviewText.includes('loud')) issues.push('noise levels');
  if (reviewText.includes('check') && reviewText.includes('in')) issues.push('check-in process');
  if (reviewText.includes('parking')) issues.push('parking facilities');
  if (reviewText.includes('pool')) issues.push('pool facilities');
  if (reviewText.includes('restaurant') || reviewText.includes('food')) issues.push('restaurant service');

  // Create specific acknowledgment text
  const issueText = issues.length > 0 
    ? `the specific issues you raised regarding **${issues.join(', ')}**` 
    : 'the concerns you experienced during your stay';

  // Generate response based on rating
  let responseText;
  
  if (review.rating <= 2) {
    // Negative review response
    responseText = `Dear ${review.guest_name || 'Valued Guest'},

**Thank you for taking the time to share your valuable feedback with us.** We deeply appreciate your candid review as it helps us identify areas where we can enhance our service delivery.

I sincerely apologize for ${issueText}. This does not reflect the **exceptional standards we strive to maintain**, and we take full responsibility for not meeting your expectations. We have immediately addressed these concerns with our team and have implemented enhanced protocols to ensure better service delivery for all our guests.

Your feedback is instrumental in our continuous improvement efforts, and we would be honored to welcome you back to demonstrate the improvements we've made. Please feel free to contact me directly at **guestrelations@eusbetthotel.com** for your next visit, and I will personally ensure your experience exceeds expectations.

**Warm regards,**  
The ${hotelName} Guest Relations Team`;

  } else if (review.rating === 3) {
    // Neutral review response
    responseText = `Dear ${review.guest_name || 'Valued Guest'},

**Thank you for sharing your feedback about your recent stay with us.** We genuinely appreciate you taking the time to provide your honest review.

We acknowledge ${issueText} and want you to know that we take all guest feedback seriously. **We are actively working to enhance these areas** and have shared your comments with our management team to ensure continuous improvement in our service standards.

We hope to have the opportunity to welcome you back soon so we can demonstrate the **positive changes we've implemented** based on valuable feedback like yours.

**Warm regards,**  
The ${hotelName} Guest Relations Team`;

  } else {
    // Positive review response
    responseText = `Dear ${review.guest_name || 'Valued Guest'},

**Thank you so much for your outstanding review!** We are absolutely thrilled to hear about your wonderful experience at ${hotelName}. Your kind words about our ${issues.length > 0 ? issues.join(', ') + ' and overall' : ''} service truly warm our hearts and reaffirm our commitment to providing exceptional hospitality.

We are delighted that you found our hotel to be a perfect base for exploring the city, and that our team succeeded in making your stay special. **Our team takes immense pride in creating memorable experiences**, and knowing that we succeeded in making your stay exceptional means the world to us.

We look forward to welcoming you back for another exceptional stay at ${hotelName}. Your recommendation means everything to us, and we can't wait to create more wonderful memories together!

**Warm regards,**  
The ${hotelName} Guest Relations Team`;
  }

  // Add character count footer
  const finalResponse = responseText + `

---
*Ready for platform posting* • **${responseText.length + 50} characters**`;

  return finalResponse;
}

/**
 * Hook to automatically generate responses when reviews are added
 * Call this function whenever you insert a new external review
 */
export async function onExternalReviewAdded(reviewData: any) {
  // Generate auto-response after a short delay to ensure the review is fully inserted
  setTimeout(() => {
    generateAutoResponse(reviewData.id);
  }, 1000);
}
