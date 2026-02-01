'use server'

import { adminDb } from '@/lib/firebase-admin'
import { getAuthenticatedUser, requireAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { AuditLogDoc } from '@/types/firestore'

interface AdjustPointsInput {
    pairingId: string
    amount: number  // Can be positive or negative
    reason: string  // Required
}

export async function adjustPairingPoints(input: AdjustPointsInput) {
    try {
        const user = await requireAdmin()

        if (!input.reason || input.reason.trim().length === 0) {
            return { success: false, error: 'Reason is required for point adjustments' }
        }

        if (!input.pairingId) {
            return { success: false, error: 'Pairing ID is required' }
        }

        if (input.amount === 0) {
            return { success: false, error: 'Amount must be non-zero' }
        }

        // Get current pairing
        const pairingRef = adminDb.collection('pairings').doc(input.pairingId)
        const pairingSnap = await pairingRef.get()

        if (!pairingSnap.exists) {
            return { success: false, error: 'Pairing not found' }
        }

        const pairingData = pairingSnap.data()
        const currentPoints = pairingData?.totalPoints || 0
        const newPoints = currentPoints + input.amount

        // Update pairing points
        await pairingRef.update({
            totalPoints: newPoints,
            updatedAt: FieldValue.serverTimestamp()
        })

        // Create audit log entry
        await adminDb.collection('auditLogs').add({
            action: input.amount > 0 ? 'POINTS_ADDED' : 'POINTS_DEDUCTED',
            targetType: 'pairing',
            targetId: input.pairingId,
            actorId: user.id,
            details: input.reason.trim(),
            timestamp: FieldValue.serverTimestamp(),
            metadata: {
                previousPoints: currentPoints,
                adjustment: input.amount,
                newPoints: newPoints,
                actorName: user.name,
                actorEmail: user.email
            }
        })

        revalidatePath('/admin/points')
        revalidatePath('/admin')
        revalidatePath('/leaderboard')

        return {
            success: true,
            previousPoints: currentPoints,
            newPoints: newPoints
        }
    } catch (error) {
        console.error('Error adjusting points:', error)
        if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
            return { success: false, error: 'Admin access required' }
        }
        return { success: false, error: 'Failed to adjust points' }
    }
}

export async function getPointsHistory(pairingId?: string, limit: number = 50) {
    try {
        await requireAdmin()

        let query = adminDb.collection('auditLogs')
            .where('targetType', '==', 'pairing')
            .orderBy('timestamp', 'desc')
            .limit(limit)

        if (pairingId) {
            query = adminDb.collection('auditLogs')
                .where('targetType', '==', 'pairing')
                .where('targetId', '==', pairingId)
                .orderBy('timestamp', 'desc')
                .limit(limit)
        }

        const snapshot = await query.get()

        return snapshot.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate?.() || new Date()
            }
        })
    } catch (error) {
        console.error('Error fetching points history:', error)
        return []
    }
}

export async function getPairingsForPointsAdmin() {
    try {
        await requireAdmin()

        const snapshot = await adminDb.collection('pairings').get()

        const pairings = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data()

            // Fetch mentor name
            const mentorSnap = await adminDb.collection('users').doc(data.mentorId).get()
            const mentorName = mentorSnap.exists ? mentorSnap.data()?.name : 'Unknown'

            // Fetch family name
            const familySnap = await adminDb.collection('families').doc(data.familyId).get()
            const familyName = familySnap.exists ? familySnap.data()?.name : 'Unknown'

            return {
                id: doc.id,
                mentorId: data.mentorId,
                mentorName,
                familyId: data.familyId,
                familyName,
                totalPoints: data.totalPoints || 0,
                weeklyPoints: data.weeklyPoints || 0
            }
        }))

        return pairings.sort((a, b) => b.totalPoints - a.totalPoints)
    } catch (error) {
        console.error('Error fetching pairings for points admin:', error)
        return []
    }
}
