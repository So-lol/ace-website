'use server'

import { adminDb } from '@/lib/firebase-admin'
import { BonusActivityDoc } from '@/types/firestore'
import { Timestamp } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-helpers'
import { logAuditAction } from '@/lib/actions/audit'

export async function getBonusActivities(activeOnly = false) {
    try {
        let query = adminDb.collection('bonusActivities').orderBy('createdAt', 'desc')

        if (activeOnly) {
            query = query.where('isActive', '==', true) as any
        }

        const snapshot = await query.get()
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as BonusActivityDoc[]
    } catch (error) {
        console.error('Error fetching bonus activities:', error)
        return []
    }
}

export async function createBonusActivity(data: { name: string; description: string; points: number }) {
    try {
        const admin = await requireAdmin()

        const docRef = adminDb.collection('bonusActivities').doc()
        await docRef.set({
            name: data.name,
            description: data.description,
            points: data.points,
            isActive: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        })

        revalidatePath('/admin/bonuses')
        revalidatePath('/dashboard/submit')

        await logAuditAction(
            admin.id,
            'CREATE',
            'BONUS',
            docRef.id,
            `Created bonus: ${data.name}`,
            undefined,
            admin.email
        )

        return { success: true, id: docRef.id }
    } catch (error) {
        console.error('Error creating bonus activity:', error)
        return { success: false, error: 'Failed to create bonus activity' }
    }
}

export async function updateBonusActivity(id: string, data: Partial<BonusActivityDoc>) {
    try {
        const admin = await requireAdmin()

        await adminDb.collection('bonusActivities').doc(id).update({
            ...data,
            updatedAt: Timestamp.now(),
        })

        revalidatePath('/admin/bonuses')
        revalidatePath('/dashboard/submit')

        await logAuditAction(
            admin.id,
            'UPDATE',
            'BONUS',
            id,
            `Updated bonus activity`,
            undefined,
            admin.email
        )

        return { success: true }
    } catch (error) {
        console.error('Error updating bonus activity:', error)
        return { success: false, error: 'Failed to update bonus activity' }
    }
}

export async function deleteBonusActivity(id: string) {
    try {
        const admin = await requireAdmin()

        await adminDb.collection('bonusActivities').doc(id).delete()

        revalidatePath('/admin/bonuses')
        revalidatePath('/dashboard/submit')

        await logAuditAction(
            admin.id,
            'DELETE',
            'BONUS',
            id,
            `Deleted bonus activity`,
            undefined,
            admin.email
        )

        return { success: true }
    } catch (error) {
        console.error('Error deleting bonus activity:', error)
        return { success: false, error: 'Failed to delete bonus activity' }
    }
}
