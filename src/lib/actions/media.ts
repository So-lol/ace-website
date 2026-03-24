'use server'

import { adminDb, adminStorage, deleteFile, getFileReadUrl } from '@/lib/firebase-admin'
import { requireAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import { FieldValue } from 'firebase-admin/firestore'
import { SubmissionDoc, SubmissionStatus } from '@/types/firestore'
import { logAuditAction } from '@/lib/actions/audit'
import { getErrorMessage } from '@/lib/errors'
import {
    buildMediaReconciliationReport,
    MediaReconciliationIssue,
    MediaReconciliationReport,
} from '@/lib/media-reconciliation-utils'
import {
    buildMediaExportFileName,
    describeMediaSyncScope,
    mediaMatchesSyncScope,
    type MediaSyncCandidate,
    type MediaSyncScope,
} from '@/lib/media-distribution-utils'

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

export interface MediaStorageLinkExportSummary {
    totalCandidates: number
    exported: number
    failed: number
    expiresAt: string
}

export interface MediaStorageLinkExportResult {
    success: boolean
    partialFailure?: boolean
    error?: string
    data?: string
    fileName?: string
    scope?: MediaSyncScope
    summary?: MediaStorageLinkExportSummary
}

const MEDIA_STORAGE_LINK_EXPORT_TTL_MS = 1000 * 60 * 60 * 24 * 7

function escapeCsvValue(value: unknown) {
    const stringValue = String(value ?? '')
    return `"${stringValue.replace(/"/g, '""')}"`
}

function formatCsvLine(values: unknown[]) {
    return values.map(escapeCsvValue).join(',')
}

async function getMediaSyncCandidates(scope: MediaSyncScope): Promise<MediaSyncCandidate[]> {
    const [submissionsSnapshot, usersSnapshot] = await Promise.all([
        adminDb.collection('submissions').orderBy('createdAt', 'desc').get(),
        adminDb.collection('users').get(),
    ])

    const userNames = new Map<string, string>()
    usersSnapshot.forEach((doc) => {
        const data = doc.data()
        userNames.set(doc.id, String(data.name || 'Unknown'))
    })

    return submissionsSnapshot.docs
        .map((doc) => {
            const data = doc.data() as SubmissionDoc

            if ((data.uploadState || 'UPLOADED') !== 'UPLOADED') {
                return null
            }

            const candidate: MediaSyncCandidate = {
                id: doc.id,
                submitterName: userNames.get(data.submitterId) || 'Unknown',
                weekNumber: data.weekNumber,
                year: data.year,
                status: data.status,
                imagePath: data.imagePath,
                isArchived: data.isArchived || false,
            }

            return mediaMatchesSyncScope(candidate, scope) ? candidate : null
        })
        .filter((item): item is MediaSyncCandidate => item !== null)
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

export async function exportMediaStorageLinks(scope: MediaSyncScope): Promise<MediaStorageLinkExportResult> {
    try {
        const adminUser = await requireAdmin()
        const candidates = await getMediaSyncCandidates(scope)
        const expiresAt = new Date(Date.now() + MEDIA_STORAGE_LINK_EXPORT_TTL_MS).toISOString()

        const rows = await Promise.all(candidates.map(async (item) => {
            try {
                const signedUrl = await getFileReadUrl(item.imagePath, MEDIA_STORAGE_LINK_EXPORT_TTL_MS)

                return {
                    item,
                    fileName: buildMediaExportFileName(item),
                    signedUrl,
                    error: '',
                }
            } catch (error) {
                return {
                    item,
                    fileName: buildMediaExportFileName(item),
                    signedUrl: '',
                    error: getErrorMessage(error, 'Failed to generate Firebase Storage link'),
                }
            }
        }))

        const exported = rows.filter((row) => row.signedUrl).length
        const failed = rows.length - exported
        const summary = {
            totalCandidates: candidates.length,
            exported,
            failed,
            expiresAt,
        }

        await logAuditAction(
            adminUser.id,
            'MEDIA_EXPORTED_STORAGE_LINKS',
            'SUBMISSION',
            scope,
            failed > 0
                ? `Exported Firebase Storage links with ${failed} failure(s) for ${describeMediaSyncScope(scope)}.`
                : `Exported Firebase Storage links for ${describeMediaSyncScope(scope)}.`,
            {
                actorName: adminUser.name,
                scope,
                scopeLabel: describeMediaSyncScope(scope),
                summary,
            },
            adminUser.email
        )

        if (exported === 0 && candidates.length > 0) {
            return {
                success: false,
                error: 'Failed to generate Firebase Storage links for every selected submission.',
                partialFailure: true,
                scope,
                summary,
            }
        }

        const lines = [
            'submission_id,export_file_name,submitter_name,week_number,year,status,is_archived,image_path,signed_url,expires_at,error',
            ...rows.map((row) => formatCsvLine([
                row.item.id,
                row.fileName,
                row.item.submitterName,
                row.item.weekNumber,
                row.item.year,
                row.item.status,
                row.item.isArchived ? '1' : '0',
                row.item.imagePath,
                row.signedUrl,
                row.signedUrl ? expiresAt : '',
                row.error,
            ])),
        ]

        return {
            success: true,
            partialFailure: failed > 0,
            data: lines.join('\n'),
            fileName: `ace-media-storage-links-${scope}-${new Date().toISOString().slice(0, 10)}.csv`,
            scope,
            summary,
        }
    } catch (error) {
        console.error('Error exporting Firebase Storage links:', error)
        return {
            success: false,
            error: 'Failed to export Firebase Storage links',
        }
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
