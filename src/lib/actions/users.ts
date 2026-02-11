'use server'

import { requireAdmin, getAuthenticatedUser } from '@/lib/auth-helpers'
import { adminDb, adminAuth, deleteFirebaseUser, createFirebaseUser, deleteFile } from '@/lib/firebase-admin'
import { revalidatePath } from 'next/cache'
import { UserDoc, FamilyDoc } from '@/types/firestore'
import { logAuditAction } from '@/lib/actions/audit'
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
        const admin = await requireAdmin()

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
        revalidatePath('/admin/users')

        await logAuditAction(
            admin.id,
            'CREATE',
            'USER',
            uid,
            `Created user ${input.name} (${input.email})`,
            undefined,
            admin.email
        )

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
        const currentUser = await getAuthenticatedUser()
        if (!currentUser) return null

        // IDOR Check: Allow self or admin
        if (currentUser.id !== userId && currentUser.role !== 'ADMIN') {
            return null
        }

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
        revalidatePath('/admin/users')

        await logAuditAction(
            admin.id,
            'UPDATE_ROLE',
            'USER',
            userId,
            `Updated role to ${role}`,
            undefined,
            admin.email
        )

        return { success: true }
    } catch (error) {
        console.error('Update role error:', error)
        return { success: false, error: 'Failed to update role' }
    }
}

export async function deleteUser(userId: string) {
    try {
        const admin = await requireAdmin()

        // Prevent self-deletion
        if (admin.id === userId) {
            return { success: false, error: 'You cannot delete your own account' }
        }

        // 0. Delete user's application(s)
        const userDoc = await adminDb.collection('users').doc(userId).get()
        if (userDoc.exists) {
            const userEmail = userDoc.data()?.email
            if (userEmail) {
                const appsSnap = await adminDb.collection('aceApplications')
                    .where('email', '==', userEmail.toLowerCase())
                    .get()

                for (const appDoc of appsSnap.docs) {
                    await appDoc.ref.delete()
                }
            }
        }

        // 1. Delete user's submissions and their images from storage
        const submissionsSnap = await adminDb.collection('submissions')
            .where('submitterId', '==', userId)
            .get()

        for (const doc of submissionsSnap.docs) {
            const data = doc.data()
            // Delete image from storage
            if (data.imagePath) {
                try {
                    await deleteFile(data.imagePath)
                } catch (error) {
                    console.error(`Failed to delete image ${data.imagePath}:`, error)
                    // Continue anyway - file might not exist
                }
            }
            await doc.ref.delete()
        }

        // 2. Handle pairings where user is mentor (delete entire pairing)
        const mentorPairingsSnap = await adminDb.collection('pairings')
            .where('mentorId', '==', userId)
            .get()

        for (const pairingDoc of mentorPairingsSnap.docs) {
            // Delete all submissions for this pairing
            const pairingSubmissionsSnap = await adminDb.collection('submissions')
                .where('pairingId', '==', pairingDoc.id)
                .get()

            for (const subDoc of pairingSubmissionsSnap.docs) {
                const data = subDoc.data()
                if (data.imagePath) {
                    try {
                        await deleteFile(data.imagePath)
                    } catch (error) {
                        console.error(`Failed to delete image ${data.imagePath}:`, error)
                    }
                }
                await subDoc.ref.delete()
            }

            // Delete the pairing
            await pairingDoc.ref.delete()
        }

        // 3. Handle pairings where user is mentee
        const menteePairingsSnap = await adminDb.collection('pairings')
            .where('menteeIds', 'array-contains', userId)
            .get()

        for (const pairingDoc of menteePairingsSnap.docs) {
            const menteeIds = pairingDoc.data().menteeIds || []
            const updatedMenteeIds = menteeIds.filter((id: string) => id !== userId)

            if (updatedMenteeIds.length === 0) {
                // No mentees left, delete the pairing
                await pairingDoc.ref.delete()
            } else {
                // Update to remove this mentee
                await pairingDoc.ref.update({
                    menteeIds: updatedMenteeIds,
                    updatedAt: Timestamp.now()
                })
            }
        }

        // 4. Handle families
        const familiesSnap = await adminDb.collection('families')
            .where('memberIds', 'array-contains', userId)
            .get()

        for (const familyDoc of familiesSnap.docs) {
            const familyData = familyDoc.data()
            const memberIds = (familyData.memberIds || []).filter((id: string) => id !== userId)
            const familyHeadIds = (familyData.familyHeadIds || []).filter((id: string) => id !== userId)
            const auntUncleIds = (familyData.auntUncleIds || []).filter((id: string) => id !== userId)

            if (memberIds.length === 0) {
                // Family is now empty, delete it
                await familyDoc.ref.delete()
            } else {
                // Update family to remove user from all arrays
                await familyDoc.ref.update({
                    memberIds,
                    familyHeadIds,
                    auntUncleIds,
                    updatedAt: Timestamp.now()
                })
            }
        }

        // 5. Delete from Firebase Auth
        const authResult = await deleteFirebaseUser(userId)
        if (!authResult.success) {
            console.error('Failed to delete user from Firebase Auth:', authResult.error)
            // Continue anyway - user might not exist in Auth but exists in Firestore
        }

        // 6. Delete user document from Firestore
        await adminDb.collection('users').doc(userId).delete()

        // 7. Revalidate all affected paths
        revalidatePath('/admin/users')
        revalidatePath('/admin/families')
        revalidatePath('/admin/pairings')
        revalidatePath('/admin/submissions')
        revalidatePath('/leaderboard')

        // 8. Audit log
        await logAuditAction(
            admin.id,
            'DELETE',
            'USER',
            userId,
            `Deleted user and cascaded to pairings, families, and submissions`,
            undefined,
            admin.email
        )

        return { success: true }
    } catch (error: any) {
        console.error('Delete user error:', error)
        return { success: false, error: error.message || 'Failed to delete user' }
    }
}

