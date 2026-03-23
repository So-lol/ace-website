'use server'

import { getAuthenticatedUser, requireAdmin } from '@/lib/auth-helpers'
import { uploadFile, deleteFile, adminDb, getFileReadUrl, fileExists } from '@/lib/firebase-admin'
import { revalidatePath } from 'next/cache'
import { Timestamp, FieldValue, FieldPath } from 'firebase-admin/firestore'
import { SubmissionDoc, PairingDoc, SubmissionStatus } from '@/types/firestore'
import { getErrorMessage } from '@/lib/errors'

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

type SubmissionUploadState = 'UPLOADING' | 'UPLOADED' | 'FAILED'

type StoredDocumentData = Record<string, unknown>

export interface AdminSubmissionListItem {
    id: string
    pairingId?: string
    familyId?: string
    submitterId: string
    weekNumber: number
    year: number
    imageUrl: string
    imagePath: string
    status: SubmissionStatus
    basePoints: number
    bonusPoints: number
    totalPoints: number
    reviewReason?: string
    bonusActivityIds: string[]
    createdAt: Date
    updatedAt: Date
    reviewedAt: Date | null
    submitter: {
        id: string
        name: string
        email: string
    }
    pairing: {
        id: string
        family: {
            name: string
        }
        mentor: {
            name: string
        }
        menteeIds: string[]
    } | null
    bonusActivities: Array<{
        bonusActivity: {
            id: string
            name?: string
        }
    }>
}

export interface UserSubmissionListItem {
    id: string
    weekNumber: number
    year: number
    status: SubmissionStatus
    basePoints: number
    bonusPoints: number
    totalPoints: number
    imageUrl: string
    createdAt: Date
    reviewedAt: Date | null
    reviewReason?: string
    bonuses: string[]
    uploadState: SubmissionUploadState
    uploadError?: string
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
    const contentType = getSubmissionContentType(file)
    if (!contentType) {
        return { success: false, error: 'Invalid file type. Please upload JPG, PNG, WebP, HEIC, or HEIF.' }
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
        return { success: false, error: 'File too large. Maximum size is 10MB.' }
    }

