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

const isUsingEmulators =
    process.env.FIREBASE_USE_EMULATORS === '1' ||
    process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === '1'

const emulatorProjectId =
    process.env.FIREBASE_EMULATOR_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'demo-ace-website'

function createLazyProxy<T extends object>(getInstance: () => T): T {
    return new Proxy({} as T, {
        get: (_target, prop, receiver) => Reflect.get(getInstance(), prop, receiver),
    })
}

function ensureInitialized() {
    if (app) return

    const apps = getApps()

    if (apps.length > 0) {
        app = apps[0]
    } else {
        if (isUsingEmulators) {
            app = initializeApp({
                projectId: emulatorProjectId,
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${emulatorProjectId}.appspot.com`,
            })
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
    }

    authInstance = getAuth(app)
    storageInstance = getStorage(app)
    dbInstance = getFirestore(app)
}

// Export Proxies to allow lazy initialization (prevents build crashes on import)
export const adminAuth = createLazyProxy(() => {
    ensureInitialized()
    if (!authInstance) {
        throw new Error('Firebase Auth failed to initialize')
    }
    return authInstance
})

export const adminStorage = createLazyProxy(() => {
    ensureInitialized()
    if (!storageInstance) {
        throw new Error('Firebase Storage failed to initialize')
    }
    return storageInstance
})

export const adminDb = createLazyProxy(() => {
    ensureInitialized()
    if (!dbInstance) {
        throw new Error('Firestore failed to initialize')
    }
    return dbInstance
})

/**
 * Verify a Firebase ID token
 */
export async function verifyIdToken(idToken: string) {
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken)
        return { user: decodedToken, error: null }
    } catch (error: unknown) {
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
    } catch {
        return null
    }
}

/**
 * Create a new user
 */
export async function createFirebaseUser(
    email: string,
    password: string,
    displayName: string,
    emailVerified = false
) {
    try {
        const user = await adminAuth.createUser({
            email,
            password,
            displayName,
            emailVerified,
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
    contentType: string,
    metadata?: Record<string, string>
): Promise<{ url: string; path: string } | null> {
    try {
        const bucket = adminStorage.bucket()
        const file = bucket.file(destination)

        await file.save(buffer, {
            contentType,
            metadata: {
                contentType,
                cacheControl: 'public, max-age=31536000, immutable',
                ...metadata,
            }
        })

        const url = await getFileReadUrl(destination)
        return { url, path: destination }
    } catch (error) {
        console.error('Error uploading file to Firebase Storage:', error)
        return null
    }
}

export async function getFileReadUrl(path: string, expiresInMs = 1000 * 60 * 60): Promise<string> {
    const bucket = adminStorage.bucket()

    if (isUsingEmulators) {
        const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199'
        return `http://${emulatorHost}/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media`
    }

    const file = bucket.file(path)
    const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresInMs,
        version: 'v4',
    })

    return signedUrl
}

export async function fileExists(path: string): Promise<boolean> {
    try {
        const bucket = adminStorage.bucket()
        const file = bucket.file(path)
        const [exists] = await file.exists()
        return exists
    } catch (error) {
        console.error('Error checking file existence in Firebase Storage:', error)
        return false
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
