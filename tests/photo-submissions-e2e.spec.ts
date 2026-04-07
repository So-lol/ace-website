import path from 'path'
import fs from 'fs'
import { test, expect, APIRequestContext, Page } from '@playwright/test'
import { getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const PROJECT_ID = 'demo-ace-website'
const AUTH_EMULATOR_URL = 'http://127.0.0.1:9099'
const FIRESTORE_EMULATOR_URL = 'http://127.0.0.1:8080'
const FIXTURE_IMAGE = path.resolve(process.cwd(), 'tests/fixtures/test-upload.png')
const FIXTURE_IMAGE_BUFFER = fs.readFileSync(FIXTURE_IMAGE)
const LARGE_IPHONE_STYLE_UPLOAD = {
    name: 'IMG_4096.HEIC',
    mimeType: 'image/heic',
    // Intentionally invalid image bytes so browser-side normalization falls back to the original file.
    buffer: Buffer.alloc(2 * 1024 * 1024, 7),
}
const IPHONE_STYLE_UPLOAD = {
    name: 'IMG_2048.HEIC',
    mimeType: 'image/heic',
    buffer: FIXTURE_IMAGE_BUFFER,
}

process.env.GCLOUD_PROJECT = PROJECT_ID
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'

const adminApp = getApps()[0] ?? initializeApp({
    projectId: PROJECT_ID,
    storageBucket: `${PROJECT_ID}.appspot.com`,
})
const adminDb = getFirestore(adminApp)

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

async function createVerifiedAuthUser(
    request: APIRequestContext,
    email: string,
    password: string,
    displayName: string
) {
    const signUpResponse = await request.post(
        `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
        {
            data: {
                email,
                password,
                returnSecureToken: true,
            },
        }
    )

    expect(signUpResponse.ok()).toBeTruthy()
    const signUpBody = await signUpResponse.json()

    const updateResponse = await request.post(
        `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:update?key=fake-api-key`,
        {
            data: {
                idToken: signUpBody.idToken,
                displayName,
                returnSecureToken: true,
            },
        }
    )

    expect(updateResponse.ok()).toBeTruthy()

    const sendOobResponse = await request.post(
        `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=fake-api-key`,
        {
            data: {
                requestType: 'VERIFY_EMAIL',
                idToken: signUpBody.idToken,
            },
        }
    )

    expect(sendOobResponse.ok()).toBeTruthy()

    const verificationCode = await waitForOobCode(
        request,
        (code) => code.email === email && code.requestType === 'VERIFY_EMAIL',
        `email verification code for ${email}`
    )
    await applyOobCode(request, verificationCode)

    return {
        uid: String(signUpBody.localId),
        email,
        password,
        displayName,
    }
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
        await new Promise((resolve) => setTimeout(resolve, 250))
    }

    throw new Error(`Timed out waiting for ${description}`)
}

async function applyOobCode(request: APIRequestContext, code: OobCode) {
    expect(code.oobLink).toBeTruthy()
    const response = await request.get(code.oobLink!)
    expect(response.ok()).toBeTruthy()
}

async function seedDoc(
    collection: string,
    docId: string,
    data: Record<string, unknown>
) {
    await adminDb.collection(collection).doc(docId).set(data)
}

async function getDoc(collection: string, docId: string) {
    const snapshot = await adminDb.collection(collection).doc(docId).get()
    expect(snapshot.exists).toBeTruthy()
    return snapshot.data() as Record<string, unknown>
}

async function login(page: import('@playwright/test').Page, email: string, password: string) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="password"]').fill(password)
    await page.waitForTimeout(1000)
    await page.getByRole('main').getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
}

async function selectBonusActivity(page: Page, bonusName: string) {
    const bonusCard = page.locator('[data-testid^="bonus-option-"]').filter({ hasText: bonusName }).first()

    for (let attempt = 0; attempt < 3; attempt += 1) {
        await bonusCard.click()
        const isPressed = await bonusCard.getAttribute('aria-pressed')
        if (isPressed === 'true') {
            return
        }
        await page.waitForTimeout(250)
    }

    await expect(bonusCard).toHaveAttribute('aria-pressed', 'true')
}

async function seedPhotoSubmissionFixture(request: APIRequestContext) {
    const now = Timestamp.fromDate(new Date('2026-03-20T21:47:41Z'))
    const admin = await createVerifiedAuthUser(request, 'admin-photo@example.com', 'Password123!', 'Admin Photo')
    const mentor = await createVerifiedAuthUser(request, 'mentor-photo@example.com', 'Password123!', 'Mentor Photo')
    const familyHead = await createVerifiedAuthUser(request, 'family-head-photo@example.com', 'Password123!', 'Family Head Photo')

    const menteeUid = 'mentee-seeded'
    const familyId = 'family-photo'
    const pairingId = 'pairing-photo'
    const bonusId = 'bonus-photo'

    await seedDoc('users', admin.uid, {
        uid: admin.uid,
        email: admin.email,
        name: admin.displayName,
        role: 'ADMIN',
        familyId: null,
        avatarUrl: null,
        createdAt: now,
        updatedAt: now,
    })

    await seedDoc('users', mentor.uid, {
        uid: mentor.uid,
        email: mentor.email,
        name: mentor.displayName,
        role: 'MENTOR',
        familyId,
        avatarUrl: null,
        createdAt: now,
        updatedAt: now,
    })

    await seedDoc('users', menteeUid, {
        uid: menteeUid,
        email: 'mentee-photo@example.com',
        name: 'Mentee Photo',
        role: 'MENTEE',
        familyId,
        avatarUrl: null,
        createdAt: now,
        updatedAt: now,
    })

    await seedDoc('users', familyHead.uid, {
        uid: familyHead.uid,
        email: familyHead.email,
        name: familyHead.displayName,
        role: 'MENTEE',
        familyId,
        avatarUrl: null,
        createdAt: now,
        updatedAt: now,
    })

    await seedDoc('families', familyId, {
        name: 'Photo Family',
        isArchived: false,
        memberIds: [mentor.uid, menteeUid, familyHead.uid],
        familyHeadIds: [familyHead.uid],
        weeklyPoints: 0,
        totalPoints: 0,
        createdAt: now,
        updatedAt: now,
    })

    await seedDoc('pairings', pairingId, {
        familyId,
        mentorId: mentor.uid,
        menteeIds: [menteeUid],
        weeklyPoints: 0,
        totalPoints: 0,
        createdAt: now,
        updatedAt: now,
    })

    await seedDoc('bonusActivities', bonusId, {
        name: 'Coffee Date',
        description: 'Grab coffee together.',
        points: 5,
        category: 'ACTIVITY',
        isActive: true,
        createdAt: now,
        updatedAt: now,
    })

    return {
        admin,
        mentor,
        familyHead,
        familyId,
        pairingId,
        bonusId,
    }
}

test.describe.serial('photo submissions e2e audit', () => {
    test.beforeEach(async ({ request }) => {
        await clearEmulators(request)
    })

    test('participant can upload multiple photos in the same week', async ({ page, request }) => {
        const { mentor, bonusId } = await seedPhotoSubmissionFixture(request)

        await login(page, mentor.email, mentor.password)
        await page.goto('/dashboard/submit', { waitUntil: 'domcontentloaded' })

        await expect(page.getByRole('heading', { name: 'Submit Weekly Photo' })).toBeVisible()
        await page.locator('[data-testid="submission-file-input"]').setInputFiles(FIXTURE_IMAGE)
        await expect(page.getByRole('button', { name: 'Submit Photo' })).toBeEnabled()
        await selectBonusActivity(page, 'Coffee Date')
        await page.getByRole('button', { name: 'Submit Photo' }).click()

        await expect(page).toHaveURL(/\/dashboard\/submissions/, { timeout: 20_000 })
        await expect(page.getByRole('heading', { name: /Week \d+/ })).toBeVisible()
        await expect(page.getByText('Pending Review')).toBeVisible()

        await page.goto('/dashboard/submit', { waitUntil: 'domcontentloaded' })
        await expect(page.getByRole('heading', { name: 'Submit Weekly Photo' })).toBeVisible()
        await page.locator('[data-testid="submission-file-input"]').setInputFiles([
            {
                name: 'test-upload-second.png',
                mimeType: 'image/png',
                buffer: FIXTURE_IMAGE_BUFFER,
            }
        ])
        await expect(page.getByRole('button', { name: 'Submit Photo' })).toBeEnabled()
        await page.getByRole('button', { name: 'Submit Photo' }).click()
        await expect(page).toHaveURL(/\/dashboard\/submissions/, { timeout: 20_000 })

        const submissionsSnapshot = await adminDb.collection('submissions').get()
        expect(submissionsSnapshot.docs).toHaveLength(2)

        const submissions = submissionsSnapshot.docs.map((doc) => doc.data())
        expect(submissions.every((submission) => submission.submitterId === mentor.uid)).toBeTruthy()
        expect(submissions.every((submission) => submission.status === 'PENDING')).toBeTruthy()
        expect(submissions.some((submission) => submission.totalPoints === 5)).toBeTruthy()
        expect(submissions.some((submission) => submission.totalPoints === 0)).toBeTruthy()
        expect(submissions.some((submission) => submission.bonusActivityIds?.[0] === bonusId)).toBeTruthy()
    })

    test('participant can upload an iPhone-style photo file', async ({ page, request }) => {
        const { mentor } = await seedPhotoSubmissionFixture(request)

        await login(page, mentor.email, mentor.password)
        await page.goto('/dashboard/submit', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(500)

        await expect(page.getByRole('heading', { name: 'Submit Weekly Photo' })).toBeVisible()
        await page.locator('[data-testid="submission-file-input"]').setInputFiles([IPHONE_STYLE_UPLOAD])
        await expect(page.getByRole('button', { name: 'Submit Photo' })).toBeEnabled()
        await page.getByRole('button', { name: 'Submit Photo' }).click()

        await expect(page).toHaveURL(/\/dashboard\/submissions/, { timeout: 20_000 })
        await expect(page.getByText('Pending Review')).toBeVisible()

        const submissionsSnapshot = await adminDb.collection('submissions').get()
        expect(submissionsSnapshot.docs).toHaveLength(1)

        const submission = submissionsSnapshot.docs[0].data()
        expect(submission.submitterId).toBe(mentor.uid)
        expect(submission.status).toBe('PENDING')
        expect(submission.uploadState).toBe('UPLOADED')
        expect(String(submission.imagePath)).toMatch(/\.(heic|heif|webp)$/i)
    })

    test('participant can upload a large iPhone-style photo file', async ({ page, request }) => {
        const { mentor } = await seedPhotoSubmissionFixture(request)

        await login(page, mentor.email, mentor.password)
        await page.goto('/dashboard/submit', { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(500)

        await expect(page.getByRole('heading', { name: 'Submit Weekly Photo' })).toBeVisible()
        await page.locator('[data-testid="submission-file-input"]').setInputFiles([LARGE_IPHONE_STYLE_UPLOAD])
        await expect(page.getByRole('button', { name: 'Submit Photo' })).toBeEnabled()
        await page.getByRole('button', { name: 'Submit Photo' }).click()

        await expect(page).toHaveURL(/\/dashboard\/submissions/, { timeout: 20_000 })
        await expect(page.getByText('Pending Review')).toBeVisible()

        const submissionsSnapshot = await adminDb.collection('submissions').get()
        expect(submissionsSnapshot.docs).toHaveLength(1)

        const submission = submissionsSnapshot.docs[0].data()
        expect(submission.submitterId).toBe(mentor.uid)
        expect(submission.status).toBe('PENDING')
        expect(submission.uploadState).toBe('UPLOADED')
        expect(String(submission.imagePath)).toMatch(/\.(heic|heif|webp)$/i)
    })

    test('admin can review the submission, media is visible, and points propagate to pairing and family', async ({ browser, request }) => {
        const { admin, mentor, pairingId, familyId } = await seedPhotoSubmissionFixture(request)

        const participantContext = await browser.newContext()
        const adminContext = await browser.newContext()
        const participantPage = await participantContext.newPage()
        const adminPage = await adminContext.newPage()

        try {
            await login(participantPage, mentor.email, mentor.password)
            await participantPage.goto('/dashboard/submit', { waitUntil: 'domcontentloaded' })
            await participantPage.locator('[data-testid="submission-file-input"]').setInputFiles(FIXTURE_IMAGE)
            await expect(participantPage.getByRole('button', { name: 'Submit Photo' })).toBeEnabled()
            await selectBonusActivity(participantPage, 'Coffee Date')
            await participantPage.getByRole('button', { name: 'Submit Photo' }).click()
            await expect(participantPage).toHaveURL(/\/dashboard\/submissions/, { timeout: 20_000 })

            await login(adminPage, admin.email, admin.password)
            await adminPage.goto('/admin/submissions', { waitUntil: 'domcontentloaded' })
            await expect(adminPage.getByRole('heading', { name: 'Review Submissions' })).toBeVisible()
            await expect(adminPage.getByText('Photo Family')).toBeVisible()
            await adminPage.getByRole('button', { name: 'Approve' }).click()
            await adminPage.reload({ waitUntil: 'domcontentloaded' })
            await adminPage.getByRole('tab', { name: /Approved \(1\)/ }).click()
            await expect(adminPage.getByText('+5 pts')).toBeVisible()

            await adminPage.goto('/admin/media', { waitUntil: 'domcontentloaded' })
            await expect(adminPage.getByRole('heading', { name: 'Media Management' })).toBeVisible()
            await expect(adminPage.getByText('Mentor Photo')).toBeVisible()
            await expect(adminPage.getByText('Approved')).toBeVisible()

            await participantPage.reload({ waitUntil: 'domcontentloaded' })
            await expect(participantPage.getByText(/^Approved$/).first()).toBeVisible()
            await expect(participantPage.getByText('+5 pts')).toBeVisible()

            const pairing = await getDoc('pairings', pairingId)
            const family = await getDoc('families', familyId)

            expect(pairing.totalPoints).toBe(5)
            expect(pairing.weeklyPoints).toBe(5)
            expect(family.totalPoints).toBe(5)
            expect(family.weeklyPoints).toBe(5)
        } finally {
            await participantContext.close()
            await adminContext.close()
        }
    })

    test('admin can approve all pending submissions and users can see both photos were approved', async ({ browser, request }) => {
        const { admin, mentor, pairingId, familyId } = await seedPhotoSubmissionFixture(request)

        const participantContext = await browser.newContext()
        const adminContext = await browser.newContext()
        const participantPage = await participantContext.newPage()
        const adminPage = await adminContext.newPage()

        try {
            await login(participantPage, mentor.email, mentor.password)
            await participantPage.goto('/dashboard/submit', { waitUntil: 'domcontentloaded' })
            await participantPage.locator('[data-testid="submission-file-input"]').setInputFiles(FIXTURE_IMAGE)
            await expect(participantPage.getByRole('button', { name: 'Submit Photo' })).toBeEnabled()
            await selectBonusActivity(participantPage, 'Coffee Date')
            await participantPage.getByRole('button', { name: 'Submit Photo' }).click()
            await expect(participantPage).toHaveURL(/\/dashboard\/submissions/, { timeout: 20_000 })

            await participantPage.goto('/dashboard/submit', { waitUntil: 'domcontentloaded' })
            await participantPage.locator('[data-testid="submission-file-input"]').setInputFiles([
                {
                    name: 'test-upload-second.png',
                    mimeType: 'image/png',
                    buffer: FIXTURE_IMAGE_BUFFER,
                }
            ])
            await expect(participantPage.getByRole('button', { name: 'Submit Photo' })).toBeEnabled()
            await participantPage.getByRole('button', { name: 'Submit Photo' }).click()
            await expect(participantPage).toHaveURL(/\/dashboard\/submissions/, { timeout: 20_000 })
            await expect(participantPage.getByText('Pending Review')).toHaveCount(2)

            await login(adminPage, admin.email, admin.password)
            await adminPage.goto('/admin/submissions', { waitUntil: 'domcontentloaded' })
            await expect(adminPage.getByRole('heading', { name: 'Review Submissions' })).toBeVisible()
            await adminPage.getByRole('button', { name: /Approve All Pending \(2\)/ }).click()

            await expect.poll(async () => {
                const submissionsSnapshot = await adminDb.collection('submissions').get()
                return submissionsSnapshot.docs.filter((doc) => doc.data().status === 'APPROVED').length
            }, { timeout: 20_000 }).toBe(2)

            await adminPage.reload({ waitUntil: 'domcontentloaded' })
            await expect(adminPage.getByRole('tab', { name: /Pending \(0\)/ })).toBeVisible()
            await expect(adminPage.getByRole('tab', { name: /Approved \(2\)/ })).toBeVisible()
            await expect(adminPage.getByRole('button', { name: /Approve All Pending \(0\)/ })).toBeDisabled()

            await participantPage.reload({ waitUntil: 'domcontentloaded' })
            await expect(participantPage.getByText('This photo submission is approved and included in your points total.')).toHaveCount(2)
            await expect(participantPage.getByText('+5 pts')).toBeVisible()
            await expect(participantPage.getByText('+0 pts')).toBeVisible()

            const submissionsSnapshot = await adminDb.collection('submissions').get()
            expect(submissionsSnapshot.docs).toHaveLength(2)
            expect(submissionsSnapshot.docs.every((doc) => doc.data().status === 'APPROVED')).toBeTruthy()

            const pairing = await getDoc('pairings', pairingId)
            const family = await getDoc('families', familyId)

            expect(pairing.totalPoints).toBe(5)
            expect(pairing.weeklyPoints).toBe(5)
            expect(family.totalPoints).toBe(5)
            expect(family.weeklyPoints).toBe(5)
        } finally {
            await participantContext.close().catch(() => {})
            await adminContext.close().catch(() => {})
        }
    })

    test('family head can submit a photo and approval credits the family without touching pairing points', async ({ browser, request }) => {
        const { admin, familyHead, pairingId, familyId } = await seedPhotoSubmissionFixture(request)

        const familyHeadContext = await browser.newContext()
        const adminContext = await browser.newContext()
        const familyHeadPage = await familyHeadContext.newPage()
        const adminPage = await adminContext.newPage()

        try {
            await login(familyHeadPage, familyHead.email, familyHead.password)
            await familyHeadPage.goto('/dashboard/submit', { waitUntil: 'domcontentloaded' })
            await familyHeadPage.waitForTimeout(1000)
            await familyHeadPage.locator('[data-testid="submission-file-input"]').setInputFiles([
                {
                    name: 'family-head-upload.png',
                    mimeType: 'image/png',
                    buffer: FIXTURE_IMAGE_BUFFER,
                }
            ])
            await familyHeadPage.waitForTimeout(500)
            await expect(familyHeadPage.getByRole('button', { name: 'Submit Photo' })).toBeEnabled()
            await familyHeadPage.getByRole('button', { name: 'Submit Photo' }).click()
            await expect(familyHeadPage).toHaveURL(/\/dashboard\/submissions/, { timeout: 20_000 })

            const submissionsSnapshot = await adminDb.collection('submissions').get()
            expect(submissionsSnapshot.docs).toHaveLength(1)
            expect(submissionsSnapshot.docs[0].data().pairingId).toBeUndefined()
            expect(submissionsSnapshot.docs[0].data().familyId).toBe(familyId)

            await login(adminPage, admin.email, admin.password)
            await adminPage.goto('/admin/submissions', { waitUntil: 'domcontentloaded' })
            await expect(adminPage.getByText('Family Head Photo')).toBeVisible()
            await adminPage.getByRole('button', { name: 'Approve' }).click()
            await expect(adminPage.getByText('Pending (0)')).toBeVisible()

            const pairing = await getDoc('pairings', pairingId)
            const family = await getDoc('families', familyId)

            expect(pairing.totalPoints).toBe(0)
            expect(pairing.weeklyPoints).toBe(0)
            expect(family.totalPoints).toBe(0)
            expect(family.weeklyPoints).toBe(0)
        } finally {
            await familyHeadContext.close()
            await adminContext.close()
        }
    })
})
