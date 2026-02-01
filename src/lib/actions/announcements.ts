'use server'

import { adminDb } from '@/lib/firebase-admin'
import { AnnouncementDoc } from '@/types/firestore'
import { Timestamp } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'

export async function getAnnouncements(publishedOnly = false) {
    try {
        let query = adminDb.collection('announcements').orderBy('createdAt', 'desc')

        if (publishedOnly) {
            query = query.where('isPublished', '==', true) as any
        }

        const snapshot = await query.get()
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as AnnouncementDoc[]
    } catch (error) {
        console.error('Error fetching announcements:', error)
        return []
    }
}

export async function createAnnouncement(data: { title: string; content: string; authorId: string; authorName: string; isPublished: boolean; isPinned: boolean }) {
    try {
        const docRef = adminDb.collection('announcements').doc()
        await docRef.set({
            ...data,
            publishedAt: data.isPublished ? Timestamp.now() : null,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        })

        revalidatePath('/admin/announcements')
        revalidatePath('/announcements')
        revalidatePath('/')
        return { success: true, id: docRef.id }
    } catch (error) {
        console.error('Error creating announcement:', error)
        return { success: false, error: 'Failed to create announcement' }
    }
}

export async function updateAnnouncement(id: string, data: Partial<AnnouncementDoc>) {
    try {
        const updateData: any = {
            ...data,
            updatedAt: Timestamp.now(),
        }

        if (data.isPublished === true) {
            // Check if it was already published to avoid overwriting original publish date
            const doc = await adminDb.collection('announcements').doc(id).get()
            const currentData = doc.data() as AnnouncementDoc
            if (!currentData.publishedAt) {
                updateData.publishedAt = Timestamp.now()
            }
        } else if (data.isPublished === false) {
            updateData.publishedAt = null
        }

        await adminDb.collection('announcements').doc(id).update(updateData)

        revalidatePath('/admin/announcements')
        revalidatePath('/announcements')
        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error('Error updating announcement:', error)
        return { success: false, error: 'Failed to update announcement' }
    }
}

export async function deleteAnnouncement(id: string) {
    try {
        await adminDb.collection('announcements').doc(id).delete()

        revalidatePath('/admin/announcements')
        revalidatePath('/announcements')
        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error('Error deleting announcement:', error)
        return { success: false, error: 'Failed to delete announcement' }
    }
}
