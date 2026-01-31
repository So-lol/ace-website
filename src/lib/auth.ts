import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

/**
 * @deprecated Use getAuthenticatedUser from @/lib/auth-helpers for server actions
 * This file provides backward compatibility for page components
 */

export async function getCurrentUser() {
    const authUser = await getAuthenticatedUser()

    if (!authUser) {
        return null
    }

    // Get user from database with all relations
    const user = await prisma.user.findUnique({
        where: { email: authUser.email },
        include: {
            family: true,
            mentorPairings: {
                include: {
                    mentees: {
                        include: {
                            mentee: true
                        }
                    },
                    family: true
                }
            },
            menteePairings: {
                include: {
                    pairing: {
                        include: {
                            mentor: true,
                            family: true
                        }
                    }
                }
            }
        }
    })

    return user
}

export async function isAdmin() {
    const user = await getCurrentUser()
    return user?.role === UserRole.ADMIN
}

export async function isMentor() {
    const user = await getCurrentUser()
    return user?.role === UserRole.MENTOR
}

export async function isMentee() {
    const user = await getCurrentUser()
    return user?.role === UserRole.MENTEE
}

export { getAuthenticatedUser as getSession }
