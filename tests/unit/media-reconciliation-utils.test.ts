import assert from 'node:assert/strict'
import test from 'node:test'

import { buildMediaReconciliationReport } from '@/lib/media-reconciliation-utils'

test('media reconciliation reports missing, orphaned, failed, and stuck uploads', () => {
    const report = buildMediaReconciliationReport(
        [
            {
                id: 'healthy-submission',
                imagePath: 'submissions/pairing-a/2026/week-6/healthy.webp',
                uploadState: 'UPLOADED',
                createdAt: new Date('2026-03-21T00:00:00.000Z'),
            },
            {
                id: 'missing-file',
                imagePath: 'submissions/pairing-a/2026/week-6/missing.webp',
                uploadState: 'UPLOADED',
                createdAt: new Date('2026-03-21T00:00:00.000Z'),
            },
            {
                id: 'failed-upload',
                imagePath: 'submissions/pairing-a/2026/week-6/failed.webp',
                uploadState: 'FAILED',
                createdAt: new Date('2026-03-21T00:00:00.000Z'),
            },
            {
                id: 'stuck-upload',
                imagePath: 'submissions/pairing-a/2026/week-6/stuck.webp',
                uploadState: 'UPLOADING',
                createdAt: new Date('2026-03-20T23:00:00.000Z'),
            },
        ],
        [
            'submissions/pairing-a/2026/week-6/healthy.webp',
            'submissions/pairing-a/2026/week-6/failed.webp',
            'submissions/pairing-a/2026/week-6/orphan.webp',
        ],
        new Date('2026-03-21T00:00:00.000Z')
    )

    assert.equal(report.scannedSubmissions, 4)
    assert.equal(report.uploadedSubmissions, 2)
    assert.equal(report.healthySubmissions, 1)
    assert.equal(report.missingFiles, 1)
    assert.equal(report.failedUploads, 1)
    assert.equal(report.stuckUploads, 1)
    assert.equal(report.inconsistentStates, 1)
    assert.equal(report.orphanedFiles, 1)

    assert.deepEqual(
        report.issues.map((issue) => issue.code),
        [
            'MISSING_STORAGE_OBJECT',
            'FAILED_UPLOAD',
            'FILE_PRESENT_FOR_INCOMPLETE_UPLOAD',
            'STUCK_UPLOADING',
            'ORPHANED_STORAGE_OBJECT',
        ]
    )
})

test('media reconciliation treats legacy submissions without uploadState as uploaded', () => {
    const report = buildMediaReconciliationReport(
        [
            {
                id: 'legacy-submission',
                imagePath: 'submissions/pairing-a/2026/week-6/legacy.webp',
                createdAt: new Date('2026-03-21T00:00:00.000Z'),
            },
        ],
        ['submissions/pairing-a/2026/week-6/legacy.webp'],
        new Date('2026-03-21T00:00:00.000Z')
    )

    assert.equal(report.issueCount, 0)
    assert.equal(report.healthySubmissions, 1)
})
