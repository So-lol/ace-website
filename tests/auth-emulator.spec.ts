import { test, expect, APIRequestContext, Page } from '@playwright/test'

const PROJECT_ID = 'demo-ace-website'
const AUTH_EMULATOR_URL = 'http://127.0.0.1:9099'
const FIRESTORE_EMULATOR_URL = 'http://127.0.0.1:8080'

type OobCode = {
    email?: string
    newEmail?: string
    oobCode: string
    oobLink?: string
    requestType?: string
}

async function clearEmulators(request: APIRequestContext) {
    await request.delete(`${AUTH_EMULATOR_URL}/emulator/v1/projects/${PROJECT_ID}/accounts`)
    await request.delete(
        `${FIRESTORE_EMULATOR_URL}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`
    )
}

async function getOobCodes(request: APIRequestContext) {
    const response = await request.get(`${AUTH_EMULATOR_URL}/emulator/v1/projects/${PROJECT_ID}/oobCodes`)
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    return (body.oobCodes || []) as OobCode[]
}

async function waitForOobCode(
    request: APIRequestContext,
    predicate: (code: OobCode) => boolean,
    description: string
) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
        const codes = await getOobCodes(request)
        const match = [...codes].reverse().find(predicate)
        if (match) return match
        await new Promise((resolve) => setTimeout(resolve, 500))
    }

    throw new Error(`Timed out waiting for ${description}`)
}

async function applyOobCode(request: APIRequestContext, code: OobCode) {
    expect(code.oobLink).toBeTruthy()
    const response = await request.get(code.oobLink!)
    expect(response.ok()).toBeTruthy()
}

async function signUp(page: Page, email: string, password: string, name: string) {
    await page.goto('/signup', { waitUntil: 'domcontentloaded' })
    await page.locator('input[name="name"]').fill(name)
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="password"]').fill(password)
    await page.locator('input[name="confirmPassword"]').fill(password)
    await page.waitForTimeout(2000)
    await page.getByRole('button', { name: 'Create Account' }).click()
    await expect(page).toHaveURL(/\/verify-email/)
}

async function login(page: Page, email: string, password: string) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    if (page.url().includes('/dashboard')) {
        return
    }

    try {
        await page.waitForURL(/\/dashboard/, { timeout: 3_000 })
        return
    } catch {
        // No existing app session; proceed with interactive login.
    }

    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="password"]').fill(password)
    await page.waitForTimeout(1000)
    await page.getByRole('main').getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/)
}

async function logout(page: Page) {
    await page.getByRole('button', { name: /Emulator/ }).click()
    await page.getByRole('menuitem', { name: 'Sign Out' }).click()
    await expect(page).toHaveURL(/\/login/)
}

function sessionCookieFor(value: string) {
    return {
        name: 'firebase-session',
        value,
        domain: '127.0.0.1',
        path: '/',
        httpOnly: true,
        sameSite: 'Strict' as const,
        secure: false,
    }
}

