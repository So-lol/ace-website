import 'server-only'

import { headers } from 'next/headers'
import { randomUUID } from 'node:crypto'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import {
    AuthEventMetadata,
    AuthEventSeverity,
    AuthEventType,
    buildAuthRollupId,
    getAuthEventSeverity,
    getAuthRollupBucket,
    getAuthRollupBucketStart,
    normalizeAuthEventEmail,
    sanitizeAuthEventMetadata,
    truncateAuthEventValue,
} from '@/lib/auth-observability-utils'

type AuthEventInput = {
    type: AuthEventType
    surface: 'client' | 'server'
    route?: string
    uid?: string | null
    email?: string | null
    severity?: AuthEventSeverity
    errorCode?: string | null
    errorMessage?: string | null
    metadata?: AuthEventMetadata
}

async function getAuthRequestContext() {
    try {
        const headerList = await headers()
        const forwardedFor = headerList.get('x-forwarded-for')

        return {
            ip: truncateAuthEventValue(forwardedFor?.split(',')[0]?.trim() || 'unknown', 100),
            userAgent: truncateAuthEventValue(headerList.get('user-agent') || 'unknown', 300),
            deploymentId: truncateAuthEventValue(
                headerList.get('x-vercel-id') ||
                headerList.get('x-request-id') ||
                headerList.get('cf-ray') ||
                'unknown',
                120
            ),
        }
    } catch {
        return {
            ip: 'unknown',
            userAgent: 'unknown',
            deploymentId: 'unknown',
        }
    }
}

export async function recordAuthEvent(input: AuthEventInput) {
    const now = new Date()
    const createdAt = Timestamp.fromDate(now)
    const eventId = randomUUID()
    const severity = input.severity || getAuthEventSeverity(input.type)
    const normalizedEmail = normalizeAuthEventEmail(input.email)
    const metadata = sanitizeAuthEventMetadata(input.metadata)
    const { ip, userAgent, deploymentId } = await getAuthRequestContext()
    const bucket = getAuthRollupBucket(now)
    const bucketStartedAt = Timestamp.fromDate(getAuthRollupBucketStart(now))

    const eventPayload = {
        eventId,
        type: input.type,
        surface: input.surface,
        severity,
        route: input.route || null,
        uid: input.uid || null,
        email: normalizedEmail,
        errorCode: input.errorCode || null,
        errorMessage: input.errorMessage ? truncateAuthEventValue(input.errorMessage) : null,
        metadata: metadata || null,
        ip,
        userAgent,
        deploymentId,
        bucket,
        createdAt,
    }

    const logPayload = JSON.stringify({
        authEvent: true,
        ...eventPayload,
        createdAt: now.toISOString(),
    })

    if (severity === 'error') {
        console.error('[AuthMonitor]', logPayload)
    } else if (severity === 'warn') {
        console.warn('[AuthMonitor]', logPayload)
    } else {
        console.info('[AuthMonitor]', logPayload)
    }

    try {
        await adminDb.collection('auth_events').doc(eventId).set(eventPayload)

        const rollupTargets: Array<{
            dimension: 'global' | 'email' | 'ip' | 'uid'
            value: string
        }> = [{ dimension: 'global', value: 'all' }]

        if (normalizedEmail) {
            rollupTargets.push({ dimension: 'email', value: normalizedEmail })
        }

        if (ip !== 'unknown') {
            rollupTargets.push({ dimension: 'ip', value: ip })
        }

        if (input.uid) {
            rollupTargets.push({ dimension: 'uid', value: input.uid })
        }

        const batch = adminDb.batch()

        for (const target of rollupTargets) {
            const rollupRef = adminDb.collection('auth_event_rollups').doc(
                buildAuthRollupId({
                    type: input.type,
                    dimension: target.dimension,
                    value: target.value,
                    bucket,
                })
            )

            batch.set(rollupRef, {
                type: input.type,
                severity,
                dimension: target.dimension,
                value: target.value,
                bucket,
                count: FieldValue.increment(1),
                bucketStartedAt,
                lastSeenAt: createdAt,
                lastErrorCode: input.errorCode || null,
                lastRoute: input.route || null,
                deploymentId,
                sampleEventId: eventId,
            }, { merge: true })
        }

        await batch.commit()
    } catch (error) {
        console.error('[AuthMonitor] Failed to persist auth event', {
            eventId,
            type: input.type,
            persistError: error,
        })
    }
}
