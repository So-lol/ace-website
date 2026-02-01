'use server'

import { adminDb } from '@/lib/firebase-admin'
import { requireAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import { Timestamp } from 'firebase-admin/firestore'
import { FamilyDoc } from '@/types/firestore'
import { logAuditAction } from '@/lib/actions/audit'

/**
 * Get all families (admin)
 */
export async function getFamilies(includeArchived = false) {
    try {
        let query = adminDb.collection('families').orderBy('createdAt', 'desc')
        if (!includeArchived) {
            query = query.where('isArchived', '==', false)
        }

        const [snapshot, pairingsSnap] = await Promise.all([
            query.get(),
            adminDb.collection('pairings').select('familyId', 'mentorId', 'menteeIds').get()
        ])

        // Map pairing members to families
        const pairingMembersByFamily = new Map<string, string[]>()
        pairingsSnap.forEach(doc => {
            const p = doc.data()
            if (!p.familyId) return
            const list = pairingMembersByFamily.get(p.familyId) || []
            if (p.mentorId) list.push(p.mentorId)
            if (p.menteeIds && Array.isArray(p.menteeIds)) list.push(...p.menteeIds)
            pairingMembersByFamily.set(p.familyId, list)
        })

        // Collect all user IDs we need to fetch
        const userIds = new Set<string>()
        snapshot.docs.forEach(doc => {
            const data = doc.data()
            if (data.familyHeadId) userIds.add(data.familyHeadId)
            if (data.familyHeadIds) data.familyHeadIds.forEach((id: string) => userIds.add(id))
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

            // Handle legacy familyHeadId
            let heads: string[] = data.familyHeadIds || []
            if (data.familyHeadId && !heads.includes(data.familyHeadId)) {
                heads = [data.familyHeadId, ...heads]
            }

            // Calculate members from pairings + heads + aunts
            const pMembers = pairingMembersByFamily.get(doc.id) || []
            const uniqueMembers = new Set([
                ...pMembers,
                ...heads,
                ...(data.auntUncleIds || [])
            ])

            return {
                id: doc.id,
                name: data.name,
                isArchived: data.isArchived || false,
                memberIds: Array.from(uniqueMembers), // Return actual calculated list
                memberCount: uniqueMembers.size,
                familyHeadIds: heads,
                familyHeadNames: heads.map(id => userMap.get(id) || 'Unknown'),
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
        const admin = await requireAdmin()

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

        revalidatePath('/leaderboard')

        await logAuditAction(
            admin.id,
            'CREATE',
            'FAMILY',
            ref.id,
            `Created family ${data.name}`,
            undefined,
            admin.email
        )

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
        const admin = await requireAdmin()

        const updates: any = {
            ...data,
            updatedAt: Timestamp.now()
        }

        // Clear legacy familyHeadId if we are updating roles to prevent zombies
        if (data.familyHeadIds) {
            updates.familyHeadId = null
        }

        await adminDb.collection('families').doc(familyId).update(updates)

        revalidatePath('/admin/families')
        revalidatePath('/leaderboard')

        await logAuditAction(
            admin.id,
            'UPDATE',
            'FAMILY',
            familyId,
            `Updated family`,
            undefined,
            admin.email
        )

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
        const admin = await requireAdmin()

        // Check if family has members or pairings before deleting?
        // For now, allow deletion (soft delete via archive preferred)
        await adminDb.collection('families').doc(familyId).delete()

        revalidatePath('/admin/families')
        revalidatePath('/leaderboard')

        await logAuditAction(
            admin.id,
            'DELETE',
            'FAMILY',
            familyId,
            `Deleted family`,
            undefined,
            admin.email
        )

        return { success: true }
    } catch (error: any) {
        console.error('Error deleting family:', error)
        return { success: false, error: error.message || 'Failed to delete family' }
    }
}
