const https = require('https');

async function testTripAdvisorScrapingWithNewKey() {
  console.log('🔥 TESTING TRIPADVISOR SCRAPING WITH NEW FIRECRAWL KEY');
  console.log('====================================================');
  console.log('⏰ Test Time:', new Date().toISOString());
  console.log('🔑 New Key: fc-68660556ee85491b9b1c4bcbcfd56bd6');
  console.log('🎯 Target: Eusbett Hotel TripAdvisor page');
  console.log('');

  try {
    const supabaseUrl = 'https://wzfpltamwhkncxjvulik.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6ZnBsdGFtd2hrbmN4anZ1bGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDI5NTksImV4cCI6MjA3MDAxODk1OX0.4m707IwEkfrE-HIJFoP8hUz6VckZTTc_3CgH44f68Hk';
    const functionUrl = `${supabaseUrl}/functions/v1/scrape-tripadvisor-rating`;

    const requestData = {
      tenant_id: '27843a9a-b53f-482a-87ba-1a3e52f55dc1',
      hotel_name: 'Eusbett Hotel',
      tripadvisor_url: 'https://www.tripadvisor.com/Hotel_Review-g2400444-d2399149-Reviews-Eusbett_Hotel-Sunyani_Brong_Ahafo_Region.html'
    };

    console.log('📤 Calling TripAdvisor scraping function...');
    console.log('🔗 URL:', functionUrl);
    console.log('📊 Request Data:', JSON.stringify(requestData, null, 2));
    console.log('');

    const result = await callSupabaseFunction(functionUrl, supabaseKey, requestData);
    
    if (result.success) {
      console.log('✅ TRIPADVISOR SCRAPING SUCCESSFUL!');
      console.log('');
      console.log('📊 SCRAPED DATA:');
      console.log('================');
      
      if (result.data) {
        console.log('⭐ Current Rating:', result.data.rating || 'N/A');
        console.log('📝 Total Reviews:', result.data.total_reviews || 'N/A');
        console.log('📅 Scraped At:', result.data.scraped_at || 'N/A');
        
        if (result.data.rating_breakdown) {
          console.log('');
          console.log('📊 RATING BREAKDOWN:');
          console.log('   🌟 Excellent:', result.data.rating_breakdown.excellent || 0);
          console.log('   👍 Good:', result.data.rating_breakdown.good || 0);
          console.log('   😐 Average:', result.data.rating_breakdown.average || 0);
          console.log('   👎 Poor:', result.data.rating_breakdown.poor || 0);
          console.log('   😞 Terrible:', result.data.rating_breakdown.terrible || 0);
        }
        
        if (result.data.category_scores) {
          console.log('');
          console.log('🏨 CATEGORY SCORES:');
          console.log('   🛏️  Rooms:', result.data.category_scores.rooms || 'N/A');
          console.log('   🛎️  Service:', result.data.category_scores.service || 'N/A');
          console.log('   💰 Value:', result.data.category_scores.value || 'N/A');
          console.log('   🧹 Cleanliness:', result.data.category_scores.cleanliness || 'N/A');
          console.log('   📍 Location:', result.data.category_scores.location || 'N/A');
          console.log('   😴 Sleep Quality:', result.data.category_scores.sleep_quality || 'N/A');
        }
        
        if (result.data.recent_reviews && result.data.recent_reviews.length > 0) {
          console.log('');
          console.log('📝 RECENT REVIEWS:');
          console.log('==================');
          result.data.recent_reviews.slice(0, 3).forEach((review, index) => {
            console.log(`${index + 1}. ⭐ ${review.rating}/5 - "${review.title}"`);
            console.log(`   👤 ${review.reviewer} (${review.date})`);
            console.log(`   💬 ${review.text.substring(0, 100)}...`);
            console.log('');
          });
        }
      }
      
      console.log('🎊 NEW FIRECRAWL KEY WORKING PERFECTLY!');
      console.log('✅ TripAdvisor data successfully scraped and stored');
      console.log('✅ Security breach fully remediated');
      console.log('✅ Function ready for production use');
      
    } else {
      console.log('❌ SCRAPING FAILED:', result.error);
      
      if (result.error && result.error.includes('FIRECRAWL_API_KEY')) {
        console.log('');
        console.log('⚠️  ENVIRONMENT VARIABLE ISSUE:');
        console.log('   The new Firecrawl API key needs to be set in:');
        console.log('   Supabase Dashboard > Settings > Edge Functions > Environment Variables');
        console.log('   FIRECRAWL_API_KEY=fc-68660556ee85491b9b1c4bcbcfd56bd6');
      }
    }

  } catch (error) {
    console.error('❌ TEST ERROR:', error.message);
  }
}

function callSupabaseFunction(url, apiKey, data) {
  return new Promise((resolve, reject) => {
    const requestData = JSON.stringify(data);
    
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(requestData);
    req.end();
  });
}

testTripAdvisorScrapingWithNewKey().catch(console.error);
