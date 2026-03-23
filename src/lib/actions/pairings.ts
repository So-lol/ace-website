'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { adminDb } from '@/lib/firebase-admin'
import { revalidatePath } from 'next/cache'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'
import { PairingDoc, UserDoc, FamilyDoc, SubmissionDoc } from '@/types/firestore' // Raw types
import { User, Submission } from '@/types/index' // Client types
import { logAuditAction } from '@/lib/actions/audit'
import { getErrorMessage } from '@/lib/errors'

type PairingUpdateData = {
    familyId?: string
    mentorId?: string
    menteeIds?: string[]
    updatedAt: Timestamp
}

export type PairingResult = {
    success: boolean
    error?: string
    pairingId?: string
}

function toSafeDate(value: unknown) {
    return value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function'
        ? value.toDate() as Date
        : undefined
}

function toSafeStringArray(value: unknown) {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function serializeFamily(docId: string, data?: Partial<FamilyDoc> | null) {
    return {
        id: docId,
        name: data?.name ?? 'Unknown',
        isArchived: data?.isArchived ?? false,
        memberIds: toSafeStringArray(data?.memberIds),
        familyHeadIds: toSafeStringArray(data?.familyHeadIds),
        auntUncleIds: toSafeStringArray(data?.auntUncleIds),
        weeklyPoints: data?.weeklyPoints ?? 0,
        totalPoints: data?.totalPoints ?? 0,
        createdAt: toSafeDate(data?.createdAt),
        updatedAt: toSafeDate(data?.updatedAt),
    }
}

function serializeUser(docId: string, data?: Partial<UserDoc> | null): User {
    return {
        id: docId,
        uid: data?.uid ?? docId,
        name: data?.name ?? 'Unknown',
        email: data?.email ?? '',
        role: data?.role ?? 'MENTEE',
        familyId: data?.familyId ?? null,
        avatarUrl: data?.avatarUrl ?? null,
        createdAt: toSafeDate(data?.createdAt) ?? new Date(0),
        updatedAt: toSafeDate(data?.updatedAt) ?? new Date(0),
    }
}

function serializeSubmission(docId: string, data: Partial<SubmissionDoc>): Submission {
    return {
        id: docId,
        pairingId: data.pairingId ?? '',
        submitterId: data.submitterId ?? '',
        weekNumber: data.weekNumber ?? 0,
        year: data.year ?? 0,
        imageUrl: data.imageUrl ?? '',
        imagePath: data.imagePath ?? '',
        status: data.status ?? 'PENDING',
        basePoints: data.basePoints ?? 0,
        bonusPoints: data.bonusPoints ?? 0,
        totalPoints: data.totalPoints ?? 0,
        reviewerId: data.reviewerId,
        reviewReason: data.reviewReason,
        reviewedAt: toSafeDate(data.reviewedAt),
        bonusActivityIds: toSafeStringArray(data.bonusActivityIds),
        createdAt: toSafeDate(data.createdAt) ?? new Date(0),
        updatedAt: toSafeDate(data.updatedAt) ?? new Date(0),
    }
}

async function validatePairingParticipants(mentorId: string, menteeIds: string[]) {
    const [mentorSnap, menteeSnaps] = await Promise.all([
        adminDb.collection('users').doc(mentorId).get(),
        Promise.all(menteeIds.map(id => adminDb.collection('users').doc(id).get()))
    ])

    if (!mentorSnap.exists) {
        return 'Selected mentor was not found'
    }

    const mentor = mentorSnap.data() as UserDoc
    if (mentor.role !== 'MENTOR' && mentor.role !== 'ADMIN') {
        return 'Selected mentor must have role MENTOR or ADMIN'
    }

    for (const menteeSnap of menteeSnaps) {
        if (!menteeSnap.exists) {
            return 'One or more selected mentees were not found'
        }

        const mentee = menteeSnap.data() as UserDoc
        if (mentee.role !== 'MENTEE') {
            return 'Selected mentees must have role MENTEE'
        }
    }

    return null
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
            const familyData = familySnap.exists ? familySnap.data() as FamilyDoc : null
            const family = serializeFamily(data.familyId, familyData)

            // 2. Fetch Mentor
            const mentorSnap = await adminDb.collection('users').doc(data.mentorId).get()
            const mentorData = mentorSnap.exists ? mentorSnap.data() as UserDoc : null
            const mentor = serializeUser(data.mentorId, mentorData)

            // 3. Fetch Mentees
            const mentees = (await Promise.all(toSafeStringArray(data.menteeIds).map(async (uid) => {
                const menteeSnap = await adminDb.collection('users').doc(uid).get()
                if (menteeSnap.exists) {
                    const d = menteeSnap.data() as UserDoc
                    return serializeUser(uid, d)
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
                return serializeSubmission(s.id, sd)
            }) as Submission[]

            return {
                id: doc.id,
                familyId: data.familyId,
                mentorId: data.mentorId,
                menteeIds: toSafeStringArray(data.menteeIds),
                weeklyPoints: data.weeklyPoints ?? 0,
                totalPoints: data.totalPoints ?? 0,
                family,
                mentor,
                mentees,
                submissions,
                createdAt: toSafeDate(data.createdAt),
                updatedAt: toSafeDate(data.updatedAt),
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
        const familyData = familySnap.exists ? familySnap.data() as FamilyDoc : null
        const family = serializeFamily(data.familyId, familyData)

        // 2. Fetch Mentor
        const mentorSnap = await adminDb.collection('users').doc(data.mentorId).get()
        const mentorData = mentorSnap.exists ? mentorSnap.data() as UserDoc : null
        const mentor = serializeUser(data.mentorId, mentorData)

        // 3. Fetch Mentees
        const mentees = (await Promise.all(toSafeStringArray(data.menteeIds).map(async (uid) => {
            const menteeSnap = await adminDb.collection('users').doc(uid).get()
            if (menteeSnap.exists) {
                const d = menteeSnap.data() as UserDoc
                return serializeUser(uid, d)
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
            return serializeSubmission(s.id, sd)
        }) as Submission[]

        return {
            id: docSnap.id,
            familyId: data.familyId,
            mentorId: data.mentorId,
            menteeIds: toSafeStringArray(data.menteeIds),
            weeklyPoints: data.weeklyPoints ?? 0,
            totalPoints: data.totalPoints ?? 0,
            family,
            mentor,
            mentees,
            submissions,
            createdAt: toSafeDate(data.createdAt),
            updatedAt: toSafeDate(data.updatedAt),
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
        const validationError = await validatePairingParticipants(mentorId, menteeIds)
        if (validationError) {
            return { success: false, error: validationError }
        }

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

        // Update Family memberIds
        await adminDb.collection('families').doc(familyId).update({
            memberIds: FieldValue.arrayUnion(mentorId, ...menteeIds),
            updatedAt: Timestamp.now()
        })

        await logAuditAction(
            adminUser.id,
            'CREATE',
            'PAIRING',
            pairingRef.id,
            'Created pairing',
            { familyId, mentorId, menteeIds },
            adminUser.email
        )

        revalidatePath('/admin/pairings')
        revalidatePath('/admin/families')

        return { success: true, pairingId: pairingRef.id }
    } catch (error: unknown) {
        console.error('Pairing creation error:', error)
        return { success: false, error: getErrorMessage(error, 'Failed to create pairing') }
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

        await logAuditAction(
            adminUser.id,
            'DELETE',
            'PAIRING',
            pairingId,
            'Deleted pairing',
            undefined,
            adminUser.email
        )

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

        // Add to family
        await adminDb.collection('families').doc(data.familyId).update({
            memberIds: FieldValue.arrayUnion(menteeId),
            updatedAt: Timestamp.now()
        })

        revalidatePath('/admin/pairings')
        revalidatePath('/admin/families')

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

        // Remove from family
        await adminDb.collection('families').doc(data.familyId).update({
            memberIds: FieldValue.arrayRemove(menteeId),
            updatedAt: Timestamp.now()
        })

        revalidatePath('/admin/pairings')
        revalidatePath('/admin/families')

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
        const updates: PairingUpdateData = { updatedAt: Timestamp.now() }

        const currentFamilyId = currentData.familyId
        const newFamilyId = data.familyId || currentFamilyId
        const familyChanged = newFamilyId !== currentFamilyId

        const currentMentorId = currentData.mentorId
        const newMentorId = data.mentorId || currentMentorId

        const currentMenteeIds = currentData.menteeIds
        const newMenteeIds = data.menteeIds || currentMenteeIds

        const validationError = await validatePairingParticipants(newMentorId, newMenteeIds)
        if (validationError) {
            return { success: false, error: validationError }
        }

        // Prepare updates
        if (data.familyId) updates.familyId = data.familyId
        if (data.mentorId) updates.mentorId = data.mentorId
        if (data.menteeIds) updates.menteeIds = data.menteeIds

        await pairingRef.update(updates)

        const allOldMembers = [currentMentorId, ...currentMenteeIds]
        const allNewMembers = [newMentorId, ...newMenteeIds]

        if (familyChanged) {
            // 1. Remove ALL old members from OLD family
            if (allOldMembers.length > 0) {
                await adminDb.collection('families').doc(currentFamilyId).update({
                    memberIds: FieldValue.arrayRemove(...allOldMembers),
                    updatedAt: Timestamp.now()
                })
            }

            // 2. Add ALL new members to NEW family
            if (allNewMembers.length > 0) {
                await adminDb.collection('families').doc(newFamilyId).update({
                    memberIds: FieldValue.arrayUnion(...allNewMembers),
                    updatedAt: Timestamp.now()
                })
            }

            // 3. Update User Docs
            const removedFromPairing = allOldMembers.filter(id => !allNewMembers.includes(id))

            for (const uid of allNewMembers) {
                await adminDb.collection('users').doc(uid).update({ familyId: newFamilyId })
            }
            for (const uid of removedFromPairing) {
                await adminDb.collection('users').doc(uid).update({ familyId: null })
            }

        } else {
            // Family is same. Sync changes.
            const addedToPairing = allNewMembers.filter(id => !allOldMembers.includes(id))
            const removedFromPairing = allOldMembers.filter(id => !allNewMembers.includes(id))

            if (addedToPairing.length > 0) {
                await adminDb.collection('families').doc(newFamilyId).update({
                    memberIds: FieldValue.arrayUnion(...addedToPairing),
                    updatedAt: Timestamp.now()
                })
                for (const uid of addedToPairing) {
                    await adminDb.collection('users').doc(uid).update({ familyId: newFamilyId })
                }
            }

            if (removedFromPairing.length > 0) {
                await adminDb.collection('families').doc(newFamilyId).update({
                    memberIds: FieldValue.arrayRemove(...removedFromPairing),
                    updatedAt: Timestamp.now()
                })
                for (const uid of removedFromPairing) {
                    await adminDb.collection('users').doc(uid).update({ familyId: null })
                }
            }
        }

        // Log audit
        // Log audit
        await logAuditAction(
            adminUser.id,
            'UPDATE',
            'PAIRING',
            pairingId,
            'Updated pairing',
            updates,
            adminUser.email
        )

        revalidatePath('/admin/pairings')
        revalidatePath('/admin/families')
        return { success: true, pairingId }

    } catch (error: unknown) {
        console.error('Update pairing error:', error)
        return { success: false, error: getErrorMessage(error, 'Failed to update pairing') }
    }
}
