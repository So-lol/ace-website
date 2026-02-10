import 'server-only'

import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth, Auth } from 'firebase-admin/auth'
import { getStorage, Storage } from 'firebase-admin/storage'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

// Lazy initialization variables
let app: App | undefined
let authInstance: Auth | undefined
let storageInstance: Storage | undefined
let dbInstance: Firestore | undefined

function ensureInitialized() {
    if (app) return

    const apps = getApps()

    if (apps.length > 0) {
        app = apps[0]
    } else {
        const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
        const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
        const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

        if (!projectId || !clientEmail || !privateKey) {
            // Detailed error for better debugging
            const missing = []
            if (!projectId) missing.push('FIREBASE_ADMIN_PROJECT_ID')
            if (!clientEmail) missing.push('FIREBASE_ADMIN_CLIENT_EMAIL')
            if (!privateKey) missing.push('FIREBASE_ADMIN_PRIVATE_KEY')

            throw new Error(`Missing Firebase Admin credentials in environment variables: ${missing.join(', ')}`)
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

    authInstance = getAuth(app)
    storageInstance = getStorage(app)
    dbInstance = getFirestore(app)
}

// Export Proxies to allow lazy initialization (prevents build crashes on import)
export const adminAuth = new Proxy({} as Auth, {
    get: (_target, prop) => {
        ensureInitialized()
        return (authInstance as any)[prop]
    }
})

export const adminStorage = new Proxy({} as Storage, {
    get: (_target, prop) => {
        ensureInitialized()
        return (storageInstance as any)[prop]
    }
})

export const adminDb = new Proxy({} as Firestore, {
    get: (_target, prop) => {
        ensureInitialized()
        return (dbInstance as any)[prop]
    }
})

/**
 * Verify a Firebase ID token
 */
export async function verifyIdToken(idToken: string) {
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken)
        return { user: decodedToken, error: null }
    } catch (error: any) {
        // Strict check: We want to know if it's expired
        return { user: null, error }
    }
}

/**
 * Create a Session Cookie
 */
export async function createSessionCookie(idToken: string, expiresIn: number) {
    try {
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn })
        return { sessionCookie, error: null }
    } catch (error) {
        console.error('Error creating session cookie:', error)
        return { sessionCookie: null, error }
    }
}

/**
 * Verify a Session Cookie
 */
export async function verifySessionCookie(sessionCookie: string) {
    try {
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true /** checkRevoked */)
        return { user: decodedClaims, error: null }
    } catch (error) {
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
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`
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