test.describe.serial('Firebase emulator account flows', () => {
    test.beforeEach(async ({ request }) => {
        await clearEmulators(request)
    })

    test('signup, verify email, login, persistence, logout, and stale-cookie rejection', async ({ page, request, context }) => {
        const email = `signup-${Date.now()}@example.com`
        const password = 'Password123!'
        const name = 'Emulator Signup'

        await signUp(page, email, password, name)

        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
        await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/)

        const verificationCode = await waitForOobCode(
            request,
            (code) => code.email === email && code.requestType === 'VERIFY_EMAIL',
            'email verification code'
        )
        await applyOobCode(request, verificationCode)

        await login(page, email, password)
        await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible()

        const cookies = await context.cookies()
        const sessionCookie = cookies.find((cookie) => cookie.name === 'firebase-session')
        expect(sessionCookie?.value).toBeTruthy()

        await page.reload({ waitUntil: 'domcontentloaded' })
        await expect(page).toHaveURL(/\/dashboard/)

        await logout(page)

        await context.clearCookies()
        await context.addCookies([sessionCookieFor(sessionCookie!.value)])

        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
        await expect(page).toHaveURL(/\/login/)
    })

    test('password reset completion works end to end', async ({ page, request, browser }) => {
        const email = `reset-${Date.now()}@example.com`
        const password = 'Password123!'
        const newPassword = 'Password456!'

        await signUp(page, email, password, 'Emulator Reset')
        const verificationCode = await waitForOobCode(
            request,
            (code) => code.email === email && code.requestType === 'VERIFY_EMAIL',
            'email verification code'
        )
        await applyOobCode(request, verificationCode)

        const freshContext = await browser.newContext()
        const freshPage = await freshContext.newPage()

        try {
            await freshPage.goto('/forgot-password', { waitUntil: 'domcontentloaded' })
            await freshPage.locator('input[name="email"]').fill(email)
            await freshPage.waitForTimeout(1000)
            await freshPage.getByRole('button', { name: 'Send Reset Link' }).click()
            await expect(freshPage.getByRole('heading', { name: 'Email Sent!' })).toBeVisible()

            const resetCode = await waitForOobCode(
                request,
                (code) => code.email === email && code.requestType === 'PASSWORD_RESET',
                'password reset code'
            )

            await freshPage.goto(`/forgot-password?oobCode=${encodeURIComponent(resetCode.oobCode)}`, {
                waitUntil: 'domcontentloaded',
            })
            await freshPage.locator('input[name="password"]').fill(newPassword)
            await freshPage.locator('input[name="confirmPassword"]').fill(newPassword)
            await freshPage.waitForTimeout(1000)
            await freshPage.getByRole('button', { name: 'Update Password' }).click()
            await expect(freshPage).toHaveURL(/\/login/, { timeout: 10_000 })

            await login(freshPage, email, newPassword)
            await expect(freshPage.getByRole('heading', { name: /Welcome back/i })).toBeVisible()
        } finally {
            await freshContext.close()
        }
    })

    test('authenticated password change and email change require reauth and complete successfully', async ({ page, request, browser }) => {
        const email = `profile-${Date.now()}@example.com`
        const nextEmail = `profile-updated-${Date.now()}@example.com`
        const password = 'Password123!'
        const updatedPassword = 'Password789!'

        await signUp(page, email, password, 'Emulator Profile')
        const verificationCode = await waitForOobCode(
            request,
            (code) => code.email === email && code.requestType === 'VERIFY_EMAIL',
            'email verification code'
        )
        await applyOobCode(request, verificationCode)

        const freshContext = await browser.newContext()
        const freshPage = await freshContext.newPage()

        try {
            await login(freshPage, email, password)

            await freshPage.goto('/profile', { waitUntil: 'domcontentloaded' })
            await freshPage.locator('input[name="passwordCurrentPassword"]').fill(password)
            await freshPage.locator('input[name="newPassword"]').fill(updatedPassword)
            await freshPage.locator('input[name="confirmPassword"]').fill(updatedPassword)
            await freshPage.waitForTimeout(1000)
            await freshPage.getByRole('button', { name: 'Update Password' }).click()
            await expect(freshPage).toHaveURL(/\/login/, { timeout: 10_000 })

            await login(freshPage, email, updatedPassword)
            await freshPage.goto('/profile', { waitUntil: 'domcontentloaded' })
            await freshPage.locator('input[name="newEmail"]').fill(nextEmail)
            await freshPage.locator('input[name="emailCurrentPassword"]').fill(updatedPassword)
            await freshPage.waitForTimeout(1000)
            await freshPage.getByRole('button', { name: 'Send Email Change Verification' }).click()

            const emailChangeCode = await waitForOobCode(
                request,
                (code) => code.newEmail === nextEmail || (code.email === nextEmail && code.requestType === 'VERIFY_AND_CHANGE_EMAIL'),
                'email change verification code'
            )
            await applyOobCode(request, emailChangeCode)

            await logout(freshPage)
            await login(freshPage, nextEmail, updatedPassword)
            await expect(freshPage.getByRole('heading', { name: /Welcome back/i })).toBeVisible()
        } finally {
            await freshContext.close()
        }
    })
})
