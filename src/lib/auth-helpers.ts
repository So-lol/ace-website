'use server'

import { cookies, headers } from 'next/headers'
import { verifyIdToken } from '@/lib/firebase-admin'
import { prisma } from '@/lib/prisma'

export interface AuthenticatedUser {
    id: string
    email: string
    name: string
    role: string
    firebaseUid: string
}

/**
 * Get the authenticated user from the request
 * Checks both Authorization header and session cookie
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
    try {
        // Check Authorization header first
        const headersList = await headers()
        const authHeader = headersList.get('Authorization')
        let idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

        // Fall back to session cookie
        if (!idToken) {
            const cookieStore = await cookies()
            idToken = cookieStore.get('firebase-session')?.value || null
        }

        if (!idToken) {
            return null
        }

        // Verify the token
        const { user: firebaseUser, error } = await verifyIdToken(idToken)

        if (error || !firebaseUser || !firebaseUser.email) {
            return null
        }

        // Get user from database
        const dbUser = await prisma.user.findUnique({
            where: { email: firebaseUser.email },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            }
        })

        if (!dbUser) {
            return null
        }

        return {
            ...dbUser,
            firebaseUid: firebaseUser.uid,
        }
    } catch (error) {
        console.error('Error getting authenticated user:', error)
        return null
    }
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
    const user = await getAuthenticatedUser()
    if (!user) {
        throw new Error('Unauthorized')
    }
    return user
}

/**
 * Require admin role - throws if not admin
 */
export async function requireAdmin(): Promise<AuthenticatedUser> {
    const user = await requireAuth()
    if (user.role !== 'ADMIN') {
        throw new Error('Forbidden: Admin access required')
    }
    return user
}
