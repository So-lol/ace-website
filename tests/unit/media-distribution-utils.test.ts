import assert from 'node:assert/strict'
import test from 'node:test'

import {
    buildMediaExportFileName,
    describeMediaSyncScope,
    mediaMatchesSyncScope,
    sanitizeDriveFileNameSegment,
} from '@/lib/media-distribution-utils'

test('media sync scope filtering matches expected admin distribution rules', () => {
    const approvedActive = { status: 'APPROVED' as const, isArchived: false }
    const rejectedActive = { status: 'REJECTED' as const, isArchived: false }
    const approvedArchived = { status: 'APPROVED' as const, isArchived: true }

    assert.equal(mediaMatchesSyncScope(approvedActive, 'approved-active'), true)
    assert.equal(mediaMatchesSyncScope(rejectedActive, 'approved-active'), false)
    assert.equal(mediaMatchesSyncScope(rejectedActive, 'all-active'), true)
    assert.equal(mediaMatchesSyncScope(approvedArchived, 'all-active'), false)
    assert.equal(mediaMatchesSyncScope(approvedArchived, 'all-uploaded'), true)
})

test('export filename generation produces stable, readable filenames', () => {
    const fileName = buildMediaExportFileName({
        id: 'submission-123',
        submitterName: 'J\u00f3se / Smith',
        weekNumber: 6,
        year: 2026,
        status: 'APPROVED',
        imagePath: 'submissions/user-1/1712345678901.heic',
    })

    assert.equal(
        fileName,
        'ace-submission-submission-123__2026-week-06__Jose-Smith__approved.heic'
    )
})

test('filename sanitization strips unsupported characters and falls back when empty', () => {
    assert.equal(sanitizeDriveFileNameSegment('  ??  '), 'unknown')
    assert.equal(sanitizeDriveFileNameSegment('Team Photo: Spring/2026'), 'Team-Photo-Spring-2026')
})

test('media distribution helpers expose human readable scope labels', () => {
    assert.equal(describeMediaSyncScope('approved-active'), 'Approved active only')
})
