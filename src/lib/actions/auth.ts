'use server'

import { cookies, headers } from 'next/headers'
import { verifyIdToken, adminAuth, adminDb, createSessionCookie, getUserByEmail, verifySessionCookie } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { UserDoc } from '@/types/firestore'
import { checkRateLimit } from '@/lib/rate-limit'
import { normalizeEmail } from '@/lib/auth-utils'
import { recordAuthEvent } from '@/lib/auth-observability'
import { serializeAuthError } from '@/lib/auth-observability-utils'
import { verifyCanonicalIdToken } from '@/lib/server-auth'
import {
    SESSION_COOKIE_NAME,
    SESSION_COOKIE_PATH,
    SESSION_COOKIE_SAME_SITE,
    SESSION_DURATION_MS,
    SESSION_DURATION_SECONDS,
} from '@/lib/session-config'

// Types
type AuthResult = {
    success: boolean
    error?: string
    redirectTo?: string
    needsClientAuth?: boolean
    user?: {
        id: string
        email: string
        name: string
        role: string
        familyId?: string | null
        avatarUrl?: string | null
    }
}

type PasswordResetPreparationResult = {
    success: boolean
    shouldSendEmail: boolean
    error?: string
}

async function findUserDocByEmail(email: string) {
    const normalizedEmail = normalizeEmail(email)
    const snapshot = await adminDb.collection('users').where('email', '==', normalizedEmail).limit(1).get()

    if (snapshot.empty) return null

    return snapshot.docs[0]
}

async function migrateUserReferences(oldUserId: string, newUserId: string) {
    if (oldUserId === newUserId) return

    const [familiesByMember, familiesByHead, familiesByAuntUncle, mentorPairings, menteePairings] = await Promise.all([
        adminDb.collection('families').where('memberIds', 'array-contains', oldUserId).get(),
        adminDb.collection('families').where('familyHeadIds', 'array-contains', oldUserId).get(),
        adminDb.collection('families').where('auntUncleIds', 'array-contains', oldUserId).get(),
        adminDb.collection('pairings').where('mentorId', '==', oldUserId).get(),
        adminDb.collection('pairings').where('menteeIds', 'array-contains', oldUserId).get(),
    ])

    const updates: Promise<unknown>[] = []
    const updatedFamilyIds = new Set<string>()
    const updatedPairingIds = new Set<string>()

    for (const familyDoc of [...familiesByMember.docs, ...familiesByHead.docs, ...familiesByAuntUncle.docs]) {
        if (updatedFamilyIds.has(familyDoc.id)) continue
        updatedFamilyIds.add(familyDoc.id)

        const familyData = familyDoc.data()
        const replaceIds = (ids?: string[]) => ids?.map((id) => (id === oldUserId ? newUserId : id))

        updates.push(
            familyDoc.ref.update({
                memberIds: replaceIds(familyData.memberIds) || [],
                familyHeadIds: replaceIds(familyData.familyHeadIds),
                auntUncleIds: replaceIds(familyData.auntUncleIds),
                updatedAt: Timestamp.now(),
            })
        )
    }

    for (const pairingDoc of [...mentorPairings.docs, ...menteePairings.docs]) {
        if (updatedPairingIds.has(pairingDoc.id)) continue
        updatedPairingIds.add(pairingDoc.id)

        const pairingData = pairingDoc.data()
        updates.push(
            pairingDoc.ref.update({
                mentorId: pairingData.mentorId === oldUserId ? newUserId : pairingData.mentorId,
                menteeIds: (pairingData.menteeIds || []).map((id: string) => (id === oldUserId ? newUserId : id)),
                updatedAt: Timestamp.now(),
            })
        )
    }

    if (updates.length > 0) {
        await Promise.all(updates)
    }
}

async function ensureUserDocForUid(params: {
    uid: string
    email: string
    name?: string | null
    avatarUrl?: string | null
}) {
    const normalizedEmail = normalizeEmail(params.email)
    const userRef = adminDb.collection('users').doc(params.uid)
    const userSnap = await userRef.get()

    if (userSnap.exists) {
        const currentData = userSnap.data() as UserDoc
        const nextData: Partial<UserDoc> = {}

        if (currentData.email !== normalizedEmail) nextData.email = normalizedEmail
        if ((!currentData.name || currentData.name === 'Unknown') && params.name) nextData.name = params.name
        if ((!currentData.avatarUrl || currentData.avatarUrl !== params.avatarUrl) && params.avatarUrl !== undefined) {
            nextData.avatarUrl = params.avatarUrl
        }

        if (Object.keys(nextData).length > 0) {
            nextData.updatedAt = Timestamp.now()
            await userRef.update(nextData)
        }

        return { id: userSnap.id, ...currentData, ...nextData } as UserDoc & { id: string }
    }

    const emailMatch = await findUserDocByEmail(normalizedEmail)

    if (emailMatch && emailMatch.id !== params.uid) {
        const existingData = emailMatch.data() as UserDoc

        await migrateUserReferences(emailMatch.id, params.uid)
        await userRef.set({
            ...existingData,
            uid: params.uid,
            email: normalizedEmail,
            name: existingData.name || params.name || 'Unknown',
            avatarUrl: existingData.avatarUrl ?? params.avatarUrl ?? null,
            updatedAt: Timestamp.now(),
        })
        await emailMatch.ref.delete()

        return { id: params.uid, ...existingData, uid: params.uid, email: normalizedEmail } as UserDoc & { id: string }
    }

    const userData: UserDoc = {
        uid: params.uid,
        email: normalizedEmail,
        name: params.name || 'Unknown',
        role: 'MENTEE',
        familyId: null,
        avatarUrl: params.avatarUrl ?? null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    }
    await userRef.set(userData)

    return { id: params.uid, ...userData }
}

