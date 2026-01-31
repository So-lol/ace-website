import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export async function getSession() {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
        console.error('Error getting session:', error)
        return null
    }

    return session
}

export async function getCurrentUser() {
    const supabase = await createClient()
    const { data: { user: authUser }, error } = await supabase.auth.getUser()

    if (error || !authUser) {
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

export async function requireAuth() {
    const user = await getCurrentUser()
    if (!user) {
        throw new Error('Unauthorized')
    }
    return user
}

export async function requireAdmin() {
    const user = await getCurrentUser()
    if (!user || user.role !== UserRole.ADMIN) {
        throw new Error('Forbidden: Admin access required')
    }
    return user
}
