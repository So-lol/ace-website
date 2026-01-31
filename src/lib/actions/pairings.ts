'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type PairingResult = {
    success: boolean
    error?: string
    pairingId?: string
}

/**
 * Get all pairings with related data
 */
export async function getPairings() {
    try {
        const pairings = await prisma.pairing.findMany({
            include: {
                family: true,
                mentor: true,
                mentees: {
                    include: { mentee: true }
                },
                submissions: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return pairings
    } catch (error) {
        console.error('Failed to fetch pairings:', error)
        return []
    }
}

/**
 * Get a single pairing by ID
 */
export async function getPairing(pairingId: string) {
    try {
        const pairing = await prisma.pairing.findUnique({
            where: { id: pairingId },
            include: {
                family: true,
                mentor: true,
                mentees: {
                    include: { mentee: true }
                },
                submissions: {
                    include: {
                        submitter: true,
                        bonusActivities: {
                            include: { bonusActivity: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        })

        return pairing
    } catch (error) {
        console.error('Failed to fetch pairing:', error)
        return null
    }
}

/**
 * Create a new pairing (admin only)
 */
export async function createPairing(
    familyId: string,
    mentorId: string,
    menteeIds: string[]
): Promise<PairingResult> {
    // Verify admin user
    let adminUser
    try {
        adminUser = await requireAdmin()
    } catch {
        return { success: false, error: 'Only admins can create pairings' }
    }

    try {
        // Verify mentor exists and is a mentor
        const mentor = await prisma.user.findUnique({
            where: { id: mentorId }
        })

        if (!mentor) {
            return { success: false, error: 'Mentor not found' }
        }

        if (mentor.role !== 'MENTOR') {
            return { success: false, error: 'Selected user is not a mentor' }
        }

        // Verify mentees exist
        const mentees = await prisma.user.findMany({
            where: { id: { in: menteeIds } }
        })

        if (mentees.length !== menteeIds.length) {
            return { success: false, error: 'One or more mentees not found' }
        }

        // Verify family exists
        const family = await prisma.family.findUnique({
            where: { id: familyId }
        })

        if (!family) {
            return { success: false, error: 'Family not found' }
        }

        // Create pairing
        const pairing = await prisma.pairing.create({
            data: {
                familyId,
                mentorId,
                mentees: {
                    create: menteeIds.map(id => ({ menteeId: id }))
                }
            }
        })

        // Update family assignment for mentor and mentees
        await prisma.user.updateMany({
            where: { id: { in: [mentorId, ...menteeIds] } },
            data: { familyId }
        })

        // Create audit log
        await prisma.auditLog.create({
            data: {
                action: 'CREATE',
                entityType: 'Pairing',
                entityId: pairing.id,
                actorId: adminUser.id,
                afterValue: { familyId, mentorId, menteeIds },
            }
        })

        revalidatePath('/admin/pairings')

        return { success: true, pairingId: pairing.id }
    } catch (error) {
        console.error('Pairing creation error:', error)
        return { success: false, error: 'Failed to create pairing' }
    }
}

/**
 * Delete a pairing (admin only)
 */
export async function deletePairing(pairingId: string): Promise<PairingResult> {
    // Verify admin user
    let adminUser
    try {
        adminUser = await requireAdmin()
    } catch {
        return { success: false, error: 'Only admins can delete pairings' }
    }

    try {
        // Get pairing before deletion
        const pairing = await prisma.pairing.findUnique({
            where: { id: pairingId },
            include: {
                mentor: true,
                mentees: { include: { mentee: true } }
            }
        })

        if (!pairing) {
            return { success: false, error: 'Pairing not found' }
        }

        // Delete pairing (cascade will handle mentees junction)
        await prisma.pairing.delete({
            where: { id: pairingId }
        })

        // Create audit log
        await prisma.auditLog.create({
            data: {
                action: 'DELETE',
                entityType: 'Pairing',
                entityId: pairingId,
                actorId: adminUser.id,
                beforeValue: {
                    mentor: pairing.mentor.name,
                    mentees: pairing.mentees.map(m => m.mentee.name),
                },
            }
        })

        revalidatePath('/admin/pairings')

        return { success: true, pairingId }
    } catch (error) {
        console.error('Pairing deletion error:', error)
        return { success: false, error: 'Failed to delete pairing' }
    }
}

/**
 * Add a mentee to an existing pairing (admin only)
 */
export async function addMenteeToPairing(pairingId: string, menteeId: string): Promise<PairingResult> {
    // Verify admin user
    try {
        await requireAdmin()
    } catch {
        return { success: false, error: 'Only admins can modify pairings' }
    }

    try {
        // Verify pairing exists
        const pairing = await prisma.pairing.findUnique({
            where: { id: pairingId },
            include: { mentees: true }
        })

        if (!pairing) {
            return { success: false, error: 'Pairing not found' }
        }

        // Check max mentees (2)
        if (pairing.mentees.length >= 2) {
            return { success: false, error: 'Pairing already has maximum 2 mentees' }
        }

        // Add mentee
        await prisma.pairingMentee.create({
            data: {
                pairingId,
                menteeId,
            }
        })

        // Update mentee family
        await prisma.user.update({
            where: { id: menteeId },
            data: { familyId: pairing.familyId }
        })

        revalidatePath('/admin/pairings')

        return { success: true, pairingId }
    } catch (error) {
        console.error('Add mentee error:', error)
        return { success: false, error: 'Failed to add mentee' }
    }
}

/**
 * Remove a mentee from a pairing (admin only)
 */
export async function removeMenteeFromPairing(pairingId: string, menteeId: string): Promise<PairingResult> {
    // Verify admin user
    try {
        await requireAdmin()
    } catch {
        return { success: false, error: 'Only admins can modify pairings' }
    }

    try {
        // Remove mentee from pairing
        await prisma.pairingMentee.deleteMany({
            where: {
                pairingId,
                menteeId,
            }
        })

        revalidatePath('/admin/pairings')

        return { success: true, pairingId }
    } catch (error) {
        console.error('Remove mentee error:', error)
        return { success: false, error: 'Failed to remove mentee' }
    }
}
