import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { adminDb } from '@/lib/firebase-admin'
import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
    try {
        // Check Authorization header first
        const authHeader = request.headers.get('Authorization')
        const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

        let uid: string | null = null

        if (idToken) {
            const { user: firebaseUser, error } = await verifyIdToken(idToken)
            if (!error && firebaseUser) {
                uid = firebaseUser.uid
            }
        }

        if (!uid) {
            // Try session cookie via helper
            const authUser = await getAuthenticatedUser()
            if (authUser) {
                uid = authUser.id
            }
        }

        if (!uid) {
            return NextResponse.json(null, { status: 401 })
        }

        const userDoc = await adminDb.collection('users').doc(uid).get()

        if (!userDoc.exists) {
            return NextResponse.json(null, { status: 404 })
        }

        const userData = userDoc.data()

        return NextResponse.json({
            id: uid,
            name: userData?.name,
            email: userData?.email,
            role: userData?.role
        })
    } catch (error) {
        console.error('Error fetching user:', error)
        return NextResponse.json(null, { status: 500 })
    }
}
