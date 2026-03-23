'use server'

import { adminDb, adminStorage, deleteFile, getFileReadUrl } from '@/lib/firebase-admin'
import { requireAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import { FieldValue } from 'firebase-admin/firestore'
import { SubmissionDoc, SubmissionStatus } from '@/types/firestore'
import { logAuditAction } from '@/lib/actions/audit'
import { getErrorMessage } from '@/lib/errors'
import {
    getGoogleDriveFolderSummary,
    getGoogleDriveMediaDestination,
    listGoogleDriveFolderFiles,
    updateGoogleDriveFileMetadata,
    uploadGoogleDriveFile,
    type GoogleDriveFileSummary,
    type GoogleDriveMediaDestination,
} from '@/lib/google-drive'
import {
    buildMediaReconciliationReport,
    MediaReconciliationIssue,
    MediaReconciliationReport,
} from '@/lib/media-reconciliation-utils'
import {
    buildMediaDriveFileName,
    describeMediaSyncScope,
    inferMediaMimeType,
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

export interface MediaDistributionOverview {
    googleDrive: GoogleDriveMediaDestination
}

export interface MediaGoogleDriveSyncSummary {
    totalCandidates: number
    created: number
    updated: number
    skipped: number
    failed: number
}

export interface MediaGoogleDriveSyncResult {
    success: boolean
    partialFailure?: boolean
    error?: string
    scope?: MediaSyncScope
    folderName?: string | null
    folderUrl?: string | null
    serviceAccountEmail?: string | null
    summary?: MediaGoogleDriveSyncSummary
    failures?: Array<{
        submissionId: string
        fileName: string
        error: string
    }>
}

function buildDriveAppProperties(item: MediaSyncCandidate) {
    return {
        aceSubmissionId: item.id,
        aceImagePath: item.imagePath,
        aceStatus: item.status,
        aceArchived: item.isArchived ? '1' : '0',
    }
}

function buildDriveFileDescription(item: MediaSyncCandidate) {
    return `ACE submission ${item.id} by ${item.submitterName} for week ${item.weekNumber}, ${item.year}.`
}

function hasMatchingDriveMetadata(
    driveFile: GoogleDriveFileSummary,
    fileName: string,
    appProperties: Record<string, string>
) {
    if (driveFile.name !== fileName) {
        return false
    }

    const existingProperties = driveFile.appProperties || {}

    return Object.entries(appProperties).every(([key, value]) => existingProperties[key] === value)
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

export async function getMediaDistributionOverview(): Promise<MediaDistributionOverview> {
    await requireAdmin()

    return {
        googleDrive: getGoogleDriveMediaDestination(),
    }
}

export async function syncMediaToGoogleDrive(scope: MediaSyncScope): Promise<MediaGoogleDriveSyncResult> {
    try {
        const adminUser = await requireAdmin()
        const destination = getGoogleDriveMediaDestination()

        if (!destination.configured || !destination.folderId) {
            return {
                success: false,
                error: destination.configurationError || 'Google Drive sync is not configured.',
                serviceAccountEmail: destination.serviceAccountEmail,
            }
        }

        const [folder, existingFiles, candidates] = await Promise.all([
            getGoogleDriveFolderSummary(destination.folderId),
            listGoogleDriveFolderFiles(destination.folderId),
            getMediaSyncCandidates(scope),
        ])

        const existingFilesBySubmissionId = new Map<string, GoogleDriveFileSummary>()
        existingFiles.forEach((file) => {
            const submissionId = file.appProperties?.aceSubmissionId
            if (submissionId && !existingFilesBySubmissionId.has(submissionId)) {
                existingFilesBySubmissionId.set(submissionId, file)
            }
        })

        let created = 0
        let updated = 0
        let skipped = 0
        let failed = 0
        const failures: Array<{ submissionId: string; fileName: string; error: string }> = []
        const bucket = adminStorage.bucket()

        for (const item of candidates) {
            const fileName = buildMediaDriveFileName(item)
            const appProperties = buildDriveAppProperties(item)
            const existingFile = existingFilesBySubmissionId.get(item.id)

            try {
                if (existingFile && hasMatchingDriveMetadata(existingFile, fileName, appProperties)) {
                    skipped++
                    continue
                }

                if (existingFile && existingFile.appProperties?.aceImagePath === item.imagePath) {
                    await updateGoogleDriveFileMetadata(existingFile.id, {
                        name: fileName,
                        description: buildDriveFileDescription(item),
                        appProperties,
                    })
                    updated++
                    continue
                }

                const [bytes] = await bucket.file(item.imagePath).download()

                await uploadGoogleDriveFile({
                    fileId: existingFile?.id,
                    fileName,
                    folderId: destination.folderId,
                    contentType: inferMediaMimeType(item.imagePath),
                    bytes,
                    metadata: {
                        name: fileName,
                        description: buildDriveFileDescription(item),
                        appProperties,
                    },
                })

                if (existingFile) {
                    updated++
                } else {
                    created++
                }
            } catch (error) {
                failed++
                failures.push({
                    submissionId: item.id,
                    fileName,
                    error: getErrorMessage(error, 'Failed to sync file to Google Drive'),
                })
            }
        }

        const summary = {
            totalCandidates: candidates.length,
            created,
            updated,
            skipped,
            failed,
        }
        const partialFailure = failed > 0
        const success = failed < candidates.length || candidates.length === 0
        const folderUrl = folder.webViewLink || destination.folderUrl

        await logAuditAction(
            adminUser.id,
            'MEDIA_SYNCED_TO_GOOGLE_DRIVE',
            'SUBMISSION',
            destination.folderId,
            partialFailure
                ? `Google Drive sync completed with ${failed} failure(s) for ${describeMediaSyncScope(scope)}.`
                : `Google Drive sync completed for ${describeMediaSyncScope(scope)}.`,
            {
                actorName: adminUser.name,
                scope,
                scopeLabel: describeMediaSyncScope(scope),
                folderId: destination.folderId,
                folderName: folder.name,
                folderUrl,
                serviceAccountEmail: destination.serviceAccountEmail,
                summary,
                failures: failures.slice(0, 25),
            },
            adminUser.email
        )

        revalidatePath('/admin/media')

        if (!success) {
            return {
                success: false,
                error: 'Google Drive sync failed for every selected submission.',
                partialFailure: true,
                scope,
                folderName: folder.name,
                folderUrl,
                serviceAccountEmail: destination.serviceAccountEmail,
                summary,
                failures,
            }
        }

        return {
            success: true,
            partialFailure,
            scope,
            folderName: folder.name,
            folderUrl,
            serviceAccountEmail: destination.serviceAccountEmail,
            summary,
            failures,
        }
    } catch (error) {
        console.error('Error syncing media to Google Drive:', error)
        return {
            success: false,
            error: getErrorMessage(error, 'Failed to sync media to Google Drive'),
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
