// Create Dreampath Luxury Resort - Second Tenant Demo
// This creates a complete second tenant with your personal emails and mock data

console.log('🏨 Creating Dreampath Luxury Resort - Second Tenant Demo');

const dreamPathTenantData = {
  tenant_name: "Dreampath Luxury Resort",
  tenant_slug: "dreampath-resort",
  contact_email: "g.basera@yahoo.com",
  contact_phone: "+44 7824 975049",
  primary_color: "#2d3748", // Dark gray
  secondary_color: "#38b2ac", // Teal
  logo_url: "/dreampath-logo.svg",
  managers: [
    {
      name: "Hotel Manager", // General Manager (Primary)
      email: "g.basera@yahoo.com",
      phone: "+233 24 678 9012",
      department: "Management",
      title: "General Manager",
      is_primary: true
    },
    {
      name: "Sarah Johnson", // Food & Beverage
      email: "basera@btinternet.com",
      phone: "+233 24 123 4567",
      department: "Food & Beverage",
      title: "Food & Beverage Manager",
      is_primary: false
    },
    {
      name: "Michael Asante", // Housekeeping
      email: "zara80@gmail.com",
      phone: "+233 24 234 5678",
      department: "Housekeeping",
      title: "Housekeeping Manager",
      is_primary: false
    },
    {
      name: "Robert Kwame", // Security
      email: "g.basera80@gmail.com",
      phone: "+233 24 345 6789",
      department: "Security",
      title: "Security Manager",
      is_primary: false
    },
    {
      name: "David Mensah", // Front Desk
      email: "g.basera5@gmail.com",
      phone: "+233 24 456 7890",
      department: "Front Desk",
      title: "Front Desk Manager",
      is_primary: false
    },
    {
      name: "Jennifer Boateng", // Maintenance
      email: "gizzy@dreampathdigitalsolutions.co.uk",
      phone: "+233 24 567 8901",
      department: "Maintenance",
      title: "Maintenance Manager",
      is_primary: false
    }
  ]
};

// Mock feedback data for Dreampath Resort
const mockFeedbackData = [
  {
    guest_name: "Emma Thompson",
    guest_email: "emma.thompson@email.com",
    room_number: "301",
    rating: 5,
    feedback_text: "Absolutely stunning resort! The spa treatments were incredible and the staff went above and beyond. The infinity pool overlooking the ocean was breathtaking. Will definitely return!",
    issue_category: "General Experience",
    would_recommend: true,
    source: "qr_code"
  },
  {
    guest_name: "James Rodriguez",
    guest_email: "james.r@email.com",
    room_number: "205",
    rating: 4,
    feedback_text: "Beautiful resort with excellent amenities. The breakfast buffet was outstanding. Only minor issue was the WiFi in our room was a bit slow, but overall fantastic stay.",
    issue_category: "Facilities",
    would_recommend: true,
    source: "web_form"
  },
  {
    guest_name: "Sophie Chen",
    guest_email: "sophie.chen@email.com",
    room_number: "412",
    rating: 2,
    feedback_text: "The resort is beautiful but we had several issues. Our room wasn't ready at check-in time, and when we finally got in, the air conditioning wasn't working properly. Maintenance took hours to fix it.",
    issue_category: "Room Cleanliness",
    would_recommend: false,
    source: "qr_code"
  },
  {
    guest_name: "Michael Johnson",
    guest_email: "m.johnson@email.com",
    room_number: "156",
    rating: 5,
    feedback_text: "Perfect honeymoon destination! The romantic dinner on the beach was magical. Staff remembered our anniversary and surprised us with champagne and flowers. Exceptional service!",
    issue_category: "Food & Beverage",
    would_recommend: true,
    source: "qr_code"
  },
  {
    guest_name: "Lisa Anderson",
    guest_email: "lisa.a@email.com",
    room_number: "278",
    rating: 3,
    feedback_text: "Nice resort but the restaurant service was quite slow. We waited 45 minutes for our appetizers. The food quality was good when it finally arrived, but the wait times need improvement.",
    issue_category: "Food & Beverage",
    would_recommend: true,
    source: "web_form"
  },
  {
    guest_name: "David Wilson",
    guest_email: "david.wilson@email.com",
    room_number: "189",
    rating: 1,
    feedback_text: "Very disappointed with our stay. The room had a strong musty smell, the bathroom had mold in the shower, and we found hair in the bed sheets. This is unacceptable for a luxury resort.",
    issue_category: "Room Cleanliness",
    would_recommend: false,
    source: "qr_code"
  },
  {
    guest_name: "Rachel Green",
    guest_email: "rachel.green@email.com",
    room_number: "334",
    rating: 4,
    feedback_text: "Lovely resort with great facilities. The kids club was fantastic and kept our children entertained all day. The pool area is beautiful. Only complaint is the beach bar ran out of several drinks.",
    issue_category: "Facilities",
    would_recommend: true,
    source: "qr_code"
  },
  {
    guest_name: "Tom Baker",
    guest_email: "tom.baker@email.com",
    room_number: "445",
    rating: 5,
    feedback_text: "Outstanding resort! The concierge team helped us plan amazing excursions. The spa was world-class and the sunset views from our balcony were incredible. Perfect vacation!",
    issue_category: "General Experience",
    would_recommend: true,
    source: "web_form"
  }
];

