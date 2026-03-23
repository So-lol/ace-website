'use server'

import { revalidatePath } from 'next/cache'
import { Timestamp } from 'firebase-admin/firestore'
import { getAuthenticatedUser, requireAdmin } from '@/lib/auth-helpers'
import { adminDb, deleteFile, fileExists, getFileReadUrl, uploadFile } from '@/lib/firebase-admin'
import { getErrorMessage } from '@/lib/errors'
import type { HelpRequestDoc } from '@/types/firestore'

export type HelpRequestResult = {
    success: boolean
    error?: string
    requestId?: string
}

export interface AdminHelpRequestListItem {
    id: string
    title: string
    details: string
    imageUrl: string
    imagePath: string
    createdAt: Date
    updatedAt: Date
    submitter: {
        id: string
        name: string
        email: string
    }
}

function getHelpRequestFileExtension(file: File) {
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

function getHelpRequestContentType(file: File) {
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

    switch (getHelpRequestFileExtension(file)) {
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

function getHelpRequestId(userId: string) {
    return `help_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export async function submitHelpRequest(
    file: File,
    title: string,
    details: string
): Promise<HelpRequestResult> {
    const user = await getAuthenticatedUser()
    if (!user) {
        return { success: false, error: 'You must be logged in to submit a help request.' }
    }

    const normalizedTitle = title.trim()
    const normalizedDetails = details.trim()

    if (normalizedTitle.length < 4) {
        return { success: false, error: 'Please enter a short title describing the issue.' }
    }

    if (normalizedTitle.length > 120) {
        return { success: false, error: 'Title must be 120 characters or fewer.' }
    }

    if (normalizedDetails.length > 1000) {
        return { success: false, error: 'Details must be 1000 characters or fewer.' }
    }

    const contentType = getHelpRequestContentType(file)
    if (!contentType) {
        return { success: false, error: 'Invalid file type. Please upload JPG, PNG, WebP, HEIC, or HEIF.' }
    }

    if (file.size > 10 * 1024 * 1024) {
        return { success: false, error: 'File too large. Maximum size is 10MB.' }
    }

    const requestId = getHelpRequestId(user.id)
    const extension = getHelpRequestFileExtension(file)
    const imagePath = `help-requests/${user.id}/${requestId}.${extension}`

    try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const uploadResult = await uploadFile(buffer, imagePath, contentType, {
            originalFileName: file.name,
            uploadedBy: user.id,
            helpRequestId: requestId,
        })

        if (!uploadResult || !(await fileExists(imagePath))) {
            return { success: false, error: 'Failed to upload your screenshot. Please try again.' }
        }

        const now = Timestamp.now()
        const helpRequestData: Omit<HelpRequestDoc, 'id'> = {
            submitterId: user.id,
            title: normalizedTitle,
            details: normalizedDetails,
            imagePath,
            createdAt: now,
            updatedAt: now,
        }

        await adminDb.collection('helpRequests').doc(requestId).set(helpRequestData)

        revalidatePath('/admin')
        revalidatePath('/admin/help')

        return {
            success: true,
            requestId,
        }
    } catch (error) {
        await deleteFile(imagePath)
        console.error('Help request submission error:', error)
        return {
            success: false,
            error: getErrorMessage(error, 'Failed to submit help request. Please try again.'),
        }
    }
}

export async function getHelpRequests(): Promise<AdminHelpRequestListItem[]> {
    await requireAdmin()

    try {
        const snapshot = await adminDb.collection('helpRequests')
            .orderBy('createdAt', 'desc')
            .get()

        const helpRequests = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Array<HelpRequestDoc & { id: string }>

        const submitterIds = Array.from(new Set(helpRequests.map((request) => request.submitterId)))
        const submitterNameMap = new Map<string, { name: string, email: string }>()

        if (submitterIds.length > 0) {
            const userRefs = submitterIds.map((id) => adminDb.collection('users').doc(id))
            const userSnapshots = await adminDb.getAll(...userRefs)

            userSnapshots.forEach((userSnapshot) => {
                if (!userSnapshot.exists) {
                    return
                }

                const userData = userSnapshot.data()
                submitterNameMap.set(userSnapshot.id, {
                    name: String(userData?.name || 'Unknown User'),
                    email: String(userData?.email || 'No email'),
                })
            })
        }

        return await Promise.all(helpRequests.map(async (request) => ({
            id: request.id,
            title: request.title,
            details: request.details || '',
            imageUrl: await getFileReadUrl(request.imagePath),
            imagePath: request.imagePath,
            createdAt: request.createdAt?.toDate?.() || new Date(),
            updatedAt: request.updatedAt?.toDate?.() || new Date(),
            submitter: {
                id: request.submitterId,
                name: submitterNameMap.get(request.submitterId)?.name || 'Unknown User',
                email: submitterNameMap.get(request.submitterId)?.email || 'No email',
            },
        })))
    } catch (error) {
        console.error('Error fetching help requests:', error)
        return []
    }
}
