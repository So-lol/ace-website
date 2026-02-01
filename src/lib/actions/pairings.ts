'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { adminDb } from '@/lib/firebase-admin'
import { revalidatePath } from 'next/cache'
import { Timestamp } from 'firebase-admin/firestore'
import { PairingDoc, UserDoc, FamilyDoc, SubmissionDoc } from '@/types/firestore' // Raw types
import { User, Family, Submission } from '@/types/index' // Client types

export type PairingResult = {
    success: boolean
    error?: string
    pairingId?: string
}

// Return type matching index.ts PairingFull (ish)
// The page expects: family, mentor, mentees (User[] or equivalent), submissions (Submission[])

/**
 * Get all pairings with related data
 */
export async function getPairings() {
    try {
        const snapshot = await adminDb.collection('pairings').orderBy('createdAt', 'desc').get()

        const pairings = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data() as PairingDoc

            // 1. Fetch Family
            const familySnap = await adminDb.collection('families').doc(data.familyId).get()
            const familyData = familySnap.exists ? familySnap.data() as FamilyDoc : { name: 'Unknown' } as FamilyDoc
            const family = { ...familyData, id: familySnap.id, createdAt: familyData.createdAt?.toDate(), updatedAt: familyData.updatedAt?.toDate() }

            // 2. Fetch Mentor
            const mentorSnap = await adminDb.collection('users').doc(data.mentorId).get()
            const mentorData = mentorSnap.exists ? mentorSnap.data() as UserDoc : { name: 'Unknown' } as UserDoc
            const mentor = { ...mentorData, id: mentorSnap.id, createdAt: mentorData.createdAt?.toDate(), updatedAt: mentorData.updatedAt?.toDate() }

            // 3. Fetch Mentees
            const mentees = (await Promise.all(data.menteeIds.map(async (uid) => {
                const menteeSnap = await adminDb.collection('users').doc(uid).get()
                if (menteeSnap.exists) {
                    const d = menteeSnap.data() as UserDoc
                    return { ...d, id: uid, createdAt: d.createdAt.toDate(), updatedAt: d.updatedAt.toDate() }
                }
                return null
            }))).filter(Boolean) as User[]

            // 4. Fetch Submissions
            const submissionsSnap = await adminDb.collection('submissions')
                .where('pairingId', '==', doc.id)
                .orderBy('createdAt', 'desc')
                .get()

            const submissions = submissionsSnap.docs.map(s => {
                const sd = s.data() as SubmissionDoc
                return {
                    ...sd,
                    id: s.id,
                    createdAt: sd.createdAt.toDate(),
                    updatedAt: sd.updatedAt.toDate(),
                    reviewedAt: sd.reviewedAt?.toDate(),
                }
            }) as Submission[]

            return {
                id: doc.id,
                familyId: data.familyId,
                mentorId: data.mentorId,
                menteeIds: data.menteeIds,
                weeklyPoints: data.weeklyPoints,
                totalPoints: data.totalPoints,
                family,
                mentor,
                mentees,
                submissions,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
            }
        }))

        return pairings
    } catch (error) {
        console.error('Failed to fetch pairings:', error)
        return []
    }
}

/**
 * Get a single pairing by ID
 */
