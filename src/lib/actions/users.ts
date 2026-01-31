'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { UserRole } from '@prisma/client'
import { deleteUser as deleteFirebaseUser } from '@/lib/firebase-admin'

export type UserResult = {
    success: boolean
    error?: string
    userId?: string
}

/**
 * Get all users with optional role filter
 */
export async function getUsers(role?: UserRole) {
    try {
        const users = await prisma.user.findMany({
            where: role ? { role } : undefined,
            include: {
                family: true,
                mentorPairings: {
                    include: {
                        mentees: { include: { mentee: true } },
                        family: true,
                    }
                },
                menteePairings: {
                    include: {
                        pairing: {
                            include: {
                                mentor: true,
                                family: true,
                            }
                        }
                    }
                },
            },
            orderBy: { name: 'asc' }
        })

        return users
    } catch (error) {
        console.error('Failed to fetch users:', error)
        return []
    }
}

/**
 * Get a single user by ID
 */
export async function getUser(userId: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                family: true,
                mentorPairings: {
                    include: {
                        mentees: { include: { mentee: true } },
                        family: true,
                        submissions: true,
                    }
                },
                menteePairings: {
                    include: {
                        pairing: {
                            include: {
                                mentor: true,
                                family: true,
                                submissions: true,
                            }
                        }
                    }
                },
            }
        })

        return user
    } catch (error) {
        console.error('Failed to fetch user:', error)
        return null
    }
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(userId: string, newRole: UserRole): Promise<UserResult> {
    // Verify admin user
    let adminUser
    try {
        adminUser = await requireAdmin()
    } catch {
        return { success: false, error: 'Only admins can change user roles' }
    }

    try {
        // Prevent self-demotion from admin
        if (userId === adminUser.id && newRole !== 'ADMIN') {
            return { success: false, error: 'You cannot change your own admin role' }
        }

        // Update user role
        await prisma.user.update({
            where: { id: userId },
            data: { role: newRole }
        })

        // Create audit log
        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entityType: 'User',
                entityId: userId,
                actorId: adminUser.id,
                afterValue: { role: newRole },
            }
        })

        revalidatePath('/admin/users')

        return { success: true, userId }
    } catch (error) {
        console.error('Role update error:', error)
        return { success: false, error: 'Failed to update user role' }
    }
}

/**
 * Update user's family assignment (admin only)
 */
export async function updateUserFamily(userId: string, familyId: string | null): Promise<UserResult> {
    // Verify admin user
    let adminUser
    try {
        adminUser = await requireAdmin()
    } catch {
        return { success: false, error: 'Only admins can change user families' }
    }

    try {
        // Verify family exists if provided
        if (familyId) {
            const family = await prisma.family.findUnique({
                where: { id: familyId }
            })
            if (!family) {
                return { success: false, error: 'Family not found' }
            }
        }

        // Update user family
        await prisma.user.update({
            where: { id: userId },
            data: { familyId }
        })

        // Create audit log
        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entityType: 'User',
                entityId: userId,
                actorId: adminUser.id,
                afterValue: { familyId },
            }
        })

        revalidatePath('/admin/users')

        return { success: true, userId }
    } catch (error) {
        console.error('Family update error:', error)
        return { success: false, error: 'Failed to update user family' }
    }
}

/**
 * Delete a user (admin only)
 */
export async function deleteUser(userId: string): Promise<UserResult> {
    // Verify admin user
    let adminUser
    try {
        adminUser = await requireAdmin()
    } catch {
        return { success: false, error: 'Only admins can delete users' }
    }

    try {
        // Prevent self-deletion
        if (userId === adminUser.id) {
            return { success: false, error: 'You cannot delete your own account' }
        }

        // Get user before deletion for audit log
        const userToDelete = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!userToDelete) {
            return { success: false, error: 'User not found' }
        }

        // Delete user from database (cascade will handle related records)
        await prisma.user.delete({
            where: { id: userId }
        })

        // Also delete from Firebase Auth
        try {
            await deleteFirebaseUser(userId)
        } catch (firebaseError) {
            console.warn('Failed to delete Firebase user (may not exist):', firebaseError)
        }

        // Create audit log
        await prisma.auditLog.create({
            data: {
                action: 'DELETE',
                entityType: 'User',
                entityId: userId,
                actorId: adminUser.id,
                beforeValue: { email: userToDelete.email, name: userToDelete.name },
            }
        })

        revalidatePath('/admin/users')

        return { success: true, userId }
    } catch (error) {
        console.error('User deletion error:', error)
        return { success: false, error: 'Failed to delete user' }
    }
}
