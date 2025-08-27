/*
ORPHANED FILE: test-escalation-system.js
This file appears to be orphaned and no longer used in the current system
Commenting out to prevent accidental execution
TODO: Verify this file is not needed and delete if confirmed

/**
 * 🧪 ESCALATION SYSTEM TEST SCRIPT
 *
 * Quick test to verify the 2-stage escalation system is working
 * Run this in the browser console on any GuestGlow page
 */

console.log('🚨 Starting Escalation System Test...');
*/

// Test configuration
const TEST_CONFIG = {
  tenant_slug: 'eusbett',
  guest_name: 'Test User - Escalation',
  guest_email: 'escalation.test@example.com',
  room_number: '999',
  rating: 1, // Low rating to trigger escalation
  feedback_text: 'Testing escalation system - please ignore this automated test',
  issue_category: 'Service Quality'
};

// Test functions
async function testEscalationSystem() {
  console.log('📝 Step 1: Creating test feedback...');

  try {
    // Create test feedback
    const { data: feedback, error: feedbackError } = await supabase.rpc('insert_feedback_with_tenant', {
      p_tenant_slug: TEST_CONFIG.tenant_slug,
      p_guest_name: TEST_CONFIG.guest_name,
      p_guest_email: TEST_CONFIG.guest_email,
      p_room_number: TEST_CONFIG.room_number,
      p_rating: TEST_CONFIG.rating,
      p_feedback_text: TEST_CONFIG.feedback_text,
      p_issue_category: TEST_CONFIG.issue_category,
      p_would_recommend: false,
      p_source: 'escalation_system_test'
    });

    if (feedbackError) throw feedbackError;

    console.log('✅ Test feedback created with ID:', feedback);

    // Wait a moment then check for initial email
    setTimeout(async () => {
      await checkCommunicationLogs(feedback, 'initial_alert');
    }, 5000); // 5 seconds

    // Check for reminder after 3 minutes (testing mode)
    setTimeout(async () => {
      await checkCommunicationLogs(feedback, 'reminder');
      await triggerSLAMonitor();
    }, 3 * 60 * 1000); // 3 minutes

    // Check for GM escalation after 6 minutes
    setTimeout(async () => {
      await checkCommunicationLogs(feedback, 'gm_escalation');
      await triggerSLAMonitor();
    }, 6 * 60 * 1000); // 6 minutes

    // Check for auto-close after 12 minutes
    setTimeout(async () => {
      await checkAutoClose(feedback);
    }, 12 * 60 * 1000); // 12 minutes

    return feedback;

  } catch (error) {
    console.error('❌ Failed to create test feedback:', error);
    return null;
  }
}

