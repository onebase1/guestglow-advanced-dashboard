import { test, expect } from '@playwright/test'

// Use env or default local dev URL
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'

// Eusbett tenant slug assumed to be 'eusbett' per prior threads
const TENANT = 'eusbett'
const EMAIL = 'g.basera@yahoo.com'
const PASSWORD = 'test123'

// Helper: wait for network idle
async function waitForSettled(page: any) {
  await page.waitForLoadState('networkidle')
}

test('tenant login and dashboard renders Reviews and Workflow', async ({ page }) => {
  // Go to tenant auth page directly
  await page.goto(`${BASE_URL}/${TENANT}/auth`)

  // Fill and submit the sign-in form
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign In' }).click()

  // Expect redirect to tenant dashboard
  await page.waitForURL(new RegExp(`/${TENANT}/dashboard`))
  await waitForSettled(page)

  // Verify Reviews tab content exists
  await expect(page.getByText('Recent Internal Reviews')).toBeVisible()
  // Emails icon should exist
  await expect(page.locator('button[title*="View email history"]').first()).toBeVisible()

  // Switch to Workflow tab via bottom nav
  await page.getByRole('button', { name: 'Workflow' }).click()
  await waitForSettled(page)

  // Verify kanban headings exist
  await expect(page.getByText('Internal Review Management')).toBeVisible()
  await expect(page.getByText('New Issues')).toBeVisible()
  await expect(page.getByText('In Progress')).toBeVisible()
  await expect(page.getByText('Resolved')).toBeVisible()
})

