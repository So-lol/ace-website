'use server'

import { adminDb } from '@/lib/firebase-admin'
import { requireAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import { Timestamp } from 'firebase-admin/firestore'
import { FamilyDoc } from '@/types/firestore'

/**
 * Get all families (admin)
 */
export async function getFamilies(includeArchived = false) {
    try {
        let query = adminDb.collection('families').orderBy('createdAt', 'desc')
        if (!includeArchived) {
            query = query.where('isArchived', '==', false)
        }

        const snapshot = await query.get()
        const families = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as (FamilyDoc & { id: string })[]

        // Calculate member and pairing counts (if not stored)
        // Ideally these should be stored on the doc, but we can count here or update the doc
        // For now, return as is. The client list expects memberIds.length

        return families.map(f => ({
            ...f,
            memberCount: f.memberIds?.length || 0,
            // pairingCount needs fetching pairings, maybe expensive for list
            // We can fetch pairings separately or store count on family doc
        }))
    } catch (error) {
        console.error('Error fetching families:', error)
        return []
    }
}

/**
 * Create a new family
 */
export async function createFamily(data: { name: string }) {
    try {
        await requireAdmin()

        const newFamily: Omit<FamilyDoc, 'id'> = {
            name: data.name,
            isArchived: false,
            memberIds: [],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        }

        const ref = await adminDb.collection('families').add(newFamily)
        revalidatePath('/admin/families')
        revalidatePath('/leaderboard')

        return { success: true, familyId: ref.id }
    } catch (error: any) {
        console.error('Error creating family:', error)
        return { success: false, error: error.message || 'Failed to create family' }
    }
}

/**
 * Update a family
 */
export async function updateFamily(familyId: string, data: Partial<FamilyDoc>) {
    try {
        await requireAdmin()

        await adminDb.collection('families').doc(familyId).update({
            ...data,
            updatedAt: Timestamp.now()
        })

        revalidatePath('/admin/families')
        revalidatePath('/leaderboard')

        return { success: true }
    } catch (error: any) {
        console.error('Error updating family:', error)
        return { success: false, error: error.message || 'Failed to update family' }
    }
}

/**
 * Delete a family
 */
export async function deleteFamily(familyId: string) {
    try {
        await requireAdmin()

        // Check if family has members or pairings before deleting?
        // For now, allow deletion (soft delete via archive preferred)
        await adminDb.collection('families').doc(familyId).delete()

        revalidatePath('/admin/families')
        revalidatePath('/leaderboard')

        return { success: true }
    } catch (error: any) {
        console.error('Error deleting family:', error)
        return { success: false, error: error.message || 'Failed to delete family' }
    }
}
