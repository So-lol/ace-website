import { SubmissionStatus } from '@/types/firestore'

export type MediaSyncScope = 'approved-active' | 'all-active' | 'all-uploaded'

export interface MediaSyncCandidate {
    id: string
    submitterName: string
    weekNumber: number
    year: number
    status: SubmissionStatus
    imagePath: string
    isArchived: boolean
}

export const MEDIA_SYNC_SCOPE_OPTIONS: Array<{
    value: MediaSyncScope
    label: string
    description: string
}> = [
    {
        value: 'approved-active',
        label: 'Approved active only',
        description: 'Recommended for the multimedia team.',
    },
    {
        value: 'all-active',
        label: 'All active submissions',
        description: 'Includes pending and rejected uploads that are not archived.',
    },
    {
        value: 'all-uploaded',
        label: 'All uploaded submissions',
        description: 'Includes archived files in addition to the active library.',
    },
]

const INVALID_FILE_NAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g

export function mediaMatchesSyncScope(item: Pick<MediaSyncCandidate, 'status' | 'isArchived'>, scope: MediaSyncScope) {
    switch (scope) {
        case 'approved-active':
            return item.status === 'APPROVED' && !item.isArchived
        case 'all-active':
            return !item.isArchived
        case 'all-uploaded':
            return true
    }
}

export function describeMediaSyncScope(scope: MediaSyncScope) {
    return MEDIA_SYNC_SCOPE_OPTIONS.find((option) => option.value === scope)?.label || scope
}

export function sanitizeDriveFileNameSegment(value: string, fallback = 'unknown', maxLength = 48) {
    const asciiValue = value
        .normalize('NFKD')
        .replace(/[^\x20-\x7E]/g, '')
        .replace(INVALID_FILE_NAME_CHARS, ' ')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, maxLength)

    return asciiValue || fallback
}

export function getFileExtensionFromPath(path: string, fallback = 'jpg') {
    const lastSegment = path.split('/').pop() || ''
    const extension = lastSegment.includes('.') ? lastSegment.split('.').pop() : null

    if (!extension) {
        return fallback
    }

    const normalized = extension.toLowerCase().replace(/[^a-z0-9]/g, '')
    return normalized || fallback
}

export function inferMediaMimeType(path: string) {
    switch (getFileExtensionFromPath(path)) {
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg'
        case 'png':
            return 'image/png'
        case 'webp':
            return 'image/webp'
        case 'heic':
            return 'image/heic'
        case 'heif':
            return 'image/heif'
        default:
            return 'application/octet-stream'
    }
}

export function buildMediaDriveFileName(item: Pick<MediaSyncCandidate, 'id' | 'submitterName' | 'weekNumber' | 'year' | 'status' | 'imagePath'>) {
    const safeSubmitter = sanitizeDriveFileNameSegment(item.submitterName)
    const extension = getFileExtensionFromPath(item.imagePath)
    const paddedWeek = String(item.weekNumber).padStart(2, '0')

    return `ace-submission-${item.id}__${item.year}-week-${paddedWeek}__${safeSubmitter}__${item.status.toLowerCase()}.${extension}`
}
