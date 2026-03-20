import { normalizeEmail } from '@/lib/auth-utils'

export type AuthEventType =
    | 'login_failure'
    | 'signup_failure'
    | 'session_sync_failure'
    | 'session_verification_failure'
    | 'password_reset_request_failure'
    | 'password_reset_confirm_failure'
    | 'action_code_failure'
    | 'email_verification_resend_failure'
    | 'email_change_failure'
    | 'password_change_failure'
    | 'logout_failure'

export type AuthEventSeverity = 'info' | 'warn' | 'error'

export type AuthEventMetadata = Record<string, boolean | number | string | null | undefined>

export function normalizeAuthEventEmail(email?: string | null) {
    return email ? normalizeEmail(email) : null
}

export function truncateAuthEventValue(value: string, maxLength = 500) {
    return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value
}

export function sanitizeAuthEventMetadata(metadata?: AuthEventMetadata) {
    if (!metadata) return undefined

    const sanitizedEntries = Object.entries(metadata)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => {
            if (typeof value === 'string') {
                return [key, truncateAuthEventValue(value, 300)]
            }

            return [key, value]
        })

    return sanitizedEntries.length > 0
        ? Object.fromEntries(sanitizedEntries)
        : undefined
}

export function getAuthEventSeverity(type: AuthEventType): AuthEventSeverity {
    switch (type) {
        case 'session_verification_failure':
        case 'session_sync_failure':
        case 'action_code_failure':
            return 'error'
        default:
            return 'warn'
    }
}

export function sanitizeAuthRollupFragment(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 120) || 'unknown'
}

export function getAuthRollupBucket(date = new Date()) {
    return date.toISOString().slice(0, 13).replace(/[-:T]/g, '')
}

export function getAuthRollupBucketStart(date = new Date()) {
    const bucketStart = new Date(date)
    bucketStart.setUTCMinutes(0, 0, 0)
    return bucketStart
}

export function buildAuthRollupId(params: {
    type: AuthEventType
    dimension: 'global' | 'email' | 'ip' | 'uid'
    value: string
    bucket?: string
}) {
    const bucket = params.bucket || getAuthRollupBucket()
    return `${params.type}:${bucket}:${params.dimension}:${sanitizeAuthRollupFragment(params.value)}`
}

export function serializeAuthError(error: unknown) {
    if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof (error as { code?: unknown }).code === 'string'
    ) {
        const authError = error as { code: string; message?: unknown }
        return {
            errorCode: authError.code,
            errorMessage: typeof authError.message === 'string'
                ? truncateAuthEventValue(authError.message)
                : undefined,
        }
    }

    if (error instanceof Error) {
        return {
            errorCode: error.name || 'Error',
            errorMessage: truncateAuthEventValue(error.message),
        }
    }

    if (typeof error === 'string') {
        return {
            errorCode: 'error',
            errorMessage: truncateAuthEventValue(error),
        }
    }

    return {
        errorCode: 'unknown',
        errorMessage: undefined,
    }
}
