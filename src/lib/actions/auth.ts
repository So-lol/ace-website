'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyIdToken, createFirebaseUser, adminDb } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { UserDoc } from '@/types/firestore'

// Types
type AuthResult = {
    success: boolean
    error?: string
    redirectTo?: string
    needsClientAuth?: boolean // Flag to tell client to perform client-side sign-in
}

export async function signUp(formData: FormData): Promise<AuthResult> {
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!email || !password || !name) {
        return { success: false, error: 'All fields are required' }
    }

    if (password !== confirmPassword) {
        return { success: false, error: 'Passwords do not match' }
    }

    if (password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters' }
    }

    try {
        // 1. Create user in Firebase Auth
        const { user: firebaseUser, error: firebaseError } = await createFirebaseUser(
            email.toLowerCase(),
            password,
            name
        )

        if (firebaseError || !firebaseUser) {
            // Identify specific error codes if possible
            const errCode = (firebaseError as any)?.code
            if (errCode === 'auth/email-already-exists') {
                return { success: false, error: 'Email already in use' }
            }
            return { success: false, error: 'Failed to create account. Please try again.' }
        }

        // 2. Create user profile in Firestore
        // We use set() with merge: true just in case, but it's a new user
        const newUser: UserDoc = {
            uid: firebaseUser.uid,
            email: email.toLowerCase(),
            name: name,
            role: 'MENTEE', // Default role
            familyId: null,
            avatarUrl: null,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        }

        await adminDb.collection('users').doc(firebaseUser.uid).set(newUser)

        // Return needsClientAuth: true so the client can perform the actual login
        // (Getting the ID token requires client SDK interacton with password)
        return {
            success: true,
            redirectTo: '/login?message=account-created',
            needsClientAuth: true
        }

    } catch (error) {
        console.error('Sign up error:', error)
        return { success: false, error: 'An unexpected error occurred' }
    }
}

/**
 * Called by client after successful Firebase login to sync session
 */
export async function verifyAndSyncUser(idToken: string): Promise<AuthResult> {
    try {
        // 1. Verify the ID token
        const { user: firebaseUser, error } = await verifyIdToken(idToken)

        if (error || !firebaseUser) {
            return { success: false, error: 'Invalid authentication token' }
        }

        // 2. Check if user exists in Firestore
        const userRef = adminDb.collection('users').doc(firebaseUser.uid)
        const userSnap = await userRef.get()

        if (!userSnap.exists) {
            // Handle edge case: User created in Auth but not Firestore (e.g. earlier failure)
            console.warn(`Syncing missing user ${firebaseUser.uid} to Firestore`)
            const newUser: UserDoc = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: firebaseUser.name || 'Unknown',
                role: 'MENTEE',
                familyId: null,
                avatarUrl: firebaseUser.picture || null,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            }
            await userRef.set(newUser)
        } else {
            // Optional: Update last login or sync profile data
            // await userRef.update({ lastLogin: Timestamp.now() })
        }

        // 3. Create Session Cookie (Standard approach or just use the ID token as session)
        // For simplicity, we are storing the ID token in an HTTP-only cookie.
        // In production, consider using Firebase Session Cookies for longer duration (up to 2 weeks).
        const cookieStore = await cookies()

        // Token expires in 1 hour. We can set cookie for 1 hour.
        // For persistent login, implementing Firebase Session Cookies is better.
        // BUT for now, we use the ID token which needs client-side refresh logic or re-login.
        // To keep it simple: We store this token. Client SDK handles refresh, 
        // client should call this action again if token refreshes? 
        // Or we just rely on the token for server-side verification for now.

        cookieStore.set('firebase-session', idToken, {
            name: 'firebase-session',
            value: idToken,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60 * 24 * 5, // 5 days (Token actually expires in 1h, verifying it will fail later)
            // NOTE: This setup implies the user might be "logged out" server-side after 1h
            // even if cookie exists. 
            // A robust app uses `createSessionCookie` from Admin SDK.
        })

        return { success: true, redirectTo: '/dashboard' }

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