/**
 * Update user profile (self or admin)
 */
export async function updateUserProfile(userId: string, data: Partial<UserDoc>) {
    try {
        const currentUser = await getAuthenticatedUser()
        if (!currentUser) {
            return { success: false, error: 'Not authenticated' }
        }

        // IDOR Check: Allow self or admin
        if (currentUser.id !== userId && currentUser.role !== 'ADMIN') {
            return { success: false, error: 'Unauthorized' }
        }

        // 1. Update Firebase Auth if Name or Email changed
        const authUpdates: any = {}
        if (data.name) authUpdates.displayName = data.name
        if (data.email) authUpdates.email = data.email

        if (Object.keys(authUpdates).length > 0) {
            await adminAuth.updateUser(userId, authUpdates)
        }

        // 2. Update Firestore
        const firestoreUpdates: any = {
            ...data,
            updatedAt: Timestamp.now()
        }

        // Filter out fields that shouldn't be updated here or are already in data
        delete firestoreUpdates.uid
        delete firestoreUpdates.role
        delete firestoreUpdates.id // In case it was passed

        await adminDb.collection('users').doc(userId).update(firestoreUpdates)

        // 3. Revalidate
        revalidatePath('/dashboard')
        revalidatePath('/profile')
        revalidatePath('/admin/users')

        // 4. Audit Log
        await logAuditAction(
            currentUser.id,
            'UPDATE_PROFILE',
            'USER',
            userId,
            `Updated profile fields: ${Object.keys(data).join(', ')}`,
            undefined,
            currentUser.email
        )

        return { success: true }
    } catch (error: any) {
        console.error('Update profile error:', error)
        if (error.code === 'auth/email-already-in-use') {
            return { success: false, error: 'This email is already in use by another account.' }
        }
        return { success: false, error: error.message || 'Failed to update profile' }
    }
}