/**
 * Called by client after successful Firebase login to sync session
 */
export async function verifyAndSyncUser(idToken: string): Promise<AuthResult> {
    try {
        const headerList = await headers()
        const ip = headerList.get('x-forwarded-for')?.split(',')[0] || 'unknown'

        // 0. Verify the ID token first. We only rate-limit invalid token spam,
        // not successful session syncs, because the client may legitimately
        // trigger several syncs during login, refresh, and credential changes.
        const { user: firebaseUser, error } = await verifyCanonicalIdToken(idToken)

        if (error || !firebaseUser) {
            const authError = serializeAuthError(error)
            const { success } = await checkRateLimit(`auth_sync_invalid:${ip}`, 10, 60)
            if (!success) {
                await recordAuthEvent({
                    type: 'session_sync_failure',
                    surface: 'server',
                    route: '/login',
                    errorCode: 'rate-limit/auth-sync-invalid',
                    errorMessage: 'Rate limit exceeded for invalid session sync attempts.',
                })
                return { success: false, error: 'Too many authentication attempts. Please try again in a minute.' }
            }

            await recordAuthEvent({
                type: 'session_sync_failure',
                surface: 'server',
                route: '/login',
                uid: firebaseUser?.uid ?? null,
                email: firebaseUser?.email ?? null,
                errorCode: authError.errorCode,
                errorMessage: authError.errorMessage || 'Invalid authentication token during session sync.',
            })
            return { success: false, error: 'Invalid authentication token' }
        }

        if (firebaseUser.disabled) {
            await recordAuthEvent({
                type: 'session_sync_failure',
                surface: 'server',
                route: '/login',
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                errorCode: 'auth/user-disabled',
                errorMessage: 'Disabled user attempted to establish a server session.',
            })
            return { success: false, error: 'This account has been disabled.' }
        }

        // Enforce email verification against the canonical Auth record, not token claims.
        if (!firebaseUser.emailVerified) {
            await recordAuthEvent({
                type: 'session_sync_failure',
                surface: 'server',
                route: '/login',
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                errorCode: 'auth/email-not-verified',
                errorMessage: 'User attempted to establish a server session without a verified email.',
            })
            return { success: false, error: 'Please verify your email address first.' }
        }

        // 2. Check if user exists in Firestore
        const userData = await ensureUserDocForUid({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.name,
            avatarUrl: firebaseUser.picture || null,
        })

        // 3. Create Session Cookie (5 days)
        const expiresIn = SESSION_DURATION_MS
        const { sessionCookie, error: cookieError } = await createSessionCookie(idToken, expiresIn)

        if (cookieError || !sessionCookie) {
            console.error('Failed to create session cookie:', cookieError)
            const authError = serializeAuthError(cookieError)
            await recordAuthEvent({
                type: 'session_sync_failure',
                surface: 'server',
                route: '/login',
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                errorCode: authError.errorCode,
                errorMessage: authError.errorMessage || 'Failed to create a Firebase session cookie.',
            })
            return { success: false, error: 'Failed to create session' }
        }

        const cookieStore = await cookies()

        cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
            name: SESSION_COOKIE_NAME,
            value: sessionCookie,
            httpOnly: true,
            // Security: Mandatory Secure flag in production. 
            // In local dev, this requires HTTPS (e.g., via mkcert) to be true.
            secure: process.env.NODE_ENV === 'production',
            path: SESSION_COOKIE_PATH,
            maxAge: SESSION_DURATION_SECONDS,
            // Security: Upgrade from 'lax' to 'strict' for ruthless CSRF protection.
            sameSite: SESSION_COOKIE_SAME_SITE,
        })

        // Return user data
        const plainUser = JSON.parse(JSON.stringify(userData))

        return { success: true, redirectTo: '/dashboard', user: plainUser }

    } catch (error) {
        console.error('Verify user error:', error)
        const authError = serializeAuthError(error)
        await recordAuthEvent({
            type: 'session_sync_failure',
            surface: 'server',
            route: '/login',
            errorCode: authError.errorCode,
            errorMessage: authError.errorMessage || 'Unexpected error during server session sync.',
        })
        return { success: false, error: 'Authentication failed' }
    }
}