    // Generate unique filename
    const timestamp = Date.now()
    const extension = getFileExtension(file)
    const fileName = `submissions/${user.id}/${timestamp}.${extension}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Firebase Storage
    const result = await uploadFile(buffer, fileName, contentType, {
        originalFileName: file.name,
        uploadedBy: user.id,
    })

    if (!result) {
        return { success: false, error: 'Failed to upload image. Please try again.' }
    }

    return {
        success: true,
        imageUrl: result.url,
        imagePath: result.path,
    }
}

function getFileExtension(file: File) {
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (extension) {
        return extension
    }

    switch (file.type) {
        case 'image/png':
            return 'png'
        case 'image/webp':
            return 'webp'
        case 'image/heic':
            return 'heic'
        case 'image/heif':
            return 'heif'
        default:
            return 'jpg'
    }
}

function getSubmissionContentType(file: File) {
    const normalizedType = file.type.toLowerCase()

    switch (normalizedType) {
        case 'image/jpeg':
        case 'image/png':
        case 'image/webp':
        case 'image/heic':
        case 'image/heif':
            return normalizedType
        default:
            break
    }

    switch (getFileExtension(file)) {
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg'
        case 'png':
            return 'image/png'
        case 'webp':
            return 'image/webp'
        case 'heic':
            return 'image/heic'
        case 'heif':
            return 'image/heif'
        default:
            return null
    }
}

async function resolvePairingForUser(userId: string) {
    const pairingsRef = adminDb.collection('pairings')
    let snapshot = await pairingsRef.where('mentorId', '==', userId).limit(1).get()

    if (snapshot.empty) {
        snapshot = await pairingsRef.where('menteeIds', 'array-contains', userId).limit(1).get()
    }

    if (snapshot.empty) {
        return null
    }

    return snapshot.docs[0]
}

async function resolveFamilyForFamilyHead(userId: string) {
    let snapshot = await adminDb.collection('families').where('familyHeadIds', 'array-contains', userId).limit(1).get()

    if (snapshot.empty) {
        snapshot = await adminDb.collection('families').where('familyHeadId', '==', userId).limit(1).get()
    }

    if (snapshot.empty) {
        return null
    }

    return snapshot.docs[0]
}

async function resolveSubmissionContextForUser(userId: string) {
    const pairingDoc = await resolvePairingForUser(userId)
    if (pairingDoc) {
        const pairingData = pairingDoc.data() as PairingDoc
        return {
            pairingId: pairingDoc.id,
            familyId: pairingData.familyId,
            scope: 'PAIRING' as const,
        }
    }

    const familyDoc = await resolveFamilyForFamilyHead(userId)
    if (familyDoc) {
        return {
            pairingId: undefined,
            familyId: familyDoc.id,
            scope: 'FAMILY' as const,
        }
    }

    return null
}

async function calculateSubmissionPoints(bonusActivityIds: string[]) {
    const uniqueBonusIds = Array.from(new Set(bonusActivityIds))

    if (uniqueBonusIds.length !== bonusActivityIds.length) {
        throw new Error('Duplicate bonus selections are not allowed.')
    }

    if (uniqueBonusIds.length > 10) {
        throw new Error('Too many bonus activities selected.')
    }

    const basePoints = 10
    let bonusPoints = 0

    if (uniqueBonusIds.length > 0) {
        const bonusesSnap = await adminDb.collection('bonusActivities')
            .where(FieldPath.documentId(), 'in', uniqueBonusIds)
            .get()

        if (bonusesSnap.size !== uniqueBonusIds.length) {
            throw new Error('One or more selected bonus activities are invalid.')
        }

        bonusesSnap.forEach(doc => {
            const data = doc.data()
            if (!data.isActive) {
                throw new Error('Selected bonus activities must be active.')
            }
            bonusPoints += (data.points || 0)
        })
    }

    return {
        basePoints,
        bonusPoints,
        totalPoints: basePoints + bonusPoints,
        uniqueBonusIds,
    }
}

function getSubmissionDocId(pairingId: string, year: number, weekNumber: number) {
    return `${pairingId}_${year}_${weekNumber}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export async function submitPhotoSubmission(formData: FormData): Promise<SubmissionResult> {
    const user = await getAuthenticatedUser()
    if (!user) {
        return { success: false, error: 'You must be logged in to submit' }
    }

    const file = formData.get('file')
    if (!(file instanceof File)) {
        return { success: false, error: 'Please choose a photo to upload.' }
    }

    const weekNumberValue = formData.get('weekNumber')
    const yearValue = formData.get('year')
    const weekNumber = Number(weekNumberValue)
    const year = Number(yearValue)
    const bonusActivityIds = formData.getAll('bonusActivityIds').map((value) => String(value))

    if (!Number.isInteger(weekNumber) || !Number.isInteger(year)) {
        return { success: false, error: 'Invalid submission details. Please try again.' }
    }

    const contentType = getSubmissionContentType(file)
    if (!contentType) {
        return { success: false, error: 'Invalid file type. Please upload JPG, PNG, WebP, HEIC, or HEIF.' }
    }

    if (file.size > 10 * 1024 * 1024) {
        return { success: false, error: 'File too large. Maximum size is 10MB.' }
    }

    try {
        const submissionContext = await resolveSubmissionContextForUser(user.id)
        if (!submissionContext) {
            return { success: false, error: 'You are not part of a pairing or assigned as a family head yet. Please contact an admin.' }
        }

        const ownerId = submissionContext.pairingId || submissionContext.familyId
        if (!ownerId) {
            return { success: false, error: 'Unable to determine where this submission should be attached.' }
        }

        const submissionId = getSubmissionDocId(ownerId, year, weekNumber)
        const submissionRef = adminDb.collection('submissions').doc(submissionId)
        const extension = getFileExtension(file)
        const imagePath = `submissions/${submissionContext.scope.toLowerCase()}s/${ownerId}/${year}/week-${weekNumber}/${submissionId}.${extension}`
        const { basePoints, bonusPoints, totalPoints, uniqueBonusIds } = await calculateSubmissionPoints(bonusActivityIds)
        const now = Timestamp.now()

        await adminDb.runTransaction(async (transaction) => {
            const submissionData: Omit<SubmissionDoc, 'id'> = {
                submitterId: user.id,
                weekNumber,
                year,
                imageUrl: '',
                imagePath,
                status: 'PENDING',
                basePoints,
                bonusPoints,
                totalPoints,
                bonusActivityIds: uniqueBonusIds,
                uploadState: 'UPLOADING',
                createdAt: now,
                updatedAt: now,
            }

            if (submissionContext.pairingId) {
                submissionData.pairingId = submissionContext.pairingId
            }

            if (submissionContext.familyId) {
                submissionData.familyId = submissionContext.familyId
            }

            transaction.set(submissionRef, submissionData)
        })

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const uploadResult = await uploadFile(buffer, imagePath, contentType, {
            originalFileName: file.name,
            uploadedBy: user.id,
            submissionId,
        })

        if (!uploadResult || !(await fileExists(imagePath))) {
            await submissionRef.set({
                uploadState: 'FAILED',
                uploadError: 'Upload verification failed.',
                updatedAt: Timestamp.now(),
            }, { merge: true })

            return { success: false, error: 'Failed to upload image. Please try again.' }
        }

        await submissionRef.set({
            uploadState: 'UPLOADED',
            uploadError: null,
            uploadedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        }, { merge: true })

        revalidatePath('/dashboard')
        revalidatePath('/dashboard/submissions')
        revalidatePath('/admin')
        revalidatePath('/admin/submissions')
        revalidatePath('/admin/media')

        return {
            success: true,
            submissionId,
        }
    } catch (error) {
        console.error('Photo submission error:', error)
        return { success: false, error: getErrorMessage(error, 'Failed to submit photo. Please try again.') }
    }
}

/**
 * Get a user's submission history
 */
export async function getUserSubmissions(userId: string): Promise<UserSubmissionListItem[]> {
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

        const submissions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Array<SubmissionDoc & { id: string }>

        const bonusIds = Array.from(new Set(submissions.flatMap(submission => submission.bonusActivityIds || [])))
        const bonusNameMap = new Map<string, string>()

        if (bonusIds.length > 0) {
            const bonusRefs = bonusIds.map(id => adminDb.collection('bonusActivities').doc(id))
            const bonusSnapshots = await adminDb.getAll(...bonusRefs)

            bonusSnapshots.forEach((bonusSnapshot) => {
                if (bonusSnapshot.exists) {
                    bonusNameMap.set(bonusSnapshot.id, String(bonusSnapshot.data()?.name || 'Bonus'))
                }
            })
        }

        return await Promise.all(submissions.map(async (submission) => ({
            id: submission.id,
            weekNumber: submission.weekNumber,
            year: submission.year,
            status: submission.status,
            basePoints: submission.basePoints,
            bonusPoints: submission.bonusPoints,
            totalPoints: submission.totalPoints,
            imageUrl: await getFileReadUrl(submission.imagePath),
            createdAt: submission.createdAt?.toDate?.() || new Date(),
            reviewedAt: submission.reviewedAt?.toDate?.() || null,
            reviewReason: submission.reviewReason,
            bonuses: (submission.bonusActivityIds || []).map(id => bonusNameMap.get(id) || 'Bonus'),
            uploadState: submission.uploadState || 'UPLOADED',
            uploadError: submission.uploadError,
        })))
    } catch (error) {
        console.error('Error fetching user submissions:', error)
        return []
    }
}

