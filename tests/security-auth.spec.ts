import { test, expect } from '@playwright/test'

test.describe('Security Audit: Authentication', () => {
    test('protected dashboard route requires a session cookie', async ({ page, context }) => {
        await context.clearCookies()

        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

        await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/)
    })

    test('forgot-password is not redirected behind auth middleware', async ({ page, context }) => {
        await context.clearCookies()

        await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' })

        await expect(page).toHaveURL(/\/forgot-password$/)
        await expect(page.getByRole('heading', { name: 'Forgotten Password?' })).toBeVisible()
    })

    test('announcements page stays public', async ({ page, context }) => {
        await context.clearCookies()

        await page.goto('/announcements', { waitUntil: 'domcontentloaded' })

        await expect(page).toHaveURL(/\/announcements$/)
        await expect(page.getByRole('heading', { name: 'Announcements' })).toBeVisible()
    })
})
