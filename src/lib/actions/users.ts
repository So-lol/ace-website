'use server'

import { requireAdmin, getAuthenticatedUser } from '@/lib/auth-helpers'
import { adminDb, adminAuth, deleteFirebaseUser, createFirebaseUser, deleteFile } from '@/lib/firebase-admin'
import { revalidatePath } from 'next/cache'
import { UserDoc, FamilyDoc, AceApplicationDoc, PairingDoc } from '@/types/firestore'
import { logAuditAction } from '@/lib/actions/audit'
import { UserWithFamily, UserRole, Family, AceRole } from '@/types/index'
import { Timestamp } from 'firebase-admin/firestore'
import { normalizeEmail } from '@/lib/auth-utils'

interface CreateUserInput {
    name: string
    email: string
    password: string
    role: UserRole
    familyId?: string
}

type ActionError = {
    message?: string
    code?: string
}

type UserProfileResult = UserDoc & {
    id: string
    aceRole: AceRole | null
    dashboardRoleLabel: string
    isFamilyHead: boolean
    family: {
        id: string
        name?: string
        rank?: number | string
    } | null
    pairing: {
        id: string
        mentorId: string | null
        mentorName: string | null
        menteeIds: string[]
        mentees: string[]
    } | null
}

function getDashboardRoleLabel(userRole: UserRole, aceRole: AceRole | null, isFamilyHead: boolean) {
    if (aceRole === 'FAMILY_HEAD' || isFamilyHead) return 'Family Head'
    if (aceRole === 'EM') return 'Mentee'
    if (aceRole === 'ANH' || aceRole === 'CHI' || aceRole === 'CHANH') return 'Mentor'
    if (userRole === 'MENTOR') return 'Mentor'
    if (userRole === 'MENTEE') return 'Mentee'
    return 'Participant'
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
        const normalizedEmail = normalizeEmail(input.email)
        const result = await createFirebaseUser(normalizedEmail, input.password, input.name, true)

        if (!result.user) {
            return { success: false, error: 'Failed to create user in Firebase Auth' }
        }

        const uid = result.user.uid

        // Create Firestore user document
        const newUser: Omit<UserDoc, 'id'> = {
            uid,
            email: normalizedEmail,
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
            `Created user ${input.name} (${normalizedEmail})`,
            undefined,
            admin.email
        )

        return { success: true, userId: uid }
    } catch (error: unknown) {
        const actionError = error as ActionError
        console.error('Create user error:', error)
        return { success: false, error: actionError.message || 'Failed to create user' }
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
export async function getUserProfile(userId: string): Promise<UserProfileResult | null> {
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
        let family: UserProfileResult['family'] = null
        let pairing: UserProfileResult['pairing'] = null
        let aceRole: AceRole | null = null

        const applicationByApplicantIdPromise = adminDb.collection('aceApplications')
            .where('applicantId', '==', userId)
            .limit(1)
            .get()

        const applicationByEmailPromise = adminDb.collection('aceApplications')
            .where('email', '==', userData.email.trim().toLowerCase())
            .limit(1)
            .get()

        const familyByIdPromise = userData.familyId
            ? adminDb.collection('families').doc(userData.familyId).get()
            : Promise.resolve(null)

        const [applicationByApplicantIdSnap, applicationByEmailSnap, familyByIdDoc, familyMemberSnap, familyHeadSnap, legacyFamilyHeadSnap, familyAuntUncleSnap, pairingAsMentorSnap, pairingAsMenteeSnap, familyLeaderboardSnap] = await Promise.all([
            applicationByApplicantIdPromise,
            applicationByEmailPromise,
            familyByIdPromise,
            adminDb.collection('families').where('memberIds', 'array-contains', userId).limit(1).get(),
            adminDb.collection('families').where('familyHeadIds', 'array-contains', userId).limit(1).get(),
            adminDb.collection('families').where('familyHeadId', '==', userId).limit(1).get(),
            adminDb.collection('families').where('auntUncleIds', 'array-contains', userId).limit(1).get(),
            adminDb.collection('pairings').where('mentorId', '==', userId).limit(1).get(),
            adminDb.collection('pairings').where('menteeIds', 'array-contains', userId).limit(1).get(),
            adminDb.collection('families').orderBy('totalPoints', 'desc').get()
        ])

        if (!applicationByApplicantIdSnap.empty) {
            aceRole = (applicationByApplicantIdSnap.docs[0].data() as AceApplicationDoc).role
        } else if (!applicationByEmailSnap.empty) {
            aceRole = (applicationByEmailSnap.docs[0].data() as AceApplicationDoc).role
        }

        const resolvedFamilyDoc =
            (familyByIdDoc && familyByIdDoc.exists ? familyByIdDoc : null) ||
            (!familyHeadSnap.empty ? familyHeadSnap.docs[0] : null) ||
            (!legacyFamilyHeadSnap.empty ? legacyFamilyHeadSnap.docs[0] : null) ||
            (!familyMemberSnap.empty ? familyMemberSnap.docs[0] : null) ||
            (!familyAuntUncleSnap.empty ? familyAuntUncleSnap.docs[0] : null)

        if (resolvedFamilyDoc) {
            const familyData = resolvedFamilyDoc.data() as FamilyDoc
            const familyRank = familyLeaderboardSnap.docs.findIndex(doc => doc.id === resolvedFamilyDoc.id) + 1
            family = {
                id: resolvedFamilyDoc.id,
                name: familyData.name,
                rank: familyRank > 0 ? familyRank : undefined
            }
        }

        const pairingSnap = !pairingAsMentorSnap.empty ? pairingAsMentorSnap : pairingAsMenteeSnap
        if (!pairingSnap.empty) {
            const pDoc = pairingSnap.docs[0]
            const pData = pDoc.data() as PairingDoc
            const menteeIds = Array.isArray(pData.menteeIds) ? pData.menteeIds : []
            const userIdsToFetch = [pData.mentorId, ...menteeIds].filter(Boolean)
            const usersById = new Map<string, string>()

            if (userIdsToFetch.length > 0) {
                const userSnaps = await Promise.all(
                    userIdsToFetch.map(id => adminDb.collection('users').doc(id).get())
                )
                userSnaps.forEach(doc => {
                    if (doc.exists) {
                        const data = doc.data() as UserDoc
                        usersById.set(doc.id, data.name || 'Unknown')
                    }
                })
            }

            pairing = {
                id: pDoc.id,
                mentorId: pData.mentorId || null,
                mentorName: pData.mentorId ? (usersById.get(pData.mentorId) || null) : null,
                menteeIds,
                mentees: menteeIds.map(id => usersById.get(id) || 'Unknown')
            }
        }

        const isFamilyHead =
            aceRole === 'FAMILY_HEAD' ||
            (!familyHeadSnap.empty && familyHeadSnap.docs[0].id === family?.id) ||
            (!legacyFamilyHeadSnap.empty && legacyFamilyHeadSnap.docs[0].id === family?.id)

        return {
            ...userData,
            id: userDoc.id,
            family,
            pairing,
            aceRole,
            dashboardRoleLabel: getDashboardRoleLabel(userData.role, aceRole, isFamilyHead),
            isFamilyHead
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
    } catch (error: unknown) {
        const actionError = error as ActionError
        console.error('Delete user error:', error)
        return { success: false, error: actionError.message || 'Failed to delete user' }
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

        if (data.email) {
            return { success: false, error: 'Use the account security form to change your email address.' }
        }

        // 1. Update Firebase Auth if Name changed
        const authUpdates: { displayName?: string } = {}
        if (data.name) authUpdates.displayName = data.name

        if (Object.keys(authUpdates).length > 0) {
            await adminAuth.updateUser(userId, authUpdates)
        }

        // 2. Update Firestore
        const firestoreUpdates: Partial<UserDoc> & { updatedAt: Timestamp } = {
            ...data,
            updatedAt: Timestamp.now()
        }

        // Filter out fields that shouldn't be updated here or are already in data
        delete firestoreUpdates.uid
        delete firestoreUpdates.role
        if (firestoreUpdates.email) {
            firestoreUpdates.email = normalizeEmail(firestoreUpdates.email)
        }

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
    } catch (error: unknown) {
        const actionError = error as ActionError
        console.error('Update profile error:', error)
        if (actionError.code === 'auth/email-already-in-use') {
            return { success: false, error: 'This email is already in use by another account.' }
        }
        return { success: false, error: actionError.message || 'Failed to update profile' }
    }
}
