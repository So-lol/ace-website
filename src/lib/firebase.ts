'use client'

import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, Auth } from 'firebase/auth'
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage'

// Firebase configuration - replace with your config from Firebase Console
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const useEmulators = process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === '1'
const emulatorProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-ace-website'
const resolvedFirebaseConfig = useEmulators
    ? {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'fake-api-key',
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${emulatorProjectId}.firebaseapp.com`,
        projectId: emulatorProjectId,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${emulatorProjectId}.appspot.com`,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:1234567890:web:emulator',
    }
    : firebaseConfig

// Initialize Firebase
let app: FirebaseApp | null = null
let auth: Auth | null = null
let storage: FirebaseStorage | null = null
let authEmulatorConnected = false
let storageEmulatorConnected = false

export const isFirebaseClientConfigured = useEmulators || Object.values(firebaseConfig).every(Boolean)

if (typeof window !== 'undefined' && isFirebaseClientConfigured) {
    app = getApps().length === 0 ? initializeApp(resolvedFirebaseConfig) : getApps()[0]
    auth = getAuth(app)
    storage = getStorage(app)

    if (useEmulators && auth && !authEmulatorConnected) {
        connectAuthEmulator(
            auth,
            process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL || 'http://127.0.0.1:9099',
            { disableWarnings: true }
        )
        authEmulatorConnected = true
    }

    if (useEmulators && storage && !storageEmulatorConnected) {
        connectStorageEmulator(
            storage,
            '127.0.0.1',
            Number(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST?.split(':')[1] || '9199')
        )
        storageEmulatorConnected = true
    }
}

export { app, auth, storage }
export { firebaseConfig }
