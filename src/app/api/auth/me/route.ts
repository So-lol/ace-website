import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { adminDb } from '@/lib/firebase-admin'
import { NextRequest, NextResponse } from 'next/server'
import { verifyCanonicalIdToken } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
    'Cache-Control': 'private, no-store, max-age=0',
}

export async function GET(request: NextRequest) {
    try {
        // Check Authorization header first
        const authHeader = request.headers.get('Authorization')
        const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

        let uid: string | null = null

        if (idToken) {
            const { user: firebaseUser, error } = await verifyCanonicalIdToken(idToken)
            if (error) {
                return NextResponse.json(null, { status: 401, headers: noStoreHeaders })
            }
            if (firebaseUser && firebaseUser.emailVerified && !firebaseUser.disabled) {
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
            return NextResponse.json(null, { status: 401, headers: noStoreHeaders })
        }

        const userDoc = await adminDb.collection('users').doc(uid).get()

        if (!userDoc.exists) {
            return NextResponse.json(null, { status: 404, headers: noStoreHeaders })
        }

        const userData = userDoc.data()

        return NextResponse.json({
            id: uid,
            name: userData?.name,
            email: userData?.email,
            role: userData?.role
        }, { headers: noStoreHeaders })
    } catch (error) {
        console.error('Error fetching user:', error)
        return NextResponse.json(null, { status: 500, headers: noStoreHeaders })
    }
}