// Mock external reviews for Dreampath Resort
const mockExternalReviews = [
  {
    platform: "Google",
    author_name: "Jennifer Martinez",
    review_rating: 5,
    review_text: "Dreampath Luxury Resort exceeded all expectations! The attention to detail is remarkable. From the moment we arrived, we felt like VIPs. The infinity pool, spa services, and beachfront dining were all exceptional. Highly recommend!",
    review_date: "2024-01-15",
    sentiment: "positive",
    response_required: false
  },
  {
    platform: "TripAdvisor",
    author_name: "Mark Stevens",
    review_rating: 2,
    review_text: "Beautiful location but poor service. Check-in took over an hour, our room wasn't cleaned properly, and the restaurant staff seemed overwhelmed. For the price we paid, we expected much better service standards.",
    review_date: "2024-01-12",
    sentiment: "negative",
    response_required: true
  },
  {
    platform: "Booking.com",
    author_name: "Anna Kowalski",
    review_rating: 4,
    review_text: "Lovely resort with stunning ocean views. The breakfast buffet was impressive and the spa treatments were relaxing. Minor issues with WiFi connectivity in some areas, but overall a great experience.",
    review_date: "2024-01-10",
    sentiment: "positive",
    response_required: false
  },
  {
    platform: "Google",
    author_name: "Robert Taylor",
    review_rating: 1,
    review_text: "Worst vacation ever! The room had a leak that flooded the bathroom, the air conditioning was broken for 2 days, and when we complained, the staff was rude and unhelpful. Completely ruined our anniversary trip.",
    review_date: "2024-01-08",
    sentiment: "negative",
    response_required: true
  },
  {
    platform: "Expedia",
    author_name: "Sarah Williams",
    review_rating: 5,
    review_text: "Absolutely perfect! This resort is a hidden gem. The staff went above and beyond to make our stay special. The sunset dinners on the beach were romantic and the spa was incredibly relaxing. Can't wait to return!",
    review_date: "2024-01-05",
    sentiment: "positive",
    response_required: false
  }
];

async function createDreampathTenant() {
  console.log('🚀 Step 1: Creating Dreampath Luxury Resort tenant...');
  
  try {
    const startTime = Date.now();
    
    // Create the tenant using our automated system
    const { data, error } = await supabase.functions.invoke('tenant-onboarding', {
      body: dreamPathTenantData
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    if (error) {
      console.error('❌ Tenant creation failed:', error);
      return null;
    }
    
    if (data.success) {
      console.log(`✅ Dreampath tenant created successfully in ${duration} seconds!`);
      console.log('📊 Tenant Details:', {
        id: data.tenant.id,
        slug: data.tenant.slug,
        dashboard_url: data.tenant.dashboard_url,
        feedback_url: data.tenant.feedback_url,
        setup_score: data.setup_validation?.score
      });
      
      return data.tenant;
    } else {
      console.error('❌ Tenant creation failed:', data.error);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error creating tenant:', error);
    return null;
  }
}

async function populateMockFeedback(tenantSlug) {
  console.log('📝 Step 2: Adding mock feedback data...');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const feedback of mockFeedbackData) {
    try {
      const feedbackId = await submitFeedbackWithTenant(tenantSlug, {
        guestName: feedback.guest_name,
        guestEmail: feedback.guest_email,
        roomNumber: feedback.room_number,
        rating: feedback.rating,
        feedbackText: feedback.feedback_text,
        issueCategory: feedback.issue_category,
        wouldRecommend: feedback.would_recommend,
        source: feedback.source
      });
      
      console.log(`✅ Added feedback from ${feedback.guest_name} (${feedback.rating}⭐)`);
      successCount++;
      
      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`❌ Failed to add feedback from ${feedback.guest_name}:`, error);
      failCount++;
    }
  }
  
  console.log(`📊 Feedback Summary: ${successCount} added, ${failCount} failed`);
  return { successCount, failCount };
}

async function populateExternalReviews(tenantId) {
  console.log('🌐 Step 3: Adding mock external reviews...');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const review of mockExternalReviews) {
    try {
      const { error } = await supabase
        .from('external_reviews')
        .insert({
          tenant_id: tenantId,
          place_name: "Dreampath Luxury Resort",
          provider: review.platform,
          author_name: review.author_name,
          review_rating: review.review_rating,
          review_text: review.review_text,
          review_date: review.review_date,
          sentiment: review.sentiment,
          response_required: review.response_required,
          review_url: `https://${review.platform.toLowerCase()}.com/reviews/dreampath-luxury-resort`,
          review_preview: review.review_text.substring(0, 100) + '...'
        });
      
      if (error) throw error;
      
      console.log(`✅ Added ${review.platform} review from ${review.author_name} (${review.review_rating}⭐)`);
      successCount++;
      
    } catch (error) {
      console.error(`❌ Failed to add review from ${review.author_name}:`, error);
      failCount++;
    }
  }
  
  console.log(`📊 External Reviews Summary: ${successCount} added, ${failCount} failed`);
  return { successCount, failCount };
}

