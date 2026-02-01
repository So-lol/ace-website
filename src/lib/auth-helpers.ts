import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyIdToken, adminDb } from '@/lib/firebase-admin'
import { UserRole } from '@/types/index'

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
        const { user: firebaseAuthUser, error } = await verifyIdToken(sessionCookie)
        if (error || !firebaseAuthUser) return null

        // 2. Fetch User Data from Firestore
        const userDoc = await adminDb.collection('users').doc(firebaseAuthUser.uid).get()

        if (!userDoc.exists) {
            console.warn(`User ${firebaseAuthUser.uid} authenticated but no Firestore doc found.`)
            // Fallback: If verifying simple auth (no role required), could return basic info
            // But usually we want the DB profile.
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
        throw new Error('Forbidden: Admin access required')
    }
    return user
}
