'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { adminDb, deleteFirebaseUser, createFirebaseUser } from '@/lib/firebase-admin'
import { revalidatePath } from 'next/cache'
import { UserDoc, FamilyDoc } from '@/types/firestore'
import { UserWithFamily, UserRole, Family } from '@/types/index'
import { Timestamp } from 'firebase-admin/firestore'

interface CreateUserInput {
    name: string
    email: string
    password: string
    role: UserRole
    familyId?: string
}

/**
 * Create a new user (admin only)
 */
export async function createUser(input: CreateUserInput) {
    try {
        await requireAdmin()

        if (!input.name || !input.email || !input.password) {
            return { success: false, error: 'Name, email, and password are required' }
        }

        if (input.password.length < 6) {
            return { success: false, error: 'Password must be at least 6 characters' }
        }

        // Create Firebase Auth user
        const result = await createFirebaseUser(input.email, input.password, input.name)

        if (!result.user) {
            return { success: false, error: 'Failed to create user in Firebase Auth' }
        }

        const uid = result.user.uid

        // Create Firestore user document
        const newUser: Omit<UserDoc, 'id'> = {
            uid,
            email: input.email,
            name: input.name,
            role: input.role || 'MENTEE',
            familyId: input.familyId || null,
            avatarUrl: null,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        }

        await adminDb.collection('users').doc(uid).set(newUser)

        // If family assigned, add user to family's memberIds
        if (input.familyId) {
            const familyRef = adminDb.collection('families').doc(input.familyId)
            const familySnap = await familyRef.get()
            if (familySnap.exists) {
                const familyData = familySnap.data()
                const memberIds = familyData?.memberIds || []
                if (!memberIds.includes(uid)) {
                    await familyRef.update({
                        memberIds: [...memberIds, uid],
                        updatedAt: Timestamp.now()
                    })
                }
            }
        }

        revalidatePath('/admin/users')
        return { success: true, userId: uid }
    } catch (error: any) {
        console.error('Create user error:', error)
        return { success: false, error: error.message || 'Failed to create user' }
    }
}

/**
 * Get all users with family relation
 */
export async function getUsers(): Promise<UserWithFamily[]> {
    try {
        await requireAdmin()

        // Parallel fetch for users and families to be efficient
        const [usersSnap, familiesSnap] = await Promise.all([
            adminDb.collection('users').orderBy('createdAt', 'desc').get(),
            adminDb.collection('families').get()
        ])

        // Create Family Map
        const familyMap = new Map<string, Family>()
        familiesSnap.forEach(doc => {
            const fd = doc.data() as FamilyDoc
            familyMap.set(doc.id, {
                ...fd,
                id: doc.id,
                createdAt: fd.createdAt.toDate(),
                updatedAt: fd.updatedAt.toDate()
            })
        })

        const users = usersSnap.docs.map(doc => {
            const data = doc.data() as UserDoc

            let family: Family | null = null
            if (data.familyId && familyMap.has(data.familyId)) {
                family = familyMap.get(data.familyId)!
            }

            return {
                ...data,
                id: doc.id, // uid
                family,
                createdAt: data.createdAt.toDate(),
                updatedAt: data.updatedAt.toDate(),
            } as UserWithFamily
        })

        return users
    } catch (error) {
        console.error('Failed to fetch users:', error)
        return []
    }
}

/**
 * Get full user profile with relations for dashboard
 */
export async function getUserProfile(userId: string) {
    try {
        const userDoc = await adminDb.collection('users').doc(userId).get()
        if (!userDoc.exists) return null

        const userData = userDoc.data() as UserDoc
        let family: any = null
        let pairing: any = null

        // Fetch Family
        if (userData.familyId) {
            const familyDoc = await adminDb.collection('families').doc(userData.familyId).get()
            if (familyDoc.exists) {
                family = { id: familyDoc.id, ...familyDoc.data() }
            }
        }

        // Fetch Pairing (Mentor or Mentee)
        // First check if mentor
        let pairingSnap = await adminDb.collection('pairings').where('mentorId', '==', userId).limit(1).get()

        if (pairingSnap.empty) {
            // Check if mentee
            pairingSnap = await adminDb.collection('pairings').where('menteeIds', 'array-contains', userId).limit(1).get()
        }

        if (!pairingSnap.empty) {
            const pDoc = pairingSnap.docs[0]
            const pData = pDoc.data()

            // Fetch mentees names for display
            const menteeIds = pData.menteeIds || []
            const mentees: string[] = []

            if (menteeIds.length > 0) {
                // Fetch mentees in parallel
                // Use Promise.all
                // Firestore 'in' query supports up to 10
                if (menteeIds.length > 0) {
                    const menteesSnap = await adminDb.collection('users').where('uid', 'in', menteeIds).get()
                    menteesSnap.forEach(doc => {
                        const d = doc.data()
                        if (d.name) mentees.push(d.name)
                    })
                }
            }

            pairing = {
                id: pDoc.id,
                ...pData,
                mentees: mentees
            }
        }

        return {
            ...userData,
            id: userDoc.id,
            family,
            pairing
        }
    } catch (error) {
        console.error('Error fetching user profile:', error)
        return null
    }
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(userId: string, role: UserRole) {
    try {
        const admin = await requireAdmin()

        await adminDb.collection('users').doc(userId).update({
            role,
            updatedAt: new Date()
        })

        revalidatePath('/admin/users')
        return { success: true }
    } catch (error) {
        console.error('Update role error:', error)
        return { success: false, error: 'Failed to update role' }
    }
}

/**
 * Delete user (admin only)
 */
export async function deleteUser(userId: string) {
    try {
        await requireAdmin()
        await adminDb.collection('users').doc(userId).delete()
        await deleteFirebaseUser(userId)
        revalidatePath('/admin/users')
        return { success: true }
    } catch (error) {
        console.error('Delete user error:', error)
        return { success: false, error: 'Failed to delete user' }
    }
}
