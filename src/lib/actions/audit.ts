'use server'

import { adminDb } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { AuditLogDoc } from '@/types/firestore'

export async function logAuditAction(
    actorId: string,
    action: string,
    targetType: string,
    targetId: string,
    details: string,
    metadata?: Record<string, any>,
    actorEmail?: string
) {
    try {
        await adminDb.collection('audit_logs').add({
            actorId,
            actorEmail: actorEmail || 'Unknown',
            action,
            targetType,
            targetId,
            details,
            metadata: metadata || {},
            timestamp: Timestamp.now()
        })
    } catch (error) {
        console.error('Failed to log audit action:', error)
    }
}

export async function getAuditLogs(limitCount = 50) {
    try {
        const snapshot = await adminDb.collection('audit_logs')
            .orderBy('timestamp', 'desc')
            .limit(limitCount)
            .get()

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as AuditLogDoc[]
    } catch (error) {
        console.error('Failed to fetch audit logs:', error)
        return []
    }
}
