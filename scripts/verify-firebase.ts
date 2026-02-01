import 'dotenv/config'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

async function verify() {
    console.log('Verifying Firebase Admin Connection...')
    try {
        const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
        const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
        // Handle escaped newlines
        const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

        if (!projectId || !clientEmail || !privateKey) {
            throw new Error('Missing credentials in .env')
        }

        const app = getApps().length === 0 ? initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                privateKey,
            })
        }) : getApps()[0]

        const db = getFirestore(app)
        const auth = getAuth(app)

        console.log('Checking Firestore...')
        const collections = await db.listCollections()
        console.log('✅ Firestore connected. Collections:', collections.map(c => c.id).join(', ') || 'None (empty DB)')

        console.log('Checking Auth...')
        const { users } = await auth.listUsers(1)
        console.log('✅ Auth connected. User count:', users.length)

        console.log('Firebase Admin configuration is VALID.')
    } catch (error: any) {
        console.error('❌ Verification failed:', error)
        if (error.code === 'app/invalid-credential') {
            console.error('Tip: Check your FIREBASE_ADMIN_PRIVATE_KEY and CLIENT_EMAIL.')
        } else if (error.message && error.message.includes('Missing credentials')) {
            console.error('Check your .env file.')
        }
        process.exit(1)
    }
}

verify()
