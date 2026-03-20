import 'server-only'

import { adminAuth, verifyIdToken, verifySessionCookie } from '@/lib/firebase-admin'

export type CanonicalFirebaseUser = {
    uid: string
    email: string | null
    name: string | null
    picture: string | null
    emailVerified: boolean
    disabled: boolean
}

async function getCanonicalFirebaseUser(uid: string) {
    try {
        const userRecord = await adminAuth.getUser(uid)

        return {
            user: {
                uid: userRecord.uid,
                email: userRecord.email ?? null,
                name: userRecord.displayName ?? null,
                picture: userRecord.photoURL ?? null,
                emailVerified: userRecord.emailVerified,
                disabled: userRecord.disabled,
            } satisfies CanonicalFirebaseUser,
            error: null,
        }
    } catch (error) {
        return { user: null, error }
    }
}

export async function verifyCanonicalIdToken(idToken: string) {
    const { user: decodedToken, error } = await verifyIdToken(idToken)
    if (error || !decodedToken) {
        return { user: null, error: error ?? new Error('Invalid authentication token') }
    }

    return getCanonicalFirebaseUser(decodedToken.uid)
}

export async function verifyCanonicalSessionCookie(sessionCookie: string) {
    const { user: decodedClaims, error } = await verifySessionCookie(sessionCookie)
    if (error || !decodedClaims) {
        return { user: null, error: error ?? new Error('Invalid session cookie') }
    }

    return getCanonicalFirebaseUser(decodedClaims.uid)
}