async function checkCommunicationLogs(feedbackId, expectedType) {
  console.log(`🔍 Checking for ${expectedType} communication...`);

  try {
    const { data: logs, error } = await supabase
      .from('communication_logs')
      .select('*')
      .eq('feedback_id', feedbackId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    console.log(`📧 Found ${logs.length} communication logs:`, logs);

    // Check for expected email types
    const hasInitialAlert = logs.some(log => log.email_type === 'manager_alert' && log.recipient_email === 'g.basera@yahoo.com');
    const hasGMEscalation = logs.some(log => log.email_type === 'manager_alert' && log.recipient_email === 'basera@btinternet.com');

    if (expectedType === 'initial_alert' && hasInitialAlert) {
      console.log('✅ Initial alert to Guest Relations confirmed');
    } else if (expectedType === 'gm_escalation' && hasGMEscalation) {
      console.log('✅ GM escalation confirmed');
    } else if (expectedType === 'reminder') {
      console.log('⏰ Reminder should be sent around this time');
    }

  } catch (error) {
    console.error('❌ Failed to check communication logs:', error);
  }
}

async function triggerSLAMonitor() {
  console.log('⚡ Triggering SLA monitor...');

  try {
    const { data, error } = await supabase.functions.invoke('sla-monitor', {
      body: {}
    });

    if (error) throw error;

    console.log('✅ SLA monitor triggered:', data);

  } catch (error) {
    console.error('❌ Failed to trigger SLA monitor:', error);
  }
}

async function checkAutoClose(feedbackId) {
  console.log('🔒 Checking for auto-close...');

  try {
    const { data: feedback, error } = await supabase
      .from('feedback')
      .select('status, resolved_at, resolution_notes')
      .eq('id', feedbackId)
      .single();

    if (error) throw error;

    if (feedback.status === 'auto_closed') {
      console.log('✅ Feedback auto-closed successfully:', feedback);
    } else {
      console.log('⏳ Feedback not yet auto-closed, current status:', feedback.status);
    }

  } catch (error) {
    console.error('❌ Failed to check auto-close status:', error);
  }
}

async function testQRCodeLogging() {
  console.log('🔗 Testing QR code logging...');

  try {
    const { data, error } = await supabase.rpc('log_qr_scan', {
      p_tenant_id: (await supabase.from('tenants').select('id').eq('slug', 'eusbett').single()).data.id,
      p_qr_code_id: 'test_reception_001',
      p_location_name: 'Reception Desk Test',
      p_location_type: 'reception',
      p_user_agent: navigator.userAgent,
      p_ip_address: null,
      p_qr_variant: 'test_variant'
    });

    if (error) throw error;

    console.log('✅ QR scan logged with ID:', data);

  } catch (error) {
    console.error('❌ Failed to log QR scan:', error);
  }
}

async function test5StarConversion() {
  console.log('⭐ Testing 5-star conversion logging...');

  try {
    // Create a 5-star feedback first
    const { data: feedback, error: feedbackError } = await supabase.rpc('insert_feedback_with_tenant', {
      p_tenant_slug: 'eusbett',
      p_guest_name: '5-Star Test User',
      p_guest_email: 'fivestar.test@example.com',
      p_room_number: '555',
      p_rating: 5,
      p_feedback_text: 'Amazing experience! Testing 5-star conversion tracking.',
      p_issue_category: 'General Experience',
      p_would_recommend: true,
      p_source: 'five_star_conversion_test'
    });

    if (feedbackError) throw feedbackError;

    // Log the 5-star conversion
    const { data: conversion, error: conversionError } = await supabase
      .from('five_star_conversion_logs')
      .insert({
        tenant_id: (await supabase.from('tenants').select('id').eq('slug', 'eusbett').single()).data.id,
        feedback_id: feedback,
        session_id: crypto.randomUUID(),
        cta_variant: 'help_travelers',
        cta_text: 'Help other travelers discover our amazing service!',
        button_text: "Yes, I'll help!",
        external_review_decision: 'accepted',
        conversion_successful: true,
        test_group: 'test'
      });

    if (conversionError) throw conversionError;

    console.log('✅ 5-star conversion logged:', conversion);

  } catch (error) {
    console.error('❌ Failed to test 5-star conversion:', error);
  }
}

async function runAllTests() {
  console.log('🎯 Running comprehensive escalation system tests...');

  // Test 1: QR Code Logging
  await testQRCodeLogging();

  // Test 2: 5-Star Conversion
  await test5StarConversion();

  // Test 3: Escalation System (main test)
  const feedbackId = await testEscalationSystem();

  if (feedbackId) {
    console.log('✅ All tests initiated successfully!');
    console.log('⏰ Monitor the console for updates over the next 12 minutes...');
    console.log('📧 Check emails at:');
    console.log('  - g.basera@yahoo.com (Guest Relations)');
    console.log('  - basera@btinternet.com (General Manager)');
    console.log('  - gizzy@guest-glow.com (System monitoring)');
  } else {
    console.log('❌ Test initiation failed');
  }
}

// Make functions available globally
window.escalationTest = {
  runAll: runAllTests,
  testEscalation: testEscalationSystem,
  testQR: testQRCodeLogging,
  test5Star: test5StarConversion,
  triggerSLA: triggerSLAMonitor
};

console.log('🎯 Escalation test functions loaded!');
console.log('Run escalationTest.runAll() to start comprehensive testing');
console.log('Or run individual tests:');
console.log('- escalationTest.testEscalation() - Test escalation flow');
console.log('- escalationTest.testQR() - Test QR logging');
console.log('- escalationTest.test5Star() - Test 5-star conversion');
console.log('- escalationTest.triggerSLA() - Manually trigger SLA monitor');
*/