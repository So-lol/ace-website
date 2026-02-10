'use server'

import { getAuthenticatedUser, requireAdmin } from '@/lib/auth-helpers'
import { uploadFile, deleteFile, adminDb } from '@/lib/firebase-admin'
import { revalidatePath } from 'next/cache'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'

// Storage bucket name
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
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
 * Get a user's submission history
 */
export async function getUserSubmissions(userId: string) {
    try {
        // Secure IDOR
        const user = await getAuthenticatedUser()
        if (!user) return []

        if (user.id !== userId && user.role !== 'ADMIN') {
            console.warn(`IDOR attempt blocked: User ${user.id} tried to fetch submissions of ${userId}`)
            return []
        }

        const snapshot = await adminDb.collection('submissions')
            .where('submitterId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get()

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as unknown as SubmissionDoc[]
    } catch (error) {
        console.error('Error fetching user submissions:', error)
        return []
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
 * Secured: Only allows deleting own files or admin override
 */
export async function deleteUploadedImage(imagePath: string): Promise<void> {
    try {
        const user = await getAuthenticatedUser()
        if (!user) return

        // Security Check: Path Traversal & Ownership
        // Expected format: submissions/{userId}/{filename}

        // 1. Prevent traversal
        if (imagePath.includes('..') || !imagePath.startsWith('submissions/')) {
            console.error(`Security blocked deletion attempt: ${imagePath} by ${user.id}`)
            return
        }

        // 2. Check ownership (unless admin)
        const isOwner = imagePath.startsWith(`submissions/${user.id}/`)
        const isAdmin = user.role === 'ADMIN'

        if (!isOwner && !isAdmin) {
            console.error(`Unauthorized deletion attempt: ${imagePath} by ${user.id}`)
            return
        }

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
            const auditRef = adminDb.collection('audit_logs').doc()
            transaction.set(auditRef, {
                action: 'APPROVE',
                targetType: 'SUBMISSION',
                targetId: submissionId,
                actorId: adminUser.id,
                actorEmail: adminUser.email,
                details: 'Approved submission',
                metadata: { status: 'APPROVED', points: submissionData.totalPoints },
                timestamp: Timestamp.now(),
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
            const auditRef = adminDb.collection('audit_logs').doc()
            transaction.set(auditRef, {
                action: 'REJECT',
                targetType: 'SUBMISSION',
                targetId: submissionId,
                actorId: adminUser.id,
                actorEmail: adminUser.email,
                details: `Rejected submission: ${reason.trim()}`,
                metadata: { status: 'REJECTED', reason: reason.trim() },
                timestamp: Timestamp.now(),
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
        // Secure action: Only admins can view all submissions
        await requireAdmin()

        let query = adminDb.collection('submissions').orderBy('createdAt', 'desc')
        if (status) { // orderBy status needs index if mixed with createdAt
            query = query.where('status', '==', status)
        }

        const snapshot = await query.get()
        const submissionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubmissionDoc & { id: string }))

        if (submissionsData.length === 0) return []

        // Collect all unique IDs
        const userIds = new Set<string>()
        const pairingIds = new Set<string>()
        const bonusIds = new Set<string>()

        submissionsData.forEach(sub => {
            if (sub.submitterId) userIds.add(sub.submitterId)
            if (sub.pairingId) pairingIds.add(sub.pairingId)
            if (sub.bonusActivityIds) sub.bonusActivityIds.forEach(id => bonusIds.add(id))
        })

        // Batch Fetch Helpers
        // Firestore getAll supports up to 100 args usually, need to chunk if huge, but fine for now
        const fetchDocs = async (collection: string, ids: Set<string>) => {
            const uniqueIds = Array.from(ids)
            if (uniqueIds.length === 0) return new Map()

            const refs = uniqueIds.map(id => adminDb.collection(collection).doc(id))
            const snaps = await adminDb.getAll(...refs)

            const map = new Map<string, any>()
            snaps.forEach(snap => {
                if (snap.exists) map.set(snap.id, snap.data())
            })
            return map
        }

        const [usersMap, pairingsMap, bonusesMap] = await Promise.all([
            fetchDocs('users', userIds),
            fetchDocs('pairings', pairingIds),
            fetchDocs('bonusActivities', bonusIds)
        ])

        // Need secondary fetch for Families and Mentors (from pairings)
        const familyIds = new Set<string>()
        const mentorIds = new Set<string>()

        pairingsMap.forEach((pairing: PairingDoc) => {
            if (pairing.familyId) familyIds.add(pairing.familyId)
            if (pairing.mentorId) mentorIds.add(pairing.mentorId)
        })

        // Fetch secondary relations
        // We can reuse usersMap if mentors are already there, but safe to fetch again or merge
        // Let's just fetch missing mentors to be safe/simple
        const missingMentorIds = new Set<string>()
        mentorIds.forEach(id => {
            if (!usersMap.has(id)) missingMentorIds.add(id)
        })

        const [familiesMap, extraMentorsMap] = await Promise.all([
            fetchDocs('families', familyIds),
            fetchDocs('users', missingMentorIds)
        ])

        // Merge mentors
        extraMentorsMap.forEach((data, id) => usersMap.set(id, data))

        // Map data back to submissions
        const submissions = submissionsData.map(sub => {
            const submitter = usersMap.get(sub.submitterId) || { name: 'Unknown', email: 'unknown' }

            let pairingData = null
            if (sub.pairingId && pairingsMap.has(sub.pairingId)) {
                const p = pairingsMap.get(sub.pairingId)
                const family = familiesMap.get(p.familyId) || { name: 'Unknown Family' }
                const mentor = usersMap.get(p.mentorId) || { name: 'Unknown Mentor' }
                pairingData = { ...p, id: sub.pairingId, family, mentor }
            }

            const bonusActivities = (sub.bonusActivityIds || []).map(id => {
                const b = bonusesMap.get(id)
                return b ? { bonusActivity: { ...b, id } } : null
            }).filter(Boolean)

            return {
                ...sub,
                submitter: { ...submitter, id: sub.submitterId },
                pairing: pairingData,
                bonusActivities,
                // Serialize dates
                createdAt: sub.createdAt.toDate(),
                updatedAt: sub.updatedAt.toDate(),
                reviewedAt: sub.reviewedAt?.toDate() || null
            }
        })

        return submissions
    } catch (error) {
        console.error('Failed to fetch submissions:', error)
        return []
    }
}