async function generateSampleQRCodes(tenantSlug) {
  console.log('📱 Step 4: Generating sample QR codes...');
  
  const locations = [
    { type: 'room', identifier: '301' },
    { type: 'room', identifier: '205' },
    { type: 'room', identifier: '412' },
    { type: 'area', identifier: 'Spa' },
    { type: 'area', identifier: 'Pool Bar' },
    { type: 'area', identifier: 'Beach Restaurant' },
    { type: 'area', identifier: 'Lobby' },
    { type: 'area', identifier: 'Fitness Center' }
  ];
  
  const qrCodes = [];
  
  for (const location of locations) {
    try {
      const { data, error } = await supabase.rpc('generate_tenant_qr_data', {
        p_tenant_slug: tenantSlug,
        p_room_number: location.type === 'room' ? location.identifier : null,
        p_area: location.type === 'area' ? location.identifier : null
      });
      
      if (error) throw error;
      
      qrCodes.push({
        type: location.type,
        identifier: location.identifier,
        url: data.qr_url,
        image_url: data.qr_image_url
      });
      
      console.log(`✅ Generated QR for ${location.type}: ${location.identifier}`);
      
    } catch (error) {
      console.error(`❌ Failed to generate QR for ${location.identifier}:`, error);
    }
  }
  
  console.log(`📱 Generated ${qrCodes.length} QR codes`);
  return qrCodes;
}

async function runCompleteDreampathSetup() {
  console.log('🏨 Creating Complete Dreampath Luxury Resort Demo...\n');
  
  const setupResults = {
    start_time: new Date().toISOString(),
    tenant: null,
    feedback_stats: null,
    review_stats: null,
    qr_codes: null,
    success: false
  };
  
  try {
    // Step 1: Create tenant
    const tenant = await createDreampathTenant();
    if (!tenant) {
      console.log('❌ Setup failed at tenant creation');
      return setupResults;
    }
    setupResults.tenant = tenant;
    
    // Step 2: Add mock feedback
    const feedbackStats = await populateMockFeedback(tenant.slug);
    setupResults.feedback_stats = feedbackStats;
    
    // Step 3: Add external reviews
    const reviewStats = await populateExternalReviews(tenant.id);
    setupResults.review_stats = reviewStats;
    
    // Step 4: Generate QR codes
    const qrCodes = await generateSampleQRCodes(tenant.slug);
    setupResults.qr_codes = qrCodes;
    
    setupResults.end_time = new Date().toISOString();
    setupResults.success = true;
    
    console.log('\n🎉 Dreampath Luxury Resort Setup Complete!');
    console.log('📊 Final Results:', {
      tenant_created: !!setupResults.tenant,
      feedback_added: setupResults.feedback_stats?.successCount || 0,
      reviews_added: setupResults.review_stats?.successCount || 0,
      qr_codes_generated: setupResults.qr_codes?.length || 0
    });
    
    console.log('\n🔗 Access URLs:');
    console.log(`Dashboard: ${tenant.dashboard_url}`);
    console.log(`Feedback Form: ${tenant.feedback_url}`);
    
    console.log('\n📧 Manager Emails Configured:');
    dreamPathTenantData.managers.forEach(manager => {
      console.log(`- ${manager.name} (${manager.department}): ${manager.email}`);
    });
    
    return setupResults;
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    setupResults.error = error.message;
    return setupResults;
  }
}

// Make function available globally
window.createDreampath = runCompleteDreampathSetup;

console.log('\n🚀 Ready to create Dreampath Luxury Resort!');
console.log('Run: createDreampath()');
console.log('\nThis will create a complete second tenant with:');
console.log('- All your personal emails as managers');
console.log('- 8 mock feedback submissions');
console.log('- 5 external reviews from different platforms');
console.log('- 8 sample QR codes for rooms and areas');
console.log('- Complete SLA and email routing setup');