export async function getPairing(pairingId: string) {
    try {
        const docRef = adminDb.collection('pairings').doc(pairingId)
        const docSnap = await docRef.get()

        if (!docSnap.exists) return null
        const data = docSnap.data() as PairingDoc

        // 1. Fetch Family
        const familySnap = await adminDb.collection('families').doc(data.familyId).get()
        const familyData = familySnap.exists ? familySnap.data() as FamilyDoc : { name: 'Unknown' } as FamilyDoc
        const family = { ...familyData, id: familySnap.id, createdAt: familyData.createdAt?.toDate(), updatedAt: familyData.updatedAt?.toDate() }

        // 2. Fetch Mentor
        const mentorSnap = await adminDb.collection('users').doc(data.mentorId).get()
        const mentorData = mentorSnap.exists ? mentorSnap.data() as UserDoc : { name: 'Unknown' } as UserDoc
        const mentor = { ...mentorData, id: mentorSnap.id, createdAt: mentorData.createdAt?.toDate(), updatedAt: mentorData.updatedAt?.toDate() }

        // 3. Fetch Mentees
        const mentees = (await Promise.all(data.menteeIds.map(async (uid) => {
            const menteeSnap = await adminDb.collection('users').doc(uid).get()
            if (menteeSnap.exists) {
                const d = menteeSnap.data() as UserDoc
                return { ...d, id: uid, createdAt: d.createdAt.toDate(), updatedAt: d.updatedAt.toDate() }
            }
            return null
        }))).filter(Boolean) as User[]

        // 4. Fetch Submissions
        const submissionsSnap = await adminDb.collection('submissions')
            .where('pairingId', '==', pairingId)
            .orderBy('createdAt', 'desc')
            .get()

        const submissions = submissionsSnap.docs.map(s => {
            const sd = s.data() as SubmissionDoc
            return {
                ...sd,
                id: s.id,
                createdAt: sd.createdAt.toDate(),
                updatedAt: sd.updatedAt.toDate(),
                reviewedAt: sd.reviewedAt?.toDate(),
            }
        }) as Submission[]

        return {
            id: docSnap.id,
            familyId: data.familyId,
            mentorId: data.mentorId,
            menteeIds: data.menteeIds,
            weeklyPoints: data.weeklyPoints,
            totalPoints: data.totalPoints,
            family,
            mentor,
            mentees,
            submissions,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
        }
    } catch (error) {
        console.error('Failed to fetch pairing:', error)
        return null
    }
}

// ... Create/Delete functions same as before (updating Types if passed)
// createPairing: mentorId, menteeIds are strings.
// Same impl as before. Can keep same.

/**
 * Create a new pairing (admin only)
 */
export async function createPairing(
    familyId: string,
    mentorId: string,
    menteeIds: string[]
): Promise<PairingResult> {
    let adminUser
    try {
        adminUser = await requireAdmin()
    } catch {
        return { success: false, error: 'Only admins can create pairings' }
    }

    try {
        const newPairing: Omit<PairingDoc, 'id'> = {
            familyId,
            mentorId,
            menteeIds,
            weeklyPoints: 0,
            totalPoints: 0,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        }

        const pairingRef = await adminDb.collection('pairings').add(newPairing)

        await adminDb.collection('users').doc(mentorId).update({ familyId })
        for (const uid of menteeIds) {
            await adminDb.collection('users').doc(uid).update({ familyId })
        }

        await adminDb.collection('auditLogs').add({
            action: 'CREATE',
            entityType: 'Pairing',
            entityId: pairingRef.id,
            actorId: adminUser.id,
            afterValue: { familyId, mentorId, menteeIds },
            createdAt: Timestamp.now(),
        })

        revalidatePath('/admin/pairings')

        return { success: true, pairingId: pairingRef.id }
    } catch (error) {
        console.error('Pairing creation error:', error)
        return { success: false, error: 'Failed to create pairing' }
    }
}

export async function deletePairing(pairingId: string): Promise<PairingResult> {
    let adminUser
    try {
        adminUser = await requireAdmin()
    } catch {
        return { success: false, error: 'Only admins can delete pairings' }
    }

    try {
        await adminDb.collection('pairings').doc(pairingId).delete()

        await adminDb.collection('auditLogs').add({
            action: 'DELETE',
            entityType: 'Pairing',
            entityId: pairingId,
            actorId: adminUser.id,
            createdAt: Timestamp.now(),
        })

        revalidatePath('/admin/pairings')
        return { success: true, pairingId }
    } catch (error) {
        console.error('Pairing deletion error:', error)
        return { success: false, error: 'Failed to delete pairing' }
    }
}

