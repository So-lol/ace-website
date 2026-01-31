import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
    try {
        // Check Authorization header first
        const authHeader = request.headers.get('Authorization')
        const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

        if (!idToken) {
            // Try to get user from session cookie via helper
            const authUser = await getAuthenticatedUser()
            if (!authUser) {
                return NextResponse.json(null, { status: 401 })
            }
            return NextResponse.json({
                id: authUser.id,
                name: authUser.name,
                email: authUser.email,
                role: authUser.role,
            })
        }

        // Verify the ID token
        const { user: firebaseUser, error } = await verifyIdToken(idToken)
        if (error || !firebaseUser?.email) {
            return NextResponse.json(null, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: firebaseUser.email },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            }
        })

        if (!user) {
            return NextResponse.json(null, { status: 404 })
        }

        return NextResponse.json(user)
    } catch (error) {
        console.error('Error fetching user:', error)
        return NextResponse.json(null, { status: 500 })
    }
}
