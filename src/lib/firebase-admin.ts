import 'server-only'

import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth, Auth } from 'firebase-admin/auth'
import { getStorage, Storage } from 'firebase-admin/storage'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin SDK
function initFirebaseAdmin(): { adminAuth: Auth; adminStorage: Storage; adminDb: Firestore; app: App } {
    const apps = getApps()

    // Determine configuration
    let app: App

    if (apps.length > 0) {
        app = apps[0]
    } else {
        const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
        const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
        // Handle escaped newlines in private key
        const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

        if (!projectId || !clientEmail || !privateKey) {
            throw new Error('Missing Firebase Admin credentials in environment variables')
        }

        app = initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                privateKey,
            }),
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        })
    }

    return {
        adminAuth: getAuth(app),
        adminStorage: getStorage(app),
        adminDb: getFirestore(app),
        app
    }
}

// Singleton instances
const { adminAuth, adminStorage, adminDb } = initFirebaseAdmin()

export { adminAuth, adminStorage, adminDb }

/**
 * Verify a Firebase ID token
 */
export async function verifyIdToken(idToken: string) {
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken)
        return { user: decodedToken, error: null }
    } catch (error) {
        console.error('Error verifying Firebase ID token:', error)
        return { user: null, error }
    }
}

/**
 * Get a user by email
 */
export async function getUserByEmail(email: string) {
    try {
        const user = await adminAuth.getUserByEmail(email)
        return user
    } catch (error) {
        return null
    }
}

/**
 * Create a new user
 */
export async function createFirebaseUser(email: string, password: string, displayName: string) {
    try {
        const user = await adminAuth.createUser({
            email,
            password,
            displayName,
            emailVerified: false,
        })
        return { user, error: null }
    } catch (error) {
        console.error('Error creating Firebase user:', error)
        return { user: null, error }
    }
}

/**
 * Delete a user
 */
export async function deleteFirebaseUser(uid: string) {
    try {
        await adminAuth.deleteUser(uid)
        return { success: true, error: null }
    } catch (error) {
        return { success: false, error }
    }
}

/**
 * Upload a file to Firebase Storage
 */
export async function uploadFile(
    buffer: Buffer,
    destination: string,
    contentType: string
): Promise<{ url: string; path: string } | null> {
    try {
        const bucket = adminStorage.bucket()
        const file = bucket.file(destination)

        await file.save(buffer, {
            contentType,
            public: true, // Make public
            metadata: {
                contentType,
            }
        })

        // Generate public URL
        // Note: For production, consider using signed URLs or ensuring bucket is public
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`

        // Simpler public URL format if bucket is public logic enabled:
        // https://firebasestorage.googleapis.com/v0/b/[bucket]/o/[path]?alt=media
        // But the googleapis.com link works if object is ACL public.

        return { url: publicUrl, path: destination }
    } catch (error) {
        console.error('Error uploading file to Firebase Storage:', error)
        return null
    }
}

/**
 * Delete a file from Firebase Storage
 */
export async function deleteFile(path: string): Promise<void> {
    try {
        const bucket = adminStorage.bucket()
        const file = bucket.file(path)
        await file.delete()
    } catch (error) {
        console.error('Error deleting file from Firebase Storage:', error)
        // Don't throw, just log
    }
}
