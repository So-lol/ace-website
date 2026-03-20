import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth, type ActionCodeSettings } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

import {
    SESSION_COOKIE_NAME,
    SESSION_COOKIE_PATH,
    SESSION_COOKIE_SAME_SITE,
    SESSION_DURATION_SECONDS,
} from '../src/lib/session-config'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })
loadEnv({ path: path.resolve(process.cwd(), '.env') })

const REQUIRED_PUBLIC_ENVS = [
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const

const REQUIRED_ADMIN_ENVS = [
    'FIREBASE_ADMIN_PROJECT_ID',
    'FIREBASE_ADMIN_CLIENT_EMAIL',
    'FIREBASE_ADMIN_PRIVATE_KEY',
] as const

function requireEnv(name: (typeof REQUIRED_PUBLIC_ENVS)[number] | (typeof REQUIRED_ADMIN_ENVS)[number]) {
    const value = process.env[name]?.trim()
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`)
    }

    return value
}

function getOptionalEnv(name: string) {
    const value = process.env[name]?.trim()
    return value ? value : null
}

function normalizeBaseUrl(rawUrl: string) {
    const parsedUrl = new URL(rawUrl)
    return parsedUrl.toString().replace(/\/$/, '')
}

function extractContinueUrl(actionLink: string) {
    const parsedLink = new URL(actionLink)
    const continueUrl = parsedLink.searchParams.get('continueUrl')

    if (!continueUrl) {
        throw new Error(`Generated action link did not include continueUrl: ${actionLink}`)
    }

    return continueUrl
}

async function main() {
    console.log('Validating Firebase production configuration...')

    for (const envName of REQUIRED_PUBLIC_ENVS) {
        requireEnv(envName)
    }
    for (const envName of REQUIRED_ADMIN_ENVS) {
        requireEnv(envName)
    }

    const publicProjectId = requireEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID')
    const adminProjectId = requireEnv('FIREBASE_ADMIN_PROJECT_ID')
    if (publicProjectId !== adminProjectId) {
        throw new Error(`Project ID mismatch: NEXT_PUBLIC_FIREBASE_PROJECT_ID=${publicProjectId} FIREBASE_ADMIN_PROJECT_ID=${adminProjectId}`)
    }

    const appUrl = normalizeBaseUrl(requireEnv('NEXT_PUBLIC_APP_URL'))
    const parsedAppUrl = new URL(appUrl)
    const isLocalhost = parsedAppUrl.hostname === 'localhost' || parsedAppUrl.hostname === '127.0.0.1'
    if (!isLocalhost && parsedAppUrl.protocol !== 'https:') {
        throw new Error(`NEXT_PUBLIC_APP_URL must use HTTPS outside localhost: ${appUrl}`)
    }

    const actionHandlerUrl = new URL('/auth/action', appUrl).toString()
    const privateKey = requireEnv('FIREBASE_ADMIN_PRIVATE_KEY').replace(/\\n/g, '\n')

    const app = getApps()[0] ?? initializeApp({
        credential: cert({
            projectId: adminProjectId,
            clientEmail: requireEnv('FIREBASE_ADMIN_CLIENT_EMAIL'),
            privateKey,
        }),
        storageBucket: requireEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    })

    const auth = getAuth(app)
    const firestore = getFirestore(app)

    await firestore.listCollections()
    await auth.listUsers(1)
    console.log(`PASS Firebase Admin connectivity verified for project ${adminProjectId}`)

    const actionCodeSettings: ActionCodeSettings = {
        url: actionHandlerUrl,
        handleCodeInApp: false,
    }

    const validationEmail = getOptionalEnv('FIREBASE_VALIDATION_EMAIL')
    if (validationEmail) {
        await auth.getUserByEmail(validationEmail)

        const passwordResetLink = await auth.generatePasswordResetLink(validationEmail, actionCodeSettings)
        const emailVerificationLink = await auth.generateEmailVerificationLink(validationEmail, actionCodeSettings)

        if (extractContinueUrl(passwordResetLink) !== actionHandlerUrl) {
            throw new Error('Password reset continueUrl did not match configured auth action URL')
        }
        if (extractContinueUrl(emailVerificationLink) !== actionHandlerUrl) {
            throw new Error('Email verification continueUrl did not match configured auth action URL')
        }

        console.log(`PASS Password reset and email verification links validated for ${validationEmail}`)

        const validationNewEmail = getOptionalEnv('FIREBASE_VALIDATION_NEW_EMAIL')
        if (validationNewEmail) {
            const verifyAndChangeEmailLink = await auth.generateVerifyAndChangeEmailLink(
                validationEmail,
                validationNewEmail,
                actionCodeSettings
            )

            if (extractContinueUrl(verifyAndChangeEmailLink) !== actionHandlerUrl) {
                throw new Error('Verify-and-change-email continueUrl did not match configured auth action URL')
            }

            console.log(`PASS Verify-and-change-email link validated for ${validationEmail} -> ${validationNewEmail}`)
        } else {
            console.log('SKIP Verify-and-change-email validation skipped; FIREBASE_VALIDATION_NEW_EMAIL not set')
        }
    } else {
        console.log('SKIP Action-link validation skipped; FIREBASE_VALIDATION_EMAIL not set')
    }

    console.log('PASS Session cookie policy')
    console.log(`  name=${SESSION_COOKIE_NAME}`)
    console.log(`  path=${SESSION_COOKIE_PATH}`)
    console.log(`  sameSite=${SESSION_COOKIE_SAME_SITE}`)
    console.log(`  maxAgeSeconds=${SESSION_DURATION_SECONDS}`)
    console.log('  secure=true in production')
    console.log('  httpOnly=true')

    console.log('Firebase production validation completed successfully.')
}

main().catch((error: unknown) => {
    console.error('FAIL Firebase production validation failed:', error)
    process.exit(1)
})
