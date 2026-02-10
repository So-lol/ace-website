'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyIdToken, createFirebaseUser, adminDb, createSessionCookie } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { UserDoc } from '@/types/firestore'

// Types
type AuthResult = {
    success: boolean
    error?: string
    redirectTo?: string
    needsClientAuth?: boolean
    user?: any // return user data for context
}

export async function getCurrentUser(): Promise<UserDoc | null> {
    // Moved to auth-helpers.ts generally, but kept here for specific logic if needed
    // Ideally this should use getAuthenticatedUser from auth-helpers to stay DRY
    // but for now we leave it to avoid breaking changes in this file structure
    return null
}

// ... signUp function remains same ...

/**
 * Called by client after successful Firebase login to sync session
 */
export async function verifyAndSyncUser(idToken: string): Promise<AuthResult> {
    try {
        // 1. Verify the ID token first
        const { user: firebaseUser, error } = await verifyIdToken(idToken)

        if (error || !firebaseUser) {
            return { success: false, error: 'Invalid authentication token' }
        }

        // 2. Check if user exists in Firestore
        const userRef = adminDb.collection('users').doc(firebaseUser.uid)
        const userSnap = await userRef.get()
        let userData: UserDoc

        if (!userSnap.exists) {
            // Handle edge case: User created in Auth but not Firestore
            console.warn(`Syncing missing user ${firebaseUser.uid} to Firestore`)
            userData = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: firebaseUser.name || 'Unknown',
                role: 'MENTEE',
                familyId: null,
                avatarUrl: firebaseUser.picture || null,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            }
            await userRef.set(userData)
        } else {
            userData = { id: userSnap.id, ...userSnap.data() } as unknown as UserDoc
        }

        // 3. Create Session Cookie (5 days)
        const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5 days in milliseconds
        const { sessionCookie, error: cookieError } = await createSessionCookie(idToken, expiresIn)

        if (cookieError || !sessionCookie) {
            console.error('Failed to create session cookie:', cookieError)
            return { success: false, error: 'Failed to create session' }
        }

        const cookieStore = await cookies()

        cookieStore.set('firebase-session', sessionCookie, {
            name: 'firebase-session',
            value: sessionCookie,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60 * 24 * 5, // 5 days in seconds
            sameSite: 'lax',
        })

        // Return user data
        const plainUser = JSON.parse(JSON.stringify(userData))

        return { success: true, redirectTo: '/dashboard', user: plainUser }

    } catch (error) {
        console.error('Verify user error:', error)
        return { success: false, error: 'Authentication failed' }
    }
}

export async function signOut() {
    const cookieStore = await cookies()
    cookieStore.delete('firebase-session')
    return { success: true, redirectTo: '/login' }
}

// User Profile Actions

export async function updatePassword(password: string) {
    // This needs to be handled client-side with Firebase SDK usually,
    // Or server-side via Admin SDK if we trust the request.
    // Since we don't handle "current password" verification easily server-side without re-auth,
    // It's recommended to do this client-side.
    return { success: false, error: 'Please update password via client SDK' }
}
