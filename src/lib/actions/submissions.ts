'use server'

import { getAuthenticatedUser, requireAdmin } from '@/lib/auth-helpers'
import { uploadFile, deleteFile } from '@/lib/firebase-admin'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

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
        // Find user in our database with pairings
        const dbUser = await prisma.user.findUnique({
            where: { email: user.email.toLowerCase() },
            include: {
                menteePairings: {
                    include: { pairing: true }
                },
                mentorPairings: true,
            }
        })

        if (!dbUser) {
            return { success: false, error: 'User profile not found' }
        }

        // Find user's pairing (as mentor or mentee)
        let pairingId: string | null = null

        if (dbUser.mentorPairings.length > 0) {
            pairingId = dbUser.mentorPairings[0].id
        } else if (dbUser.menteePairings.length > 0) {
            pairingId = dbUser.menteePairings[0].pairing.id
        }

        if (!pairingId) {
            return { success: false, error: 'You are not part of a pairing yet. Please contact an admin.' }
        }

        // Calculate points
        const basePoints = 10
        const bonusActivities = await prisma.bonusActivity.findMany({
            where: {
                id: { in: bonusActivityIds },
                isActive: true,
            }
        })
        const bonusPoints = bonusActivities.reduce((sum, b) => sum + b.points, 0)
        const totalPoints = basePoints + bonusPoints

        // Create submission
        const submission = await prisma.submission.create({
            data: {
                pairingId,
                submitterId: dbUser.id,
                weekNumber,
                year,
                imageUrl,
                imagePath,
                basePoints,
                bonusPoints,
                totalPoints,
                bonusActivities: {
                    create: bonusActivities.map(b => ({
                        bonusActivityId: b.id,
                        pointsAwarded: b.points,
                    }))
                }
            }
        })

        revalidatePath('/dashboard')
        revalidatePath('/dashboard/submissions')

        return {
            success: true,
            submissionId: submission.id,
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
    // Verify admin user
    let adminUser
    try {
        adminUser = await requireAdmin()
    } catch {
        return { success: false, error: 'Only admins can approve submissions' }
    }

    try {
        // Get the submission
        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
            include: { pairing: true }
        })

        if (!submission) {
            return { success: false, error: 'Submission not found' }
        }

        if (submission.status !== 'PENDING') {
            return { success: false, error: 'Submission has already been reviewed' }
        }

        // Approve the submission
        await prisma.submission.update({
            where: { id: submissionId },
            data: {
                status: 'APPROVED',
                reviewerId: adminUser.id,
                reviewedAt: new Date(),
            }
        })

        // Update pairing points
        await prisma.pairing.update({
            where: { id: submission.pairingId },
            data: {
                weeklyPoints: { increment: submission.totalPoints },
                totalPoints: { increment: submission.totalPoints },
            }
        })

        // Create audit log
        await prisma.auditLog.create({
            data: {
                action: 'APPROVE',
                entityType: 'Submission',
                entityId: submissionId,
                actorId: adminUser.id,
                afterValue: { status: 'APPROVED', points: submission.totalPoints },
            }
        })

        revalidatePath('/admin/submissions')
        revalidatePath('/leaderboard')

        return { success: true, submissionId }
    } catch (error) {
        console.error('Approval error:', error)
        return { success: false, error: 'Failed to approve submission' }
    }
}

/**
 * Reject a submission (admin only)
 */
export async function rejectSubmission(submissionId: string, reason: string): Promise<SubmissionResult> {
    // Verify admin user
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
        // Get the submission
        const submission = await prisma.submission.findUnique({
            where: { id: submissionId }
        })

        if (!submission) {
            return { success: false, error: 'Submission not found' }
        }

        if (submission.status !== 'PENDING') {
            return { success: false, error: 'Submission has already been reviewed' }
        }

        // Reject the submission
        await prisma.submission.update({
            where: { id: submissionId },
            data: {
                status: 'REJECTED',
                reviewerId: adminUser.id,
                reviewReason: reason.trim(),
                reviewedAt: new Date(),
                basePoints: 0,
                bonusPoints: 0,
                totalPoints: 0,
            }
        })

        // Create audit log
        await prisma.auditLog.create({
            data: {
                action: 'REJECT',
                entityType: 'Submission',
                entityId: submissionId,
                actorId: adminUser.id,
                afterValue: { status: 'REJECTED', reason: reason.trim() },
            }
        })

        revalidatePath('/admin/submissions')

        return { success: true, submissionId }
    } catch (error) {
        console.error('Rejection error:', error)
        return { success: false, error: 'Failed to reject submission' }
    }
}

/**
 * Get submissions for admin review
 */
export async function getSubmissions(status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    try {
        const submissions = await prisma.submission.findMany({
            where: status ? { status } : undefined,
            include: {
                pairing: {
                    include: {
                        mentor: true,
                        mentees: { include: { mentee: true } },
                        family: true,
                    }
                },
                submitter: true,
                reviewer: true,
                bonusActivities: {
                    include: { bonusActivity: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return submissions
    } catch (error) {
        console.error('Failed to fetch submissions:', error)
        return []
    }
}
