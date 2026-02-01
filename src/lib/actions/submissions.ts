'use server'

import { getAuthenticatedUser, requireAdmin } from '@/lib/auth-helpers'
import { uploadFile, deleteFile, adminDb } from '@/lib/firebase-admin'
import { revalidatePath } from 'next/cache'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'
import { SubmissionDoc, PairingDoc, UserDoc, SubmissionStatus } from '@/types/firestore'

export type UploadResult = {
    success: boolean
    error?: string
    imageUrl?: string
    imagePath?: string
}

export type SubmissionResult = {
    success: boolean
    error?: string
    submissionId?: string
}

/**
 * Upload a file to Firebase Storage
 */
export async function uploadSubmissionImage(formData: FormData): Promise<UploadResult> {
    // Get authenticated user
    const user = await getAuthenticatedUser()
    if (!user) {
        return { success: false, error: 'You must be logged in to upload' }
    }

    const file = formData.get('file') as File
    if (!file) {
        return { success: false, error: 'No file provided' }
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
    if (!allowedTypes.includes(file.type)) {
        return { success: false, error: 'Invalid file type. Please upload JPG, PNG, WebP, or HEIC.' }
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
        return { success: false, error: 'File too large. Maximum size is 10MB.' }
    }

    // Generate unique filename
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `submissions/${user.id}/${timestamp}.${extension}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Firebase Storage
    const result = await uploadFile(buffer, fileName, file.type)

    if (!result) {
        return { success: false, error: 'Failed to upload image. Please try again.' }
    }

    return {
        success: true,
        imageUrl: result.url,
        imagePath: result.path,
    }
}

/**
 * Create a submission record after successful upload
 */
export async function createSubmission(
    imageUrl: string,
    imagePath: string,
    weekNumber: number,
    year: number,
    bonusActivityIds: string[]
): Promise<SubmissionResult> {
    // Get authenticated user
    const user = await getAuthenticatedUser()
    if (!user) {
        return { success: false, error: 'You must be logged in to submit' }
    }

    try {
        // Find user's pairing
        const pairingsRef = adminDb.collection('pairings')
        // Query as mentor
        let snapshot = await pairingsRef.where('mentorId', '==', user.id).get()

        // If not mentor, query as mentee (array-contains)
        if (snapshot.empty) {
            snapshot = await pairingsRef.where('menteeIds', 'array-contains', user.id).get()
        }

        if (snapshot.empty) {
            return { success: false, error: 'You are not part of a pairing yet. Please contact an admin.' }
        }

        const pairingDoc = snapshot.docs[0]
        const pairingId = pairingDoc.id

        // Calculate points
        const basePoints = 10
        let bonusPoints = 0

        if (bonusActivityIds.length > 0) {
            // Fetch relevant bonus activities
            // Firestore 'in' query supports up to 10 items.
            // If > 10, batch or loop. Assuming < 10 for now.
            const bonusesSnap = await adminDb.collection('bonusActivities')
                .where(process.env.FIRESTORE_DOC_ID_FIELD || '__name__', 'in', bonusActivityIds)
                .get()

            bonusesSnap.forEach(doc => {
                const data = doc.data()
                if (data.isActive) {
                    bonusPoints += (data.points || 0)
                }
            })
        }

        const totalPoints = basePoints + bonusPoints

        // Create submission
        const newSubmission: Omit<SubmissionDoc, 'id'> = {
            pairingId,
            submitterId: user.id,
            weekNumber,
            year,
            imageUrl,
            imagePath,
            status: 'PENDING',
            basePoints,
            bonusPoints,
            totalPoints,
            bonusActivityIds, // Store IDs directly
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        }

        const docRef = await adminDb.collection('submissions').add(newSubmission)

        revalidatePath('/dashboard')
        revalidatePath('/dashboard/submissions')

        return {
            success: true,
            submissionId: docRef.id,
        }
    } catch (error) {
        console.error('Submission creation error:', error)
        return { success: false, error: 'Failed to create submission. Please try again.' }
    }
}

/**
 * Delete an uploaded image (for cleanup on failed submissions)
 */
export async function deleteUploadedImage(imagePath: string): Promise<void> {
    try {
        await deleteFile(imagePath)
    } catch (error) {
        console.error('Failed to delete uploaded image:', error)
    }
}

/**
 * Approve a submission (admin only)
 */
export async function approveSubmission(submissionId: string): Promise<SubmissionResult> {
    let adminUser
    try {
        adminUser = await requireAdmin()
    } catch {
        return { success: false, error: 'Only admins can approve submissions' }
    }

    try {
        await adminDb.runTransaction(async (transaction) => {
            const submissionRef = adminDb.collection('submissions').doc(submissionId)
            const submissionSnap = await transaction.get(submissionRef)

            if (!submissionSnap.exists) {
                throw new Error('Submission not found')
            }

            const submissionData = submissionSnap.data() as SubmissionDoc

            if (submissionData.status !== 'PENDING') {
                throw new Error('Submission has already been reviewed')
            }

            // Approve submission
            transaction.update(submissionRef, {
                status: 'APPROVED',
                reviewerId: adminUser.id,
                reviewedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            })

            // Update pairing points
            const pairingRef = adminDb.collection('pairings').doc(submissionData.pairingId)

            transaction.update(pairingRef, {
                weeklyPoints: FieldValue.increment(submissionData.totalPoints),
                totalPoints: FieldValue.increment(submissionData.totalPoints),
                updatedAt: Timestamp.now(),
            })

            // Audit Log
            const auditRef = adminDb.collection('auditLogs').doc()
            transaction.set(auditRef, {
                action: 'APPROVE',
                entityType: 'Submission',
                entityId: submissionId,
                actorId: adminUser.id,
                afterValue: { status: 'APPROVED', points: submissionData.totalPoints },
                createdAt: Timestamp.now(),
            })
        })

        revalidatePath('/admin/submissions')
        revalidatePath('/leaderboard')

        return { success: true, submissionId }
    } catch (error: any) {
        console.error('Approval error:', error)
        return { success: false, error: error.message || 'Failed to approve submission' }
    }
}

/**
 * Reject a submission (admin only)
 */
export async function rejectSubmission(submissionId: string, reason: string): Promise<SubmissionResult> {
    let adminUser
    try {
        adminUser = await requireAdmin()
    } catch {
        return { success: false, error: 'Only admins can reject submissions' }
    }

    if (!reason || reason.trim().length === 0) {
        return { success: false, error: 'A reason is required for rejection' }
    }

    try {
        await adminDb.runTransaction(async (transaction) => {
            const submissionRef = adminDb.collection('submissions').doc(submissionId)
            const submissionSnap = await transaction.get(submissionRef)

            if (!submissionSnap.exists) {
                throw new Error('Submission not found')
            }

            const submissionData = submissionSnap.data() as SubmissionDoc

            if (submissionData.status !== 'PENDING') {
                throw new Error('Submission has already been reviewed')
            }

            // Reject submission and reset points
            transaction.update(submissionRef, {
                status: 'REJECTED',
                reviewerId: adminUser.id,
                reviewReason: reason.trim(),
                reviewedAt: Timestamp.now(),
                basePoints: 0,
                bonusPoints: 0,
                totalPoints: 0,
                updatedAt: Timestamp.now(),
            })

            // Audit log
            const auditRef = adminDb.collection('auditLogs').doc()
            transaction.set(auditRef, {
                action: 'REJECT',
                entityType: 'Submission',
                entityId: submissionId,
                actorId: adminUser.id,
                afterValue: { status: 'REJECTED', reason: reason.trim() },
                createdAt: Timestamp.now(),
            })
        })

        revalidatePath('/admin/submissions')

        return { success: true, submissionId }
    } catch (error: any) {
        console.error('Rejection error:', error)
        return { success: false, error: error.message || 'Failed to reject submission' }
    }
}

/**
 * Get submissions for admin review
 * Note: Returns manually constructed object with joined data
 */
export async function getSubmissions(status?: SubmissionStatus) {
    try {
        let query = adminDb.collection('submissions').orderBy('createdAt', 'desc')
        if (status) { // orderBy status needs index if mixed with createdAt
            query = query.where('status', '==', status)
        }

        const snapshot = await query.get()

        // Manual "Join"
        const submissions = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data() as SubmissionDoc

            // Fetch submitter
            const submitterSnap = await adminDb.collection('users').doc(data.submitterId).get()
            const submitter = submitterSnap.exists ? submitterSnap.data() : { name: 'Unknown', email: 'unknown' }

            // Fetch pairing and family
            const pairingSnap = await adminDb.collection('pairings').doc(data.pairingId).get()
            let pairingData = null
            if (pairingSnap.exists) {
                const pd = pairingSnap.data() as PairingDoc
                // Fetch family
                const familySnap = await adminDb.collection('families').doc(pd.familyId).get()
                const family = familySnap.exists ? familySnap.data() : { name: 'Unknown Family' }

                // Fetch mentor
                const mentorSnap = await adminDb.collection('users').doc(pd.mentorId).get()
                const mentor = mentorSnap.exists ? mentorSnap.data() : { name: 'Unknown Mentor' }

                pairingData = { ...pd, id: pairingSnap.id, family, mentor }
            }

            // Fetch bonuses
            let bonusActivities: any[] = []
            if (data.bonusActivityIds && data.bonusActivityIds.length > 0) {
                // Optimization: Could batch fetch all unique bonus IDs first
                // For now, per row fetch is simpler but slower
                const bonuses = await Promise.all(data.bonusActivityIds.map(async (id) => {
                    const b = await adminDb.collection('bonusActivities').doc(id).get()
                    return b.exists ? { ...b.data(), id } : null
                }))
                bonusActivities = bonuses.filter(Boolean).map(b => ({ bonusActivity: b }))
            }

            return {
                ...data,
                id: doc.id,
                submitter: { ...submitter, id: data.submitterId },
                pairing: pairingData,
                bonusActivities,
                // Serialize dates for client
                createdAt: data.createdAt.toDate(),
                updatedAt: data.updatedAt.toDate(),
                reviewedAt: data.reviewedAt?.toDate() || null
            }
        }))

        return submissions
    } catch (error) {
        console.error('Failed to fetch submissions:', error)
        return []
    }
}
