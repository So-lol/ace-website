import { test, expect } from '@playwright/test'

test.describe('Authentication Surfaces', () => {
    test('signup page stays usable even when Firebase client env is missing', async ({ page }) => {
        await page.goto('/signup', { waitUntil: 'domcontentloaded' })

        await expect(page.getByRole('heading', { name: 'Join ACE' })).toBeVisible()
        await expect(page.getByText('Application error: a client-side exception has occurred')).toHaveCount(0)

        await page.locator('input[name="name"]').fill('Test User')
        await page.locator('input[name="email"]').fill('test@example.com')
        await page.locator('input[name="password"]').fill('Password123!')
        await page.locator('input[name="confirmPassword"]').fill('WrongPassword123!')

        await page.getByRole('button', { name: 'Create Account' }).click()

        await expect(page).toHaveURL(/\/signup(\?|$)/)
    })

    test('forgot-password route remains publicly accessible', async ({ page }) => {
        await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' })

        await expect(page.getByRole('heading', { name: 'Forgotten Password?' })).toBeVisible()
        await expect(page.locator('input[name="email"]')).toBeVisible()
    })
})
