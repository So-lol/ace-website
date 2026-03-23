export type MediaReconciliationIssueCode =
    | 'MISSING_IMAGE_PATH'
    | 'MISSING_STORAGE_OBJECT'
    | 'FAILED_UPLOAD'
    | 'STUCK_UPLOADING'
    | 'FILE_PRESENT_FOR_INCOMPLETE_UPLOAD'
    | 'ORPHANED_STORAGE_OBJECT'

export interface MediaReconciliationSubmissionRecord {
    id: string
    imagePath?: string
    uploadState?: 'UPLOADING' | 'UPLOADED' | 'FAILED'
    createdAt?: Date | null
}

export interface MediaReconciliationIssue {
    code: MediaReconciliationIssueCode
    submissionId?: string
    imagePath?: string
    ageMinutes?: number
}

export interface MediaReconciliationReport {
    scannedSubmissions: number
    uploadedSubmissions: number
    healthySubmissions: number
    issueCount: number
    missingFiles: number
    failedUploads: number
    stuckUploads: number
    inconsistentStates: number
    orphanedFiles: number
    issues: MediaReconciliationIssue[]
}

const STUCK_UPLOAD_MINUTES = 15

function normalizePath(path?: string) {
    return path?.trim() || ''
}

export function buildMediaReconciliationReport(
    submissions: MediaReconciliationSubmissionRecord[],
    storedPaths: Iterable<string>,
    now = new Date()
): MediaReconciliationReport {
    const storagePathSet = new Set(
        Array.from(storedPaths)
            .map(normalizePath)
            .filter(Boolean)
    )
    const referencedPaths = new Set<string>()
    const issues: MediaReconciliationIssue[] = []
    let uploadedSubmissions = 0
    let missingFiles = 0
    let failedUploads = 0
    let stuckUploads = 0
    let inconsistentStates = 0

    for (const submission of submissions) {
        const uploadState = submission.uploadState || 'UPLOADED'
        const imagePath = normalizePath(submission.imagePath)
        const createdAt = submission.createdAt || null

        if (imagePath) {
            referencedPaths.add(imagePath)
        }

        if (uploadState === 'UPLOADED') {
            uploadedSubmissions += 1

            if (!imagePath) {
                missingFiles += 1
                issues.push({
                    code: 'MISSING_IMAGE_PATH',
                    submissionId: submission.id,
                })
                continue
            }

            if (!storagePathSet.has(imagePath)) {
                missingFiles += 1
                issues.push({
                    code: 'MISSING_STORAGE_OBJECT',
                    submissionId: submission.id,
                    imagePath,
                })
                continue
            }

            continue
        }

        if (uploadState === 'FAILED') {
            failedUploads += 1
            issues.push({
                code: 'FAILED_UPLOAD',
                submissionId: submission.id,
                imagePath: imagePath || undefined,
            })

            if (imagePath && storagePathSet.has(imagePath)) {
                inconsistentStates += 1
                issues.push({
                    code: 'FILE_PRESENT_FOR_INCOMPLETE_UPLOAD',
                    submissionId: submission.id,
                    imagePath,
                })
            }

            continue
        }

        if (uploadState === 'UPLOADING') {
            const ageMinutes = createdAt
                ? Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60)))
                : undefined

            if (ageMinutes === undefined || ageMinutes >= STUCK_UPLOAD_MINUTES) {
                stuckUploads += 1
                issues.push({
                    code: 'STUCK_UPLOADING',
                    submissionId: submission.id,
                    imagePath: imagePath || undefined,
                    ageMinutes,
                })
            }

            if (imagePath && storagePathSet.has(imagePath)) {
                inconsistentStates += 1
                issues.push({
                    code: 'FILE_PRESENT_FOR_INCOMPLETE_UPLOAD',
                    submissionId: submission.id,
                    imagePath,
                    ageMinutes,
                })
            }
        }
    }

    const orphanedFiles: MediaReconciliationIssue[] = []
    for (const storedPath of storagePathSet) {
        if (!referencedPaths.has(storedPath)) {
            orphanedFiles.push({
                code: 'ORPHANED_STORAGE_OBJECT',
                imagePath: storedPath,
            })
        }
    }

    issues.push(...orphanedFiles)

    return {
        scannedSubmissions: submissions.length,
        uploadedSubmissions,
        healthySubmissions: uploadedSubmissions - missingFiles,
        issueCount: issues.length,
        missingFiles,
        failedUploads,
        stuckUploads,
        inconsistentStates,
        orphanedFiles: orphanedFiles.length,
        issues,
    }
}
