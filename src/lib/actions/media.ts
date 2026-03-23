'use server'

import { adminDb, adminStorage, deleteFile, getFileReadUrl } from '@/lib/firebase-admin'
import { requireAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import { FieldValue } from 'firebase-admin/firestore'
import { SubmissionDoc, SubmissionStatus } from '@/types/firestore'
import { logAuditAction } from '@/lib/actions/audit'
import {
    buildMediaReconciliationReport,
    MediaReconciliationIssue,
    MediaReconciliationReport,
} from '@/lib/media-reconciliation-utils'

type MediaFilter = 'all' | 'active' | 'archived'

export interface MediaLibraryItem {
    id: string
    imageUrl: string
    imagePath: string
    status: SubmissionStatus
    submitterId: string
    submitterName: string
    weekNumber: number
    year: number
    totalPoints: number
    isArchived: boolean
    createdAt: Date
    archivedAt: Date | null
    daysSinceCreated: number
    daysSinceArchived: number | null
    eligibleForDeletion: boolean
}

export interface MediaLibraryStats {
    total: number
    active: number
    archived: number
    eligibleForDeletion: number
}

export interface MediaStorageAuditReport extends MediaReconciliationReport {
    auditedAt: string
}

export async function getMediaLibrary(filter: MediaFilter = 'all'): Promise<MediaLibraryItem[]> {
    try {
        await requireAdmin()

        const query = adminDb.collection('submissions').orderBy('createdAt', 'desc')

        const snapshot = await query.get()

        const media: Array<MediaLibraryItem | null> = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data() as SubmissionDoc

            if ((data.uploadState || 'UPLOADED') !== 'UPLOADED') return null

            // Apply filter
            if (filter === 'active' && data.isArchived) return null
            if (filter === 'archived' && !data.isArchived) return null

            // Fetch submitter name
            const submitterSnap = await adminDb.collection('users').doc(data.submitterId).get()
            const submitterName = submitterSnap.exists
                ? String(submitterSnap.data()?.name || 'Unknown')
                : 'Unknown'

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

        const filteredMedia = media.filter((item): item is MediaLibraryItem => item !== null)

        return await Promise.all(filteredMedia.map(async (item) => ({
            ...item,
            imageUrl: await getFileReadUrl(item.imagePath),
        })))
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
        await logAuditAction(
            user.id,
            'MEDIA_ARCHIVED',
            'SUBMISSION',
            submissionId,
            reason || 'Media archived by admin',
            { actorName: user.name },
            user.email
        )

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
        await logAuditAction(
            user.id,
            'MEDIA_RESTORED',
            'SUBMISSION',
            submissionId,
            'Media restored from archive',
            { actorName: user.name },
            user.email
        )

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
        await logAuditAction(
            user.id,
            'MEDIA_DELETED',
            'SUBMISSION',
            submissionId,
            'Media permanently deleted after retention period',
            {
                actorName: user.name,
                deletedImagePath: data.imagePath
            },
            user.email
        )

        revalidatePath('/admin/media')
        return { success: true }
    } catch (error) {
        console.error('Error deleting media:', error)
        return { success: false, error: 'Failed to delete media' }
    }
}

export async function getMediaStats(): Promise<MediaLibraryStats> {
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

function formatIssueDetails(issue: MediaReconciliationIssue) {
    switch (issue.code) {
        case 'MISSING_IMAGE_PATH':
            return `Submission ${issue.submissionId} is marked uploaded but has no storage path.`
        case 'MISSING_STORAGE_OBJECT':
            return `Submission ${issue.submissionId} references missing file ${issue.imagePath}.`
        case 'FAILED_UPLOAD':
            return `Submission ${issue.submissionId} is marked as a failed upload.`
        case 'STUCK_UPLOADING':
            return `Submission ${issue.submissionId} has been uploading for ${issue.ageMinutes ?? 'unknown'} minutes.`
        case 'FILE_PRESENT_FOR_INCOMPLETE_UPLOAD':
            return `Submission ${issue.submissionId} has a file in storage but is not marked uploaded.`
        case 'ORPHANED_STORAGE_OBJECT':
            return `Storage object ${issue.imagePath} has no matching submission record.`
    }
}

export async function reconcileMediaStorage(): Promise<{ success: true; report: MediaStorageAuditReport } | { success: false; error: string }> {
    try {
        const adminUser = await requireAdmin()
        const snapshot = await adminDb.collection('submissions').get()
        const bucket = adminStorage.bucket()
        const [files] = await bucket.getFiles({ prefix: 'submissions/' })

        const report = buildMediaReconciliationReport(
            snapshot.docs.map((doc) => {
                const data = doc.data() as SubmissionDoc
                return {
                    id: doc.id,
                    imagePath: data.imagePath,
                    uploadState: data.uploadState || 'UPLOADED',
                    createdAt: data.createdAt?.toDate?.() || null,
                }
            }),
            files.map((file) => file.name),
            new Date()
        )

        const auditedAt = new Date().toISOString()

        await logAuditAction(
            adminUser.id,
            'MEDIA_STORAGE_RECONCILED',
            'SUBMISSION',
            'media-library',
            report.issueCount === 0
                ? `Media reconciliation passed across ${report.scannedSubmissions} submissions.`
                : `Media reconciliation found ${report.issueCount} issues across ${report.scannedSubmissions} submissions.`,
            {
                actorName: adminUser.name,
                auditedAt,
                summary: {
                    scannedSubmissions: report.scannedSubmissions,
                    uploadedSubmissions: report.uploadedSubmissions,
                    healthySubmissions: report.healthySubmissions,
                    issueCount: report.issueCount,
                    missingFiles: report.missingFiles,
                    failedUploads: report.failedUploads,
                    stuckUploads: report.stuckUploads,
                    inconsistentStates: report.inconsistentStates,
                    orphanedFiles: report.orphanedFiles,
                },
                issues: report.issues.slice(0, 25).map((issue) => ({
                    ...issue,
                    details: formatIssueDetails(issue),
                })),
            },
            adminUser.email
        )

        revalidatePath('/admin/media')

        return {
            success: true,
            report: {
                ...report,
                auditedAt,
            },
        }
    } catch (error) {
        console.error('Error reconciling media storage:', error)
        return { success: false, error: 'Failed to reconcile media storage' }
    }
}
