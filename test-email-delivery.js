#!/usr/bin/env node

// Direct test of GM reports email delivery
// This script will send all 3 reports immediately to g.basera@yahoo.com

const https = require('https');

const SUPABASE_URL = 'https://wzfpltamwhkncxjvulik.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6ZnBsdGFtd2hrbmN4anZ1bGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0NzI4NzQsImV4cCI6MjA1MTA0ODg3NH0.Hs8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

async function sendGMReport(reportType) {
  console.log(`🚀 Sending ${reportType} report...`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-gm-reports`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        report_type: reportType,
        tenant_id: '27843a9a-b53f-482a-87ba-1a3e52f55dc1',
        recipient_emails: ['g.basera@yahoo.com'],
        cc_emails: ['gizzy@guest-glow.com']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ ${reportType} report sent successfully!`);
    console.log(`   Email ID: ${result.email_id}`);
    console.log(`   Recipients: ${result.recipients?.join(', ')}`);
    console.log(`   Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    
    return result;
    
  } catch (error) {
    console.error(`❌ Error sending ${reportType} report:`, error.message);
    throw error;
  }
}

async function sendAllReports() {
  console.log('🎯 GM REPORTS IMMEDIATE DELIVERY TEST');
  console.log('📧 Recipient: g.basera@yahoo.com');
  console.log('📧 CC: gizzy@guest-glow.com');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('');

  const reports = ['daily', 'weekly', 'urgent'];
  const results = [];

  for (const reportType of reports) {
    try {
      const result = await sendGMReport(reportType);
      results.push({ reportType, success: true, result });
      
      // Wait 2 seconds between emails to avoid rate limiting
      if (reportType !== 'urgent') {
        console.log('⏳ Waiting 2 seconds...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      results.push({ reportType, success: false, error: error.message });
    }
  }

  console.log('\n🎊 DELIVERY SUMMARY:');
  console.log('==================');
  
  results.forEach(({ reportType, success, result, error }) => {
    if (success) {
      console.log(`✅ ${reportType.toUpperCase()}: Sent (ID: ${result.email_id})`);
    } else {
      console.log(`❌ ${reportType.toUpperCase()}: Failed - ${error}`);
    }
  });

  const successCount = results.filter(r => r.success).length;
  console.log(`\n📊 Success Rate: ${successCount}/${results.length} reports sent`);
  
  if (successCount > 0) {
    console.log('\n📧 CHECK YOUR EMAIL: g.basera@yahoo.com');
    console.log('📧 Also check spam/junk folder if not in inbox');
    console.log('⏰ Emails should arrive within 2-3 minutes');
  }

  return results;
}

// Run the test
if (require.main === module) {
  sendAllReports()
    .then(() => {
      console.log('\n🚀 Test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { sendGMReport, sendAllReports };
