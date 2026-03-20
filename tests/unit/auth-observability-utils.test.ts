import assert from 'node:assert/strict'
import test from 'node:test'

import {
    buildAuthRollupId,
    getAuthEventSeverity,
    getAuthRollupBucket,
    getAuthRollupBucketStart,
    sanitizeAuthEventMetadata,
    serializeAuthError,
} from '@/lib/auth-observability-utils'

test('auth rollup id normalizes unsafe fragments', () => {
    assert.equal(
        buildAuthRollupId({
            type: 'login_failure',
            dimension: 'email',
            value: 'Test.User+alias@example.com',
            bucket: '2026031917',
        }),
        'login_failure:2026031917:email:test-user-alias-example-com'
    )
})

test('auth rollup bucket helpers round to the current UTC hour', () => {
    const input = new Date('2026-03-19T23:45:12.123Z')
    assert.equal(getAuthRollupBucket(input), '2026031923')
    assert.equal(getAuthRollupBucketStart(input).toISOString(), '2026-03-19T23:00:00.000Z')
})

test('auth metadata sanitization drops undefined values and truncates strings', () => {
    const metadata = sanitizeAuthEventMetadata({
        kept: 'ok',
        omitted: undefined,
        large: 'x'.repeat(400),
    })

    assert.deepEqual(metadata, {
        kept: 'ok',
        large: `${'x'.repeat(297)}...`,
    })
})

test('auth error serialization extracts firebase-style codes and messages', () => {
    const serialized = serializeAuthError({
        code: 'auth/too-many-requests',
        message: 'Too many requests.',
    })

    assert.deepEqual(serialized, {
        errorCode: 'auth/too-many-requests',
        errorMessage: 'Too many requests.',
    })
})

test('auth severity mapping keeps session and action-code failures at error level', () => {
    assert.equal(getAuthEventSeverity('login_failure'), 'warn')
    assert.equal(getAuthEventSeverity('session_verification_failure'), 'error')
    assert.equal(getAuthEventSeverity('action_code_failure'), 'error')
})
