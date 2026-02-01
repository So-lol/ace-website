'use server'

import { adminDb, deleteFile } from '@/lib/firebase-admin'
import { requireAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { SubmissionDoc } from '@/types/firestore'

type MediaFilter = 'all' | 'active' | 'archived'

export async function getMediaLibrary(filter: MediaFilter = 'all') {
    try {
        await requireAdmin()

        let query = adminDb.collection('submissions').orderBy('createdAt', 'desc')

        const snapshot = await query.get()

        const media = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data() as SubmissionDoc

            // Apply filter
            if (filter === 'active' && data.isArchived) return null
            if (filter === 'archived' && !data.isArchived) return null

            // Fetch submitter name
            const submitterSnap = await adminDb.collection('users').doc(data.submitterId).get()
            const submitterName = submitterSnap.exists ? submitterSnap.data()?.name : 'Unknown'

            // Calculate retention status
            const createdDate = data.createdAt?.toDate() || new Date()
            const archivedDate = data.archivedAt?.toDate()
            const now = new Date()
            const daysSinceCreated = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
            const daysSinceArchived = archivedDate
                ? Math.floor((now.getTime() - archivedDate.getTime()) / (1000 * 60 * 60 * 24))
                : null

            return {
                id: doc.id,
                imageUrl: data.imageUrl,
                imagePath: data.imagePath,
                status: data.status,
                submitterId: data.submitterId,
                submitterName,
                weekNumber: data.weekNumber,
                year: data.year,
                totalPoints: data.totalPoints,
                isArchived: data.isArchived || false,
                createdAt: createdDate,
                archivedAt: archivedDate || null,
                daysSinceCreated,
                daysSinceArchived,
                eligibleForDeletion: daysSinceArchived !== null && daysSinceArchived >= 30
            }
        }))

        return media.filter(Boolean)
    } catch (error) {
        console.error('Error fetching media library:', error)
        return []
    }
}

export async function archiveMedia(submissionId: string, reason?: string) {
    try {
        const user = await requireAdmin()

        const submissionRef = adminDb.collection('submissions').doc(submissionId)
        const submissionSnap = await submissionRef.get()

        if (!submissionSnap.exists) {
            return { success: false, error: 'Submission not found' }
        }

        await submissionRef.update({
            isArchived: true,
            archivedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        })

        // Audit log
        await adminDb.collection('auditLogs').add({
            action: 'MEDIA_ARCHIVED',
            targetType: 'submission',
            targetId: submissionId,
            actorId: user.id,
            details: reason || 'Media archived by admin',
            timestamp: FieldValue.serverTimestamp(),
            metadata: { actorName: user.name }
        })

        revalidatePath('/admin/media')
        return { success: true }
    } catch (error) {
        console.error('Error archiving media:', error)
        return { success: false, error: 'Failed to archive media' }
    }
}

export async function restoreMedia(submissionId: string) {
    try {
        const user = await requireAdmin()

        const submissionRef = adminDb.collection('submissions').doc(submissionId)
        const submissionSnap = await submissionRef.get()

        if (!submissionSnap.exists) {
            return { success: false, error: 'Submission not found' }
        }

        await submissionRef.update({
            isArchived: false,
            archivedAt: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp()
        })

        // Audit log
        await adminDb.collection('auditLogs').add({
            action: 'MEDIA_RESTORED',
            targetType: 'submission',
            targetId: submissionId,
            actorId: user.id,
            details: 'Media restored from archive',
            timestamp: FieldValue.serverTimestamp(),
            metadata: { actorName: user.name }
        })

        revalidatePath('/admin/media')
        return { success: true }
    } catch (error) {
        console.error('Error restoring media:', error)
        return { success: false, error: 'Failed to restore media' }
    }
}

export async function deleteArchivedMedia(submissionId: string) {
    try {
        const user = await requireAdmin()

        const submissionRef = adminDb.collection('submissions').doc(submissionId)
        const submissionSnap = await submissionRef.get()

        if (!submissionSnap.exists) {
            return { success: false, error: 'Submission not found' }
        }

        const data = submissionSnap.data() as SubmissionDoc

        if (!data.isArchived) {
            return { success: false, error: 'Only archived media can be permanently deleted' }
        }

        // Check retention policy (30 days minimum)
        const archivedDate = data.archivedAt?.toDate()
        if (archivedDate) {
            const daysSinceArchived = Math.floor((Date.now() - archivedDate.getTime()) / (1000 * 60 * 60 * 24))
            if (daysSinceArchived < 30) {
                return { success: false, error: `Media must be archived for 30 days before deletion. ${30 - daysSinceArchived} days remaining.` }
            }
        }

        // Delete from Storage
        if (data.imagePath) {
            try {
                await deleteFile(data.imagePath)
            } catch (e) {
                console.error('Failed to delete file from storage:', e)
            }
        }

        // Delete submission document
        await submissionRef.delete()

        // Audit log
        await adminDb.collection('auditLogs').add({
            action: 'MEDIA_DELETED',
            targetType: 'submission',
            targetId: submissionId,
            actorId: user.id,
            details: 'Media permanently deleted after retention period',
            timestamp: FieldValue.serverTimestamp(),
            metadata: {
                actorName: user.name,
                deletedImagePath: data.imagePath
            }
        })

        revalidatePath('/admin/media')
        return { success: true }
    } catch (error) {
        console.error('Error deleting media:', error)
        return { success: false, error: 'Failed to delete media' }
    }
}

export async function getMediaStats() {
    try {
        await requireAdmin()

        const snapshot = await adminDb.collection('submissions').get()

        let total = 0
        let active = 0
        let archived = 0
        let eligibleForDeletion = 0

        snapshot.docs.forEach(doc => {
            const data = doc.data()
            total++

            if (data.isArchived) {
                archived++
                const archivedDate = data.archivedAt?.toDate()
                if (archivedDate) {
                    const daysSince = Math.floor((Date.now() - archivedDate.getTime()) / (1000 * 60 * 60 * 24))
                    if (daysSince >= 30) eligibleForDeletion++
                }
            } else {
                active++
            }
        })

        return { total, active, archived, eligibleForDeletion }
    } catch (error) {
        console.error('Error fetching media stats:', error)
        return { total: 0, active: 0, archived: 0, eligibleForDeletion: 0 }
    }
}