/**
 * Create user profile in Firestore during signup.
 * Called after Firebase Auth user is created so the Firestore doc exists
 * before the user's first sign-in.
 */
export async function createUserProfile(idToken: string, name: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { user: firebaseUser, error } = await verifyIdToken(idToken)

        if (error || !firebaseUser) {
            return { success: false, error: 'Invalid authentication token' }
        }

        const userRef = adminDb.collection('users').doc(firebaseUser.uid)
        const userSnap = await userRef.get()

        if (!userSnap.exists) {
            const userData: UserDoc = {
                uid: firebaseUser.uid,
                email: normalizeEmail(firebaseUser.email || ''),
                name: name || firebaseUser.name || 'Unknown',
                role: 'MENTEE',
                familyId: null,
                avatarUrl: firebaseUser.picture || null,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            }
            await userRef.set(userData)
        }

        return { success: true }
    } catch (error) {
        console.error('Create user profile error:', error)
        return { success: false, error: 'Failed to create user profile' }
    }
}

export async function preparePasswordReset(email: string): Promise<PasswordResetPreparationResult> {
    try {
        const normalizedEmail = normalizeEmail(email)
        const headerList = await headers()
        const ip = headerList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

        if (!normalizedEmail) {
            await recordAuthEvent({
                type: 'password_reset_request_failure',
                surface: 'server',
                route: '/forgot-password',
                errorCode: 'validation/missing-email',
                errorMessage: 'Password reset requested without an email address.',
            })
            return { success: false, shouldSendEmail: false, error: 'Email is required' }
        }

        const { success } = await checkRateLimit(`password_reset:${ip}:${normalizedEmail}`, 5, 60 * 15)
        if (!success) {
            await recordAuthEvent({
                type: 'password_reset_request_failure',
                surface: 'server',
                route: '/forgot-password',
                email: normalizedEmail,
                errorCode: 'rate-limit/password-reset',
                errorMessage: 'Password reset rate limit exceeded.',
            })
            return { success: false, shouldSendEmail: false, error: 'Too many reset attempts. Please try again later.' }
        }

        const existingAuthUser = await getUserByEmail(normalizedEmail)
        if (existingAuthUser) {
            return { success: true, shouldSendEmail: true }
        }

        const userDoc = await findUserDocByEmail(normalizedEmail)
        if (!userDoc) {
            // Generic response to avoid account enumeration.
            return { success: true, shouldSendEmail: false }
        }

        const userData = userDoc.data() as UserDoc
        const authUser = await adminAuth.createUser({
            email: normalizedEmail,
            displayName: userData.name || undefined,
            // The reset flow proves mailbox access, but we still require a
            // separate Firebase email verification before server-side sessions
            // are granted.
            emailVerified: false,
        })

        await ensureUserDocForUid({
            uid: authUser.uid,
            email: normalizedEmail,
            name: userData.name,
            avatarUrl: userData.avatarUrl ?? null,
        })

        return { success: true, shouldSendEmail: true }
    } catch (error) {
        console.error('Prepare password reset error:', error)
        const authError = serializeAuthError(error)
        await recordAuthEvent({
            type: 'password_reset_request_failure',
            surface: 'server',
            route: '/forgot-password',
            email,
            errorCode: authError.errorCode,
            errorMessage: authError.errorMessage || 'Failed to prepare password reset flow.',
        })
        return { success: false, shouldSendEmail: false, error: 'Failed to prepare account for password reset' }
    }
}

export async function signOut() {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('firebase-session')?.value ?? null

    if (sessionCookie) {
        const { user: firebaseUser } = await verifySessionCookie(sessionCookie)
        if (firebaseUser?.uid) {
            try {
                await adminAuth.revokeRefreshTokens(firebaseUser.uid)
            } catch (error) {
                console.error('Failed to revoke refresh tokens during sign-out:', error)
                const authError = serializeAuthError(error)
                await recordAuthEvent({
                    type: 'logout_failure',
                    surface: 'server',
                    route: '/logout',
                    uid: firebaseUser.uid,
                    email: firebaseUser.email || null,
                    errorCode: authError.errorCode,
                    errorMessage: authError.errorMessage || 'Failed to revoke refresh tokens during sign-out.',
                })
            }
        }
    }

    cookieStore.delete('firebase-session')
    return { success: true, redirectTo: '/login' }
}
