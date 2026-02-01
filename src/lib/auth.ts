import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { adminDb } from '@/lib/firebase-admin'

/**
 * @deprecated Use getAuthenticatedUser from @/lib/auth-helpers
 */

export async function getCurrentUser() {
    const authUser = await getAuthenticatedUser()
    if (!authUser) return null

    // We can return the authUser directly as it contains basic profile
    // Or fetch full relation tree if needed (not supported in new auth-helpers)
    return authUser
}

export async function isAdmin() {
    const user = await getAuthenticatedUser()
    return user?.role === 'ADMIN'
}

export async function isMentor() {
    const user = await getAuthenticatedUser()
    return user?.role === 'MENTOR'
}

export async function isMentee() {
    const user = await getAuthenticatedUser()
    return user?.role === 'MENTEE'
}

export { getAuthenticatedUser as getSession }
