import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { adminDb } from '@/lib/firebase-admin'
import { recordAuthEvent } from '@/lib/auth-observability'
import { serializeAuthError } from '@/lib/auth-observability-utils'
import { verifyCanonicalSessionCookie } from '@/lib/server-auth'

// Define User Interface matching Firestore schema
export interface AuthenticatedUser {
    id: string    // Firebase UID
    email: string
    name: string
    role: 'ADMIN' | 'MENTOR' | 'MENTEE'
    familyId?: string
    avatarUrl?: string
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('firebase-session')?.value || null

    if (!sessionCookie) return null

    try {
        // 1. Verify Session/Token
        // Use session cookie verification
        const { user: firebaseAuthUser, error } = await verifyCanonicalSessionCookie(sessionCookie)
        if (error || !firebaseAuthUser) {
            const authError = serializeAuthError(error)
            await recordAuthEvent({
                type: 'session_verification_failure',
                surface: 'server',
                route: 'session-cookie',
                errorCode: authError.errorCode,
                errorMessage: authError.errorMessage || 'Session cookie verification failed.',
            })
            cookieStore.delete('firebase-session')
            return null
        }

        if (firebaseAuthUser.disabled) {
            await recordAuthEvent({
                type: 'session_verification_failure',
                surface: 'server',
                route: 'session-cookie',
                uid: firebaseAuthUser.uid,
                email: firebaseAuthUser.email || null,
                errorCode: 'auth/user-disabled',
                errorMessage: 'Disabled user presented a valid session cookie.',
            })
            cookieStore.delete('firebase-session')
            return null
        }

        // Extra safety check: ensure email is verified
        if (!firebaseAuthUser.emailVerified) {
            console.warn(`User ${firebaseAuthUser.uid} has active session but email not verified.`)
            await recordAuthEvent({
                type: 'session_verification_failure',
                surface: 'server',
                route: 'session-cookie',
                uid: firebaseAuthUser.uid,
                email: firebaseAuthUser.email || null,
                errorCode: 'auth/email-not-verified',
                errorMessage: 'Unverified user presented a valid session cookie.',
            })
            cookieStore.delete('firebase-session')
            return null
        }

        // 2. Fetch User Data from Firestore
        const userDoc = await adminDb.collection('users').doc(firebaseAuthUser.uid).get()

        if (!userDoc.exists) {
            console.warn(`User ${firebaseAuthUser.uid} authenticated but no Firestore doc found.`)
            await recordAuthEvent({
                type: 'session_verification_failure',
                surface: 'server',
                route: 'session-cookie',
                uid: firebaseAuthUser.uid,
                email: firebaseAuthUser.email || null,
                errorCode: 'firestore/user-doc-missing',
                errorMessage: 'Authenticated user did not have a matching Firestore user document.',
            })
            cookieStore.delete('firebase-session')
            return null
        }

        const userData = userDoc.data()

        return {
            id: firebaseAuthUser.uid,
            email: firebaseAuthUser.email || '',
            name: userData?.name || firebaseAuthUser.name || 'Unknown',
            role: userData?.role || 'MENTEE',
            familyId: userData?.familyId,
            avatarUrl: userData?.avatarUrl,
        }
    } catch (err) {
        console.error('Auth helper error:', err)
        const authError = serializeAuthError(err)
        await recordAuthEvent({
            type: 'session_verification_failure',
            surface: 'server',
            route: 'session-cookie',
            errorCode: authError.errorCode,
            errorMessage: authError.errorMessage || 'Unexpected error while resolving authenticated user.',
        })
        cookieStore.delete('firebase-session')
        return null
    }
}

export async function requireAuth(): Promise<AuthenticatedUser> {
    const user = await getAuthenticatedUser()
    if (!user) {
        redirect('/login')
    }
    return user
}

export async function requireAdmin(): Promise<AuthenticatedUser> {
    const user = await requireAuth()
    if (user.role !== 'ADMIN') {
        redirect('/dashboard')
    }
    return user
}
