'use server'

import { prisma } from '@/lib/prisma'
import { createUser, verifyIdToken, deleteUser } from '@/lib/firebase-admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

export type AuthResult = {
    success: boolean
    error?: string
    redirectTo?: string
    needsClientAuth?: boolean
}

/**
 * Sign up a new user
 * Note: Firebase Auth user creation happens on the client side for email/password
 * This server action creates the user in our database after Firebase auth succeeds
 */
export async function signUp(formData: FormData): Promise<AuthResult> {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    const name = formData.get('name') as string

    // Validation
    if (!email || !password || !name) {
        return { success: false, error: 'All fields are required' }
    }

    if (password !== confirmPassword) {
        return { success: false, error: 'Passwords do not match' }
    }

    if (password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters' }
    }

    // Check if user already exists in our database
    const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
    })

    if (existingUser) {
        return { success: false, error: 'An account with this email already exists' }
    }

    // Create user in Firebase Auth using Admin SDK
    const { user: firebaseUser, error: firebaseError } = await createUser(
        email.toLowerCase(),
        password,
        name
    )

    if (firebaseError || !firebaseUser) {
        console.error('Firebase signup error:', firebaseError)
        const errorMessage = firebaseError instanceof Error ? firebaseError.message : 'Failed to create account'
        return { success: false, error: errorMessage }
    }

    // Create user in our database
    try {
        await prisma.user.create({
            data: {
                id: firebaseUser.uid,
                email: email.toLowerCase(),
                name,
                role: 'MENTEE', // Default role, admin can change later
            },
        })
    } catch (dbError) {
        console.error('Database user creation error:', dbError)
        // Clean up Firebase user if database creation fails
        await deleteUser(firebaseUser.uid)
        return { success: false, error: 'Failed to create user profile' }
    }

    revalidatePath('/', 'layout')
    // User needs to sign in on the client side after signup
    return {
        success: true,
        redirectTo: '/login?message=account-created',
        needsClientAuth: true
    }
}

/**
 * Verify user session and sync with database
 * Called after client-side Firebase sign in
 */
export async function verifyAndSyncUser(idToken: string): Promise<AuthResult> {
    const { user: firebaseUser, error } = await verifyIdToken(idToken)

    if (error || !firebaseUser) {
        return { success: false, error: 'Invalid session' }
    }

    // Ensure user exists in our database
    let dbUser = await prisma.user.findUnique({
        where: { email: firebaseUser.email! }
    })

    if (!dbUser) {
        // Create user in database if they exist in Firebase but not in our DB
        dbUser = await prisma.user.create({
            data: {
                id: firebaseUser.uid,
                email: firebaseUser.email!.toLowerCase(),
                name: firebaseUser.name || firebaseUser.email!.split('@')[0],
                role: 'MENTEE',
            },
        })
    }

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('firebase-session', idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
    })

    revalidatePath('/', 'layout')
    return { success: true, redirectTo: '/dashboard' }
}

/**
 * Sign out user
 * Clears the session cookie (client handles Firebase signOut)
 */
export async function signOut(): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.delete('firebase-session')
    revalidatePath('/', 'layout')
    redirect('/')
}

/**
 * Request password reset email
 * Note: This needs to be done on the client side with Firebase Auth
 */
export async function resetPassword(formData: FormData): Promise<AuthResult> {
    const email = formData.get('email') as string

    if (!email) {
        return { success: false, error: 'Email is required' }
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
    })

    if (!user) {
        // Don't reveal whether email exists
        return {
            success: true,
            redirectTo: '/login?message=reset-email-sent'
        }
    }

    // Password reset is handled on the client side with Firebase Auth
    return {
        success: true,
        needsClientAuth: true,
        redirectTo: '/login?message=reset-email-sent'
    }
}

/**
 * Update password
 * Note: This needs to be done on the client side with Firebase Auth
 */
export async function updatePassword(formData: FormData): Promise<AuthResult> {
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!password || !confirmPassword) {
        return { success: false, error: 'All fields are required' }
    }

    if (password !== confirmPassword) {
        return { success: false, error: 'Passwords do not match' }
    }

    if (password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters' }
    }

    // Password update is handled on the client side with Firebase Auth
    return {
        success: true,
        needsClientAuth: true,
        redirectTo: '/dashboard?message=password-updated'
    }
}

/**
 * Get current authenticated user from ID token
 */
export async function getCurrentUser(idToken: string) {
    const { user: firebaseUser, error } = await verifyIdToken(idToken)

    if (error || !firebaseUser) {
        return null
    }

    const dbUser = await prisma.user.findUnique({
        where: { email: firebaseUser.email! },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
        }
    })

    return dbUser
}
