import { test, expect } from '@playwright/test'

const TENANT_SLUG = 'eusbett'

// Minimal smoke test: login, open access requests page, ensure elements render
// Assumes local preview (vite preview) or deployed Netlify URL via BASE_URL
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080'

test('admin can open Access Requests page', async ({ page }) => {
  await page.goto(`${BASE_URL}/${TENANT_SLUG}/auth`)

  // Fill credentials from env to avoid committing secrets
  const email = process.env.E2E_ADMIN_EMAIL || 'g.basera@yahoo.com'
  const password = process.env.E2E_ADMIN_PASSWORD || 'test123'

  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()

  await page.waitForURL(new RegExp(`${BASE_URL}/${TENANT_SLUG}/dashboard`))

  await page.goto(`${BASE_URL}/${TENANT_SLUG}/access-requests`)
  await expect(page.getByRole('heading', { name: /Access Requests/i })).toBeVisible()
})

