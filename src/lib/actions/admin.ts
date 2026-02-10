'use server'

import { adminDb } from '@/lib/firebase-admin'
import { requireAdmin } from '@/lib/auth-helpers'
import { Timestamp } from 'firebase-admin/firestore'
import { UserDoc } from '@/types/firestore'

export type ImportStats = {
    total: number
    success: number
    failed: number
    errors: string[]
}

/**
 * Bulk import users from CSV data
 */
export async function importUsers(users: any[]): Promise<ImportStats> {
    const admin = await requireAdmin()
    const stats: ImportStats = { total: users.length, success: 0, failed: 0, errors: [] }

    const batch = adminDb.batch()
    const usersCreated: string[] = []

    for (const data of users) {
        try {
            if (!data.email || !data.name || !data.role) {
                stats.failed++
                stats.errors.push(`Missing required fields for ${data.email || 'unknown user'}`)
                continue
            }

            const userId = data.uid || data.email.toLowerCase().replace(/[^a-z0-9]/g, '_')
            const userRef = adminDb.collection('users').doc(userId)

            const userData: UserDoc = {
                uid: userId, // In bulk import without Auth ID yet, we might use email-based ID
                email: data.email.toLowerCase(),
                name: data.name,
                role: data.role.toUpperCase() as any,
                familyId: data.family_id || null,
                avatarUrl: null,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            }

            batch.set(userRef, userData, { merge: true })
            stats.success++
            usersCreated.push(userId)
        } catch (err: any) {
            stats.failed++
            stats.errors.push(`Error importing ${data.email}: ${err.message}`)
        }
    }

    if (usersCreated.length > 0) {
        await batch.commit()
    }

    return stats
}

/**
 * Bulk import pairings from CSV data
 */
export async function importPairings(pairings: any[]): Promise<ImportStats> {
    await requireAdmin()
    const stats: ImportStats = { total: pairings.length, success: 0, failed: 0, errors: [] }

    const batch = adminDb.batch()

    for (const data of pairings) {
        try {
            if (!data.mentor_email || !data.mentee1_email) {
                stats.failed++
                stats.errors.push(`Missing mentor or mentee email for row`)
                continue
            }

            // 1. Find mentor
            const mentorSnap = await adminDb.collection('users').where('email', '==', data.mentor_email.toLowerCase()).get()
            if (mentorSnap.empty) {
                stats.failed++
                stats.errors.push(`Mentor ${data.mentor_email} not found`)
                continue
            }
            const mentorId = mentorSnap.docs[0].id

            // 2. Find mentees
            const menteeEmails = [data.mentee1_email, data.mentee2_email].filter(Boolean).map(e => e.toLowerCase())
            const menteeIds: string[] = []

            for (const email of menteeEmails) {
                const snap = await adminDb.collection('users').where('email', '==', email).get()
                if (snap.empty) {
                    stats.errors.push(`Warning: Mentee ${email} not found, skipping only this mentee`)
                    continue
                }
                menteeIds.push(snap.docs[0].id)
            }

            if (menteeIds.length === 0) {
                stats.failed++
                stats.errors.push(`No valid mentees found for mentor ${data.mentor_email}`)
                continue
            }

            // 3. Create/Update Pairing
            const pairingId = `pairing_${mentorId}`
            const pairingRef = adminDb.collection('pairings').doc(pairingId)

            await batch.set(pairingRef, {
                mentorId,
                menteeIds,
                familyId: data.family_id || null,
                updatedAt: Timestamp.now(),
            }, { merge: true })

            // 4. Update user docs with pairing info (optional but helpful for queries)
            const mentorRef = adminDb.collection('users').doc(mentorId)
            batch.update(mentorRef, {
                pairingId,
                'pairing.mentees': menteeEmails // Store names or emails for easy display
            })

            for (const mId of menteeIds) {
                batch.update(adminDb.collection('users').doc(mId), {
                    pairingId,
                    'pairing.mentor': data.mentor_email
                })
            }

            stats.success++
        } catch (err: any) {
            stats.failed++
            stats.errors.push(`Error processing pairing for ${data.mentor_email}: ${err.message}`)
        }
    }

    await batch.commit()
    return stats
}