export async function addMenteeToPairing(pairingId: string, menteeId: string): Promise<PairingResult> {
    try {
        await requireAdmin()

        const pairingRef = adminDb.collection('pairings').doc(pairingId)
        const snap = await pairingRef.get()
        if (!snap.exists) return { success: false, error: 'Pairing not found' }

        const data = snap.data() as PairingDoc
        if (data.menteeIds.includes(menteeId)) {
            return { success: false, error: 'Mentee already in pairing' }
        }

        await pairingRef.update({
            menteeIds: [...data.menteeIds, menteeId],
            updatedAt: Timestamp.now()
        })

        await adminDb.collection('users').doc(menteeId).update({ familyId: data.familyId })

        revalidatePath('/admin/pairings')

        return { success: true, pairingId }
    } catch (error) {
        console.error('Add mentee error:', error)
        return { success: false, error: 'Failed to add mentee' }
    }
}

export async function removeMenteeFromPairing(pairingId: string, menteeId: string): Promise<PairingResult> {
    try {
        await requireAdmin()

        const pairingRef = adminDb.collection('pairings').doc(pairingId)
        const snap = await pairingRef.get()
        if (!snap.exists) return { success: false, error: 'Pairing not found' }

        const data = snap.data() as PairingDoc
        const newMentees = data.menteeIds.filter(id => id !== menteeId)

        await pairingRef.update({
            menteeIds: newMentees,
            updatedAt: Timestamp.now()
        })

        await adminDb.collection('users').doc(menteeId).update({ familyId: null })

        revalidatePath('/admin/pairings')

        return { success: true, pairingId }
    } catch (error) {
        console.error('Remove mentee error:', error)
        return { success: false, error: 'Failed to remove mentee' }
    }
}

/**
 * Update a pairing (admin only)
 */
export async function updatePairing(
    pairingId: string,
    data: {
        familyId?: string
        mentorId?: string
        menteeIds?: string[]
    }
): Promise<PairingResult> {
    try {
        const adminUser = await requireAdmin()
        const pairingRef = adminDb.collection('pairings').doc(pairingId)
        const snap = await pairingRef.get()

        if (!snap.exists) {
            return { success: false, error: 'Pairing not found' }
        }

        const currentData = snap.data() as PairingDoc
        const updates: any = { updatedAt: Timestamp.now() }
        const newFamilyId = data.familyId || currentData.familyId

        // Handle Family Change logic if needed (updating users' familyId)
        // For simplicity, we ensure all members of this pairing are set to the target familyId

        if (data.familyId) updates.familyId = data.familyId
        if (data.mentorId) updates.mentorId = data.mentorId
        if (data.menteeIds) updates.menteeIds = data.menteeIds

        await pairingRef.update(updates)

        // Sync User Family IDs
        const targetFamilyId = data.familyId || currentData.familyId

        // 1. Update old mentor if changed (remove family assignment or keep? Assuming keep for now or manual fix)
        // Better: Update NEW mentor to family
        if (data.mentorId) {
            await adminDb.collection('users').doc(data.mentorId).update({ familyId: targetFamilyId })
        } else {
            // Ensure current mentor is in family
            await adminDb.collection('users').doc(currentData.mentorId).update({ familyId: targetFamilyId })
        }

        // 2. Update Mentees
        const menteesToUpdate = data.menteeIds || currentData.menteeIds

        // If mentees changed, we should probably unset familyId for removed mentees, 
        // but finding exactly which ones were removed efficiently is tricky without current list.
        // For now, let's just ensure all CURRENT mentees have the correct familyId.
        for (const uid of menteesToUpdate) {
            await adminDb.collection('users').doc(uid).update({ familyId: targetFamilyId })
        }

        // Log audit
        await adminDb.collection('auditLogs').add({
            action: 'UPDATE',
            entityType: 'Pairing',
            entityId: pairingId,
            actorId: adminUser.id,
            afterValue: updates,
            createdAt: Timestamp.now(),
        })

        revalidatePath('/admin/pairings')
        return { success: true, pairingId }

    } catch (error: any) {
        console.error('Update pairing error:', error)
        return { success: false, error: error.message || 'Failed to update pairing' }
    }
}
