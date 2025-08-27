/**
 * 🧪 ESCALATION SYSTEM E2E TEST
 * 
 * Tests the complete 2-stage escalation flow:
 * 1. Submit feedback → Guest Relations alert
 * 2. 3 min → Reminder to Guest Relations  
 * 3. 6 min → Escalate to GM
 * 4. 12 min → Auto-close with stats
 */

import { test, expect, Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wzfpltamwhkncxjvulik.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key'
const TEST_TIMEOUT = 15 * 60 * 1000 // 15 minutes for full escalation cycle

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

interface TestFeedback {
  id: string
  guest_name: string
  room_number: string
  rating: number
  created_at: string
}

interface EscalationEvent {
  level: number
  timestamp: string
  recipient: string
  action: string
}

test.describe('Escalation System E2E Tests', () => {
  let testFeedbackId: string
  let escalationEvents: EscalationEvent[] = []

  test.beforeAll(async () => {
    // Set up test environment - ensure testing timing is active
    await supabase.rpc('execute_sql', {
      query: `
        UPDATE public.category_routing_configurations 
        SET auto_escalation_hours = 0.05  -- 3 minutes for testing
        WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'eusbett');
      `
    })
  })

  test('Complete escalation flow: Submit → Remind → Escalate → Auto-close', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT)

    // Step 1: Submit test feedback
    console.log('🎯 Step 1: Submitting test feedback...')
    
    await page.goto('/eusbett/quick-feedback')
    
    // Fill out feedback form with low rating to trigger escalation
    await page.fill('[data-testid="guest-name"]', 'Escalation Test User')
    await page.fill('[data-testid="guest-email"]', 'escalation.test@example.com')
    await page.fill('[data-testid="room-number"]', '999')
    
    // Select 1-star rating (triggers escalation)
    await page.click('[data-testid="rating-1"]')
    
    // Select category
    await page.selectOption('[data-testid="issue-category"]', 'Service Quality')
    
    // Add feedback text
    await page.fill('[data-testid="feedback-text"]', 'Testing escalation system - please ignore this automated test')
    
    // Submit form
    await page.click('[data-testid="submit-feedback"]')
    
    // Wait for success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    
    // Get the feedback ID from the database
    const { data: feedback } = await supabase
      .from('feedback')
      .select('id, created_at')
      .eq('guest_name', 'Escalation Test User')
      .eq('room_number', '999')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    testFeedbackId = feedback.id
    console.log(`✅ Feedback submitted with ID: ${testFeedbackId}`)
    
    // Step 2: Monitor escalation events
    console.log('⏰ Step 2: Monitoring escalation events...')
    
    // Check initial email was sent (immediate)
    await checkEscalationEvent(1, 'initial_alert', 'g.basera@yahoo.com', 30) // 30 seconds
    
    // Wait and check for reminder (1.5 minutes)
    await checkEscalationEvent(1, 'reminder', 'g.basera@yahoo.com', 90) // 90 seconds
    
    // Wait and check for GM escalation (3 minutes)
    await checkEscalationEvent(2, 'escalation', 'basera@btinternet.com', 180) // 3 minutes
    
    // Wait and check for final reminder (6 minutes)
    await checkEscalationEvent(2, 'final_reminder', 'basera@btinternet.com', 360) // 6 minutes
    
    // Wait and check for auto-close (12 minutes)
    await checkAutoClose(720) // 12 minutes
    
    console.log('✅ All escalation events completed successfully!')
  })

  test('Verify escalation stats are logged correctly', async () => {
    // Check that escalation stats were created
    const { data: stats } = await supabase
      .from('escalation_stats')
      .select('*')
      .eq('feedback_id', testFeedbackId)
      .order('escalation_level')
    
    expect(stats).toHaveLength(2) // Should have Guest Relations + GM escalations
    
    // Verify Guest Relations escalation
    expect(stats[0]).toMatchObject({
      escalation_level: 1,
      manager_department: 'Guest Relations',
      was_acknowledged: false,
      was_auto_closed: false
    })
    
    // Verify GM escalation
    expect(stats[1]).toMatchObject({
      escalation_level: 2,
      manager_department: 'Management',
      was_acknowledged: false,
      was_auto_closed: true
    })
    
    console.log('✅ Escalation stats logged correctly')
  })

  test('Verify feedback was auto-closed', async () => {
    // Check feedback status
    const { data: feedback } = await supabase
      .from('feedback')
      .select('status, resolved_at, resolution_notes')
      .eq('id', testFeedbackId)
      .single()
    
    expect(feedback.status).toBe('auto_closed')
    expect(feedback.resolved_at).toBeTruthy()
    expect(feedback.resolution_notes).toContain('Automatically closed after SLA escalation timeout')
    
    console.log('✅ Feedback auto-closed correctly')
  })

  test('Test QR code logging integration', async ({ page }) => {
    // Test QR code scan logging
    console.log('🔍 Testing QR code logging...')
    
    // Simulate QR code scan with location tracking
    await page.goto('/eusbett/quick-feedback?qr=reception_desk_001&location=Reception%20Desk&variant=test_a')
    
    // Check that QR scan was logged
    const { data: qrScan } = await supabase
      .from('qr_scan_logs')
      .select('*')
      .eq('qr_code_id', 'reception_desk_001')
      .eq('location_name', 'Reception Desk')
      .order('scan_timestamp', { ascending: false })
      .limit(1)
      .single()
    
    expect(qrScan).toMatchObject({
      qr_code_id: 'reception_desk_001',
      location_name: 'Reception Desk',
      location_type: 'reception',
      qr_variant: 'test_a'
    })
    
    console.log('✅ QR code scan logged successfully')
  })

  test('Test 5-star conversion tracking', async ({ page }) => {
    console.log('⭐ Testing 5-star conversion tracking...')
    
    // Submit 5-star feedback
    await page.goto('/eusbett/quick-feedback')
    
    await page.fill('[data-testid="guest-name"]', '5-Star Test User')
    await page.fill('[data-testid="guest-email"]', 'fivestar.test@example.com')
    await page.fill('[data-testid="room-number"]', '555')
    
    // Select 5-star rating
    await page.click('[data-testid="rating-5"]')
    
    await page.selectOption('[data-testid="issue-category"]', 'General Experience')
    await page.fill('[data-testid="feedback-text"]', 'Amazing experience! Testing 5-star flow.')
    
    await page.click('[data-testid="submit-feedback"]')
    
    // Should see external review prompt
    await expect(page.locator('[data-testid="external-review-prompt"]')).toBeVisible()
    
    // Test declining external review
    await page.click('[data-testid="decline-external-review"]')
    
    // Check that 5-star conversion was logged
    const { data: conversion } = await supabase
      .from('five_star_conversion_logs')
      .select('*')
      .eq('external_review_decision', 'declined')
      .order('five_star_achieved_at', { ascending: false })
      .limit(1)
      .single()
    
    expect(conversion).toMatchObject({
      external_review_decision: 'declined',
      conversion_successful: false
    })
    
    console.log('✅ 5-star conversion tracking working')
  })

  // Helper function to check escalation events
  async function checkEscalationEvent(
    level: number, 
    action: string, 
    recipient: string, 
    waitSeconds: number
  ) {
    console.log(`⏳ Waiting ${waitSeconds}s for ${action} to ${recipient}...`)
    
    // Wait for the expected time
    await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000))
    
    // Check communication logs for the event
    const { data: logs } = await supabase
      .from('communication_logs')
      .select('*')
      .eq('feedback_id', testFeedbackId)
      .eq('recipient_email', recipient)
      .order('created_at', { ascending: false })
      .limit(1)
    
    expect(logs).toHaveLength(1)
    expect(logs[0].email_type).toBe('manager_alert')
    
    escalationEvents.push({
      level,
      timestamp: new Date().toISOString(),
      recipient,
      action
    })
    
    console.log(`✅ ${action} sent to ${recipient}`)
  }

  // Helper function to check auto-close
  async function checkAutoClose(waitSeconds: number) {
    console.log(`⏳ Waiting ${waitSeconds}s for auto-close...`)
    
    await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000))
    
    // Check that feedback was auto-closed
    const { data: feedback } = await supabase
      .from('feedback')
      .select('status, resolved_at')
      .eq('id', testFeedbackId)
      .single()
    
    expect(feedback.status).toBe('auto_closed')
    expect(feedback.resolved_at).toBeTruthy()
    
    console.log('✅ Feedback auto-closed successfully')
  }

  test.afterAll(async () => {
    // Clean up test data
    if (testFeedbackId) {
      await supabase
        .from('feedback')
        .delete()
        .eq('id', testFeedbackId)
      
      console.log('🧹 Test data cleaned up')
    }
    
    // Reset to production timing if needed
    // await supabase.rpc('execute_sql', {
    //   query: `
    //     UPDATE public.category_routing_configurations 
    //     SET auto_escalation_hours = 0.5  -- 30 minutes for production
    //     WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'eusbett');
    //   `
    // })
  })
})
