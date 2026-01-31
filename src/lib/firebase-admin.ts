import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth, Auth } from 'firebase-admin/auth'
import { getStorage, Storage } from 'firebase-admin/storage'

// Initialize Firebase Admin SDK
let app: App
let adminAuth: Auth
let adminStorage: Storage

const getFirebaseAdmin = () => {
    if (getApps().length === 0) {
        // Check for service account credentials
        const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
        const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
        const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

        if (!projectId || !clientEmail || !privateKey) {
            throw new Error(
                'Firebase Admin SDK credentials not found. Please set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY environment variables.'
            )
        }

        app = initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                privateKey,
            }),
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        })
    } else {
        app = getApps()[0]
    }

    adminAuth = getAuth(app)
    adminStorage = getStorage(app)

    return { app, adminAuth, adminStorage }
}

// Verify Firebase ID token from cookies or headers
export async function verifyIdToken(idToken: string) {
    const { adminAuth } = getFirebaseAdmin()
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken)
        return { user: decodedToken, error: null }
    } catch (error) {
        console.error('Error verifying Firebase ID token:', error)
        return { user: null, error }
    }
}

// Get user by email
export async function getUserByEmail(email: string) {
    const { adminAuth } = getFirebaseAdmin()
    try {
        const user = await adminAuth.getUserByEmail(email)
        return { user, error: null }
    } catch (error) {
        return { user: null, error }
    }
}

// Create a new user
export async function createUser(email: string, password: string, displayName?: string) {
    const { adminAuth } = getFirebaseAdmin()
    try {
        const user = await adminAuth.createUser({
            email,
            password,
            displayName,
            emailVerified: false,
        })
        return { user, error: null }
    } catch (error) {
        console.error('Error creating user:', error)
        return { user: null, error }
    }
}

// Delete a user
export async function deleteUser(uid: string) {
    const { adminAuth } = getFirebaseAdmin()
    try {
        await adminAuth.deleteUser(uid)
        return { success: true, error: null }
    } catch (error) {
        console.error('Error deleting user:', error)
        return { success: false, error }
    }
}

// Upload file to Firebase Storage (server-side)
export async function uploadFile(
    buffer: Buffer,
    destination: string,
    contentType: string
): Promise<{ url: string; path: string } | null> {
    const { adminStorage } = getFirebaseAdmin()
    try {
        const bucket = adminStorage.bucket()
        const file = bucket.file(destination)

        await file.save(buffer, {
            contentType,
            public: true,
        })

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`
        return { url: publicUrl, path: destination }
    } catch (error) {
        console.error('Error uploading file to Firebase Storage:', error)
        return null
    }
}

// Delete file from Firebase Storage
export async function deleteFile(filePath: string): Promise<boolean> {
    const { adminStorage } = getFirebaseAdmin()
    try {
        const bucket = adminStorage.bucket()
        await bucket.file(filePath).delete()
        return true
    } catch (error) {
        console.error('Error deleting file from Firebase Storage:', error)
        return false
    }
}

export { getFirebaseAdmin }
