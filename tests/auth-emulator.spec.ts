import { test, expect, APIRequestContext, Page } from '@playwright/test'
import { getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

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

type ApplicationSettingsInput = {
    isOpen: boolean
    deadlineAt: Date | null
    revealAt: Date | null
}

process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_URL.replace('http://', '')
process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH_EMULATOR_URL.replace('http://', '')

function getAdminDb() {
    if (getApps().length === 0) {
        initializeApp({ projectId: PROJECT_ID })
    }

    return getFirestore()
}

function getAdminAuth() {
    if (getApps().length === 0) {
        initializeApp({ projectId: PROJECT_ID })
    }

    return getAuth()
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

async function setAceApplicationSettings(input: ApplicationSettingsInput) {
    await getAdminDb().collection('appSettings').doc('aceApplications').set({
        isOpen: input.isOpen,
        deadlineAt: input.deadlineAt ? Timestamp.fromDate(input.deadlineAt) : null,
        revealAt: input.revealAt ? Timestamp.fromDate(input.revealAt) : null,
        updatedAt: Timestamp.now(),
    })
}

async function createVerifiedUser(email: string, password: string, name: string, role: 'ADMIN' | 'MENTEE' = 'MENTEE') {
    const user = await getAdminAuth().createUser({
        email,
        password,
        displayName: name,
        emailVerified: true,
    })

    await getAdminDb().collection('users').doc(user.uid).set({
        uid: user.uid,
        email,
        name,
        role,
        familyId: null,
        avatarUrl: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    })

    return user.uid
}

async function signUp(page: Page, email: string, password: string, name: string) {
    await page.goto('/signup', { waitUntil: 'domcontentloaded' })
    await page.locator('input[name="name"]').fill(name)
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="password"]').fill(password)
    await page.locator('input[name="confirmPassword"]').fill(password)
    await page.waitForTimeout(2000)
    await page.getByRole('button', { name: 'Create Account' }).click()

    try {
        await expect(page).toHaveURL(/\/verify-email/, { timeout: 5_000 })
        return
    } catch {
        await page.goto('/verify-email', { waitUntil: 'domcontentloaded' })
        await expect(page.getByRole('heading', { name: 'Verify Your Email' })).toBeVisible()
    }
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

    if (page.url().includes('/dashboard')) {
        return
    }

    try {
        await page.waitForURL(/\/dashboard/, { timeout: 2_000 })
        return
    } catch {
        // Still on login; continue with interactive submit.
    }

    const signInButton = page.getByRole('main').getByRole('button', { name: 'Sign In' })
    await signInButton.click()
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

async function seedApplicationDraft(page: Page, userId: string, email: string) {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.evaluate(
        ({ userId: uid, email: draftEmail }) => {
            const draft = {
                name: 'ACE Test Applicant',
                pronouns: 'they/them',
                email: draftEmail,
                phone: '555-0123',
                instagram: '@ace_test',
                university: 'University of Minnesota - Twin Cities',
                universityOther: '',
                schoolYear: '2nd year',
                majorsMinors: 'Computer Science',
                livesOnCampus: 'Yes',
                livesOnCampusOther: '',
                role: 'EM',
                familyHeadAcknowledged: false,
                familyHeadWhy: '',
                familyHeadHowHelp: '',
                familyHeadExclusions: '',
                familyHeadIdentities: '',
                familyHeadFamilyPrefs: '',
                familyHeadConcerns: '',
                goals: 'Mentorship and community',
                willingMultiple: 'Yes',
                preferredActivities: ['Study', 'Chill/Hangout'],
                preferredActivitiesOther: '',
                familyHeadPreference: 'Organized and welcoming',
                pairingPreferences: 'Someone communicative',
                pairingExclusions: 'No close friends',
                meetFrequency: 'Weekly',
                otherCommitments: 'Work and a student org',
                coreIdentities: 'First-gen, Vietnamese',
                hobbies: 'Cooking and volleyball',
                musicTaste: 'R&B and V-pop',
                perfectDay: 'Brunch, studying, then hanging out',
                dreamVacation: 'Japan for food and culture',
                introExtroScale: 6,
                reachOutStyle: "I'd expect an equal effort both ways.",
                additionalInfo: '',
                availableForReveal: 'Yes',
                finalComments: '',
                selfIntro: 'Hi! I am excited to meet new people through ACE.',
            }

            localStorage.setItem(`ace-application-form:${uid}`, JSON.stringify(draft))
            localStorage.setItem(`ace-application-step:${uid}`, '6')
        },
        { userId, email }
    )
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

    test('admin can update application settings and the apply page reflects them', async ({ page }) => {
        test.slow()

        const email = `admin-apps-${Date.now()}@example.com`
        const password = 'Password123!'

        await createVerifiedUser(email, password, 'Applications Admin', 'ADMIN')
        await login(page, email, password)

        await page.goto('/admin/applications', { waitUntil: 'domcontentloaded' })
        await expect(page.locator('#deadlineAt')).toBeVisible()

        await page.locator('#deadlineAt').fill('2030-02-01T17:00')
        await page.locator('#revealAt').fill('2030-02-08T18:00')
        await page.getByRole('switch').click()
        await page.getByRole('button', { name: 'Save Application Settings' }).click()
        await page.waitForTimeout(1000)

        await page.goto('/apply', { waitUntil: 'domcontentloaded' })
        await expect(page.getByRole('heading', { name: 'Applications are closed' })).toBeVisible()
        await expect(page.getByText(/Latest deadline:/)).toContainText('2030')

        await page.goto('/admin/applications', { waitUntil: 'domcontentloaded' })
        await page.getByRole('switch').click()
        await page.getByRole('button', { name: 'Save Application Settings' }).click()
        await page.waitForTimeout(1000)

        await page.goto('/apply', { waitUntil: 'domcontentloaded' })
        await expect(page.getByRole('heading', { name: /A\.C\.E\. Application/ })).toBeVisible()
        await expect(page.getByText(/Applications close/)).toContainText('2030')
    })

    test('signed-in applicant can submit once and then sees already applied', async ({ page }) => {
        test.slow()

        await setAceApplicationSettings({
            isOpen: true,
            deadlineAt: new Date('2030-02-01T17:00:00.000Z'),
            revealAt: new Date('2030-02-08T18:00:00.000Z'),
        })

        const email = `applicant-${Date.now()}@example.com`
        const password = 'Password123!'

        const userId = await createVerifiedUser(email, password, 'ACE Applicant')
        await login(page, email, password)
        await seedApplicationDraft(page, userId, email)

        await page.goto('/apply', { waitUntil: 'domcontentloaded' })
        await expect(page.getByRole('heading', { name: /Final Questions/i })).toBeVisible()

        await page.getByRole('button', { name: 'Submit Application' }).click()
        await expect(page.getByRole('heading', { name: 'Application Submitted! 🎉' })).toBeVisible()
        await expect(page.getByText(/2030/)).toBeVisible()

        await page.goto('/apply', { waitUntil: 'domcontentloaded' })
        await expect(page.getByRole('heading', { name: "You've already applied" })).toBeVisible()
        await expect(page.getByText(/Reveal details:/)).toContainText('2030')
    })

    test('closing the application window rejects a stale in-progress submit on the server', async ({ page }) => {
        test.slow()

        await setAceApplicationSettings({
            isOpen: true,
            deadlineAt: new Date('2030-02-01T17:00:00.000Z'),
            revealAt: null,
        })

        const email = `stale-submit-${Date.now()}@example.com`
        const password = 'Password123!'

        const userId = await createVerifiedUser(email, password, 'Stale Submit Applicant')
        await login(page, email, password)
        await seedApplicationDraft(page, userId, email)

        await page.goto('/apply', { waitUntil: 'domcontentloaded' })
        await expect(page.getByRole('heading', { name: /Final Questions/i })).toBeVisible()

        await setAceApplicationSettings({
            isOpen: false,
            deadlineAt: new Date('2030-02-01T17:00:00.000Z'),
            revealAt: null,
        })

        await page.getByRole('button', { name: 'Submit Application' }).click()
        await expect(page.getByText('ACE applications are currently closed.')).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Application Submitted! 🎉' })).toHaveCount(0)

        await page.goto('/apply', { waitUntil: 'domcontentloaded' })
        await expect(page.getByRole('heading', { name: 'Applications are closed' })).toBeVisible()
    })
})
