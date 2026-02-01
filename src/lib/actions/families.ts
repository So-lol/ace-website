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

        // Collect all user IDs we need to fetch
        const userIds = new Set<string>()
        snapshot.docs.forEach(doc => {
            const data = doc.data()
            if (data.familyHeadId) userIds.add(data.familyHeadId)
            if (data.auntUncleIds) data.auntUncleIds.forEach((id: string) => userIds.add(id))
        })

        // Fetch all users in one batch (if any)
        const userMap = new Map<string, string>()
        if (userIds.size > 0) {
            const userIdsArray = Array.from(userIds)
            // Firestore 'in' query supports up to 30 items
            const chunks = []
            for (let i = 0; i < userIdsArray.length; i += 30) {
                chunks.push(userIdsArray.slice(i, i + 30))
            }
            for (const chunk of chunks) {
                const usersSnap = await adminDb.collection('users')
                    .where('uid', 'in', chunk)
                    .get()
                usersSnap.docs.forEach(doc => {
                    const userData = doc.data()
                    userMap.set(doc.id, userData.name || 'Unknown')
                })
            }
        }

        const families = snapshot.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                name: data.name,
                isArchived: data.isArchived || false,
                memberIds: data.memberIds || [],
                memberCount: data.memberIds?.length || 0,
                familyHeadId: data.familyHeadId || null,
                familyHeadName: data.familyHeadId ? userMap.get(data.familyHeadId) || null : null,
                auntUncleIds: data.auntUncleIds || [],
                auntUncleNames: (data.auntUncleIds || []).map((id: string) => userMap.get(id) || 'Unknown'),
                createdAt: data.createdAt?.toDate?.() || new Date(),
                updatedAt: data.updatedAt?.toDate?.() || new Date()
            }
        })

        return families
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