/**
 * Create a submission record after successful upload
 */
export async function createSubmission(
    _imageUrl: string,
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
            return { success: false, error: 'You are not part of a pairing or assigned as a family head yet. Please contact an admin.' }
        }

        const pairingDoc = snapshot.docs[0]
        const pairingId = pairingDoc.id

        // Calculate points
        const basePoints = 10
        let bonusPoints = 0

        if (bonusActivityIds.length > 0) {
            const uniqueBonusIds = Array.from(new Set(bonusActivityIds))

            if (uniqueBonusIds.length !== bonusActivityIds.length) {
                return { success: false, error: 'Duplicate bonus selections are not allowed.' }
            }

            if (uniqueBonusIds.length > 10) {
                return { success: false, error: 'Too many bonus activities selected.' }
            }

            const bonusesSnap = await adminDb.collection('bonusActivities')
                .where(FieldPath.documentId(), 'in', uniqueBonusIds)
                .get()

            if (bonusesSnap.size !== uniqueBonusIds.length) {
                return { success: false, error: 'One or more selected bonus activities are invalid.' }
            }

            bonusesSnap.forEach(doc => {
                const data = doc.data()
                if (!data.isActive) {
                    throw new Error('Selected bonus activities must be active.')
                }
                bonusPoints += (data.points || 0)
            })
        }

        const totalPoints = basePoints + bonusPoints

        // Create submission
        const newSubmission: Omit<SubmissionDoc, 'id'> = {
            pairingId,
            familyId: (pairingDoc.data() as PairingDoc).familyId,
            submitterId: user.id,
            weekNumber,
            year,
            imageUrl: '',
            imagePath,
            status: 'PENDING',
            basePoints,
            bonusPoints,
            totalPoints,
            bonusActivityIds: Array.from(new Set(bonusActivityIds)),
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

            if (submissionData.uploadState !== 'UPLOADED') {
                throw new Error('Submission image is not fully uploaded')
            }

            const pairingRef = submissionData.pairingId
                ? adminDb.collection('pairings').doc(submissionData.pairingId)
                : null
            const pairingSnap = pairingRef ? await transaction.get(pairingRef) : null
            const familyId = submissionData.familyId || (pairingSnap?.exists ? (pairingSnap.data() as PairingDoc).familyId : null)

            if (!familyId) {
                throw new Error('Family not found for submission')
            }

            if (submissionData.pairingId && (!pairingSnap || !pairingSnap.exists)) {
                throw new Error('Pairing not found for submission')
            }

            const familyRef = adminDb.collection('families').doc(familyId)
            const familySnap = await transaction.get(familyRef)

            if (!familySnap.exists) {
                throw new Error('Family not found for submission pairing')
            }

            // Firestore transactions require all reads to happen before writes.
            transaction.update(submissionRef, {
                status: 'APPROVED',
                reviewerId: adminUser.id,
                reviewedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            })

            if (pairingRef) {
                transaction.update(pairingRef, {
                    weeklyPoints: FieldValue.increment(submissionData.totalPoints),
                    totalPoints: FieldValue.increment(submissionData.totalPoints),
                    updatedAt: Timestamp.now(),
                })
            }

            transaction.update(familyRef, {
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

        revalidatePath('/admin')
        revalidatePath('/admin/submissions')
        revalidatePath('/admin/media')
        revalidatePath('/dashboard')
        revalidatePath('/dashboard/submissions')
        revalidatePath('/leaderboard')

        return { success: true, submissionId }
    } catch (error: unknown) {
        console.error('Approval error:', error)
        return { success: false, error: getErrorMessage(error, 'Failed to approve submission') }
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

            if (submissionData.uploadState !== 'UPLOADED') {
                throw new Error('Submission image is not fully uploaded')
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

        revalidatePath('/admin')
        revalidatePath('/admin/submissions')
        revalidatePath('/dashboard')
        revalidatePath('/dashboard/submissions')

        return { success: true, submissionId }
    } catch (error: unknown) {
        console.error('Rejection error:', error)
        return { success: false, error: getErrorMessage(error, 'Failed to reject submission') }
    }
}

/**
 * Get submissions for admin review
 * Note: Returns manually constructed object with joined data
 */
export async function getSubmissions(status?: SubmissionStatus): Promise<AdminSubmissionListItem[]> {
    try {
        // Secure action: Only admins can view all submissions
        await requireAdmin()

        let query = adminDb.collection('submissions').orderBy('createdAt', 'desc')
        if (status) { // orderBy status needs index if mixed with createdAt
            query = query.where('status', '==', status)
        }

        const snapshot = await query.get()
        const submissionsData = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as SubmissionDoc & { id: string }))
            .filter(submission => (submission.uploadState || 'UPLOADED') === 'UPLOADED')

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

            const map = new Map<string, StoredDocumentData>()
            snaps.forEach(snap => {
                if (snap.exists) {
                    map.set(snap.id, snap.data() as StoredDocumentData)
                }
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

        submissionsData.forEach(sub => {
            if (sub.familyId) familyIds.add(sub.familyId)
        })

        pairingsMap.forEach((pairing) => {
            const pairingData = pairing as PairingDoc
            if (pairingData.familyId) familyIds.add(pairingData.familyId)
            if (pairingData.mentorId) mentorIds.add(pairingData.mentorId)
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
                const pairing = pairingsMap.get(sub.pairingId) as PairingDoc
                const family = familiesMap.get(pairing.familyId) || { name: 'Unknown Family' }
                const mentor = usersMap.get(pairing.mentorId) || { name: 'Unknown Mentor' }
                pairingData = {
                    id: sub.pairingId,
                    family: { name: String(family.name || 'Unknown Family') },
                    mentor: { name: String(mentor.name || 'Unknown Mentor') },
                    menteeIds: pairing.menteeIds || [],
                }
            } else if (sub.familyId) {
                const family = familiesMap.get(sub.familyId) || { name: 'Unknown Family' }
                pairingData = {
                    id: `family:${sub.familyId}`,
                    family: { name: String(family.name || 'Unknown Family') },
                    mentor: { name: typeof submitter.name === 'string' ? submitter.name : 'Family Head' },
                    menteeIds: [],
                }
            }

            const bonusActivities: AdminSubmissionListItem['bonusActivities'] = (sub.bonusActivityIds || []).reduce((acc, id) => {
                const b = bonusesMap.get(id)
                if (b) {
                    acc.push({
                        bonusActivity: {
                            id,
                            name: typeof b.name === 'string' ? b.name : undefined,
                        },
                    })
                }
                return acc
            }, [] as AdminSubmissionListItem['bonusActivities'])

            return {
                id: sub.id,
                pairingId: sub.pairingId,
                familyId: sub.familyId,
                submitterId: sub.submitterId,
                weekNumber: sub.weekNumber,
                year: sub.year,
                imageUrl: sub.imageUrl,
                imagePath: sub.imagePath,
                status: sub.status,
                basePoints: sub.basePoints,
                bonusPoints: sub.bonusPoints,
                totalPoints: sub.totalPoints,
                reviewReason: sub.reviewReason,
                bonusActivityIds: sub.bonusActivityIds || [],
                submitter: {
                    id: sub.submitterId,
                    name: typeof submitter.name === 'string' ? submitter.name : 'Unknown',
                    email: typeof submitter.email === 'string' ? submitter.email : 'unknown',
                },
                pairing: pairingData,
                bonusActivities,
                // Serialize dates
                createdAt: sub.createdAt.toDate(),
                updatedAt: sub.updatedAt.toDate(),
                reviewedAt: sub.reviewedAt?.toDate() || null
            }
        })

        return await Promise.all(submissions.map(async (submission) => ({
            ...submission,
            imageUrl: await getFileReadUrl(submission.imagePath),
        })))
    } catch (error) {
        console.error('Failed to fetch submissions:', error)
        return []
    }
}
