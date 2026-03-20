'use server'

import { recordAuthEvent } from '@/lib/auth-observability'
import {
    AuthEventMetadata,
    AuthEventType,
    getAuthEventSeverity,
} from '@/lib/auth-observability-utils'

type ClientAuthFailureInput = {
    type: AuthEventType
    route: string
    email?: string | null
    uid?: string | null
    errorCode?: string | null
    errorMessage?: string | null
    metadata?: AuthEventMetadata
}

export async function reportClientAuthFailure(input: ClientAuthFailureInput) {
    try {
        await recordAuthEvent({
            type: input.type,
            surface: 'client',
            route: input.route,
            email: input.email,
            uid: input.uid,
            errorCode: input.errorCode,
            errorMessage: input.errorMessage,
            metadata: input.metadata,
            severity: getAuthEventSeverity(input.type),
        })
    } catch (error) {
        console.error('[AuthMonitor] Failed to record client auth failure', error)
    }
}
