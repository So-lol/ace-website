'use server'

import { adminDb } from '@/lib/firebase-admin'
import { AnnouncementDoc } from '@/types/firestore'
import { Timestamp } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'
import { logAuditAction } from '@/lib/actions/audit'
import { getAuthenticatedUser, requireAdmin } from '@/lib/auth-helpers'

export async function getAnnouncements(publishedOnly = false) {
    try {
        let query = adminDb.collection('announcements').orderBy('createdAt', 'desc')

        if (publishedOnly) {
            query = query.where('isPublished', '==', true) as any
        }

        const snapshot = await query.get()
        let announcements = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as AnnouncementDoc[]

        if (publishedOnly) {
            const now = new Date()
            announcements = announcements.filter(a => {
                const pDate = a.publishedAt?.toDate ? a.publishedAt.toDate() : (a.publishedAt as any instanceof Date ? a.publishedAt : null)
                return pDate && pDate <= now
            })
        }

        return announcements
    } catch (error) {
        console.error('Error fetching announcements:', error)
        return []
    }
}

export async function createAnnouncement(data: { title: string; content: string; authorId: string; authorName: string; isPublished: boolean; isPinned: boolean; publishedAt?: Date | null }) {
    try {
        const admin = await requireAdmin()

        const docRef = adminDb.collection('announcements').doc()

        // Ensure author is the admin creating it (or allow overriding if needed, but safer to force)
        // For now, trust the data passed but we verified admin access.

        let publishedAt = null
        if (data.isPublished) {
            publishedAt = data.publishedAt ? Timestamp.fromDate(data.publishedAt) : Timestamp.now()
        }

        await docRef.set({
            ...data,
            publishedAt,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        })

        revalidatePath('/admin/announcements')
        revalidatePath('/announcements')
        revalidatePath('/')

        await logAuditAction(
            admin.id,
            'CREATE',
            'ANNOUNCEMENT',
            docRef.id,
            `Created announcement: ${data.title}`,
            undefined,
            admin.email
        )

        return { success: true, id: docRef.id }
    } catch (error) {
        console.error('Error creating announcement:', error)
        return { success: false, error: 'Failed to create announcement' }
    }
}

export async function updateAnnouncement(id: string, data: Omit<Partial<AnnouncementDoc>, 'publishedAt'> & { publishedAt?: Date | null }) {
    try {
        const admin = await requireAdmin()

        const updateData: any = {
            ...data,
            updatedAt: Timestamp.now(),
        }

        if (data.isPublished === true) {
            // If explicit date provided, use it
            if (data.publishedAt) {
                updateData.publishedAt = Timestamp.fromDate(data.publishedAt)
            }
            // Else if no date exists on doc (first publish), set to now
            else {
                const doc = await adminDb.collection('announcements').doc(id).get()
                const currentData = doc.data() as AnnouncementDoc
                if (!currentData.publishedAt) {
                    updateData.publishedAt = Timestamp.now()
                }
            }
        } else if (data.isPublished === false) {
            updateData.publishedAt = null
        }

        await adminDb.collection('announcements').doc(id).update(updateData)

        revalidatePath('/admin/announcements')
        revalidatePath('/announcements')
        revalidatePath('/')

        await logAuditAction(
            admin.id,
            'UPDATE',
            'ANNOUNCEMENT',
            id,
            `Updated announcement`,
            undefined,
            admin.email
        )

        return { success: true }
    } catch (error) {
        console.error('Error updating announcement:', error)
        return { success: false, error: 'Failed to update announcement' }
    }
}

export async function deleteAnnouncement(id: string) {
    try {
        const admin = await requireAdmin()

        await adminDb.collection('announcements').doc(id).delete()

        revalidatePath('/admin/announcements')
        revalidatePath('/announcements')
        revalidatePath('/')

        await logAuditAction(
            admin.id,
            'DELETE',
            'ANNOUNCEMENT',
            id,
            `Deleted announcement`,
            undefined,
            admin.email
        )

        return { success: true }
    } catch (error) {
        console.error('Error deleting announcement:', error)
        return { success: false, error: 'Failed to delete announcement' }
    }
}
