import assert from 'node:assert/strict'
import test from 'node:test'

import {
    getAuthActionCodeSettings,
    getAuthActionUrl,
    getPublicAppUrl,
    isAssetRoute,
    isPublicRoute,
    normalizeEmail,
    sanitizeRedirectPath,
} from '@/lib/auth-utils'

test('normalizeEmail trims and lowercases input', () => {
    assert.equal(normalizeEmail('  TeSt@Example.COM  '), 'test@example.com')
})

test('sanitizeRedirectPath keeps safe in-app destinations', () => {
    assert.equal(sanitizeRedirectPath('/dashboard?tab=profile#security'), '/dashboard?tab=profile#security')
})

test('sanitizeRedirectPath rejects external and malformed destinations', () => {
    assert.equal(sanitizeRedirectPath('https://evil.example'), '/dashboard')
    assert.equal(sanitizeRedirectPath('//evil.example'), '/dashboard')
    assert.equal(sanitizeRedirectPath('javascript:alert(1)'), '/dashboard')
})

test('public route classification includes auth recovery routes', () => {
    assert.equal(isPublicRoute('/forgot-password'), true)
    assert.equal(isPublicRoute('/announcements'), true)
    assert.equal(isPublicRoute('/auth/action'), true)
    assert.equal(isPublicRoute('/dashboard'), false)
})

test('asset route classification skips API and static assets', () => {
    assert.equal(isAssetRoute('/api/auth/me'), true)
    assert.equal(isAssetRoute('/_next/static/chunks/main.js'), true)
    assert.equal(isAssetRoute('/images/logo.png'), true)
    assert.equal(isAssetRoute('/profile'), false)
})

test('auth action helpers prefer NEXT_PUBLIC_APP_URL when configured', () => {
    const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
    process.env.NEXT_PUBLIC_APP_URL = 'https://ace.example.com/'

    try {
        assert.equal(getPublicAppUrl(), 'https://ace.example.com')
        assert.equal(getAuthActionUrl('http://localhost:3000'), 'https://ace.example.com/auth/action')
        assert.deepEqual(getAuthActionCodeSettings('http://localhost:3000'), {
            url: 'https://ace.example.com/auth/action',
            handleCodeInApp: false,
        })
    } finally {
        if (originalAppUrl === undefined) {
            delete process.env.NEXT_PUBLIC_APP_URL
        } else {
            process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
        }
    }
})

test('auth action helpers fall back to the provided origin when env is missing', () => {
    const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
    delete process.env.NEXT_PUBLIC_APP_URL

    try {
        assert.equal(getPublicAppUrl(), null)
        assert.equal(getAuthActionUrl('https://staging.example.com'), 'https://staging.example.com/auth/action')
    } finally {
        if (originalAppUrl === undefined) {
            delete process.env.NEXT_PUBLIC_APP_URL
        } else {
            process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
        }
    }
})
