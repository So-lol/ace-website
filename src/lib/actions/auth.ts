'use server'

import { cookies } from 'next/headers'
import { verifyIdToken, adminDb, createSessionCookie } from '@/lib/firebase-admin'
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

        // enforce email verification on server side
        if (!firebaseUser.email_verified) {
            return { success: false, error: 'Please verify your email address first.' }
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
                email: firebaseUser.email || '',
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

export async function signOut() {
    const cookieStore = await cookies()
    cookieStore.delete('firebase-session')
    return { success: true, redirectTo: '/login' }
}
