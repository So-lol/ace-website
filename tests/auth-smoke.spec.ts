import { test, expect } from '@playwright/test'

const smokeEmail = process.env.SMOKE_TEST_EMAIL
const smokePassword = process.env.SMOKE_TEST_PASSWORD

test.describe('Production auth smoke test', () => {
    test.skip(!smokeEmail || !smokePassword, 'Set SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD to run smoke auth checks.')

    test('public routes, protected redirect, login, session use, and logout', async ({ page, context }) => {
        await context.clearCookies()

        await page.goto('/announcements', { waitUntil: 'domcontentloaded' })
        await expect(page.getByRole('heading', { name: 'Announcements' })).toBeVisible()

        await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' })
        await expect(page.getByRole('heading', { name: 'Forgotten Password?' })).toBeVisible()

        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
        await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/)

        await page.locator('input[name="email"]').fill(smokeEmail!)
        await page.locator('input[name="password"]').fill(smokePassword!)
        await page.getByRole('main').getByRole('button', { name: 'Sign In' }).click()

        await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })
        await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible()

        await page.goto('/profile', { waitUntil: 'domcontentloaded' })
        await expect(page.getByRole('heading', { name: 'Change Email' })).toBeVisible()

        const sessionCookie = (await context.cookies()).find((cookie) => cookie.name === 'firebase-session')
        expect(sessionCookie?.value).toBeTruthy()

        await page.reload({ waitUntil: 'domcontentloaded' })
        await expect(page).toHaveURL(/\/profile/)

        await page.locator('header').getByRole('button').last().click()
        await page.getByRole('menuitem', { name: 'Sign Out' }).click()

        await expect(page).toHaveURL(/\/login/, { timeout: 20_000 })

        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
        await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/)
    })
})
