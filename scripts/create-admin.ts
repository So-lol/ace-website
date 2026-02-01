import 'dotenv/config'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

const EMAIL = 'admin@ace.com'
const PASSWORD = 'password123'
const NAME = 'Admin User'

async function createAdmin() {
    console.log(`Creating Admin User: ${EMAIL}...`)

    try {
        const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
        const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
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

        // 1. Create in Firebase Auth
        let uid = ''
        try {
            const userRecord = await auth.createUser({
                email: EMAIL,
                password: PASSWORD,
                displayName: NAME,
                emailVerified: true,
            })
            uid = userRecord.uid
            console.log('✅ Auth user created.')
        } catch (error: any) {
            if (error.code === 'auth/email-already-exists') {
                console.log('⚠️ Auth user already exists. Fetching UID...')
                const user = await auth.getUserByEmail(EMAIL)
                uid = user.uid
            } else {
                throw error
            }
        }

        // 2. Create/Update in Firestore
        // Note: Using Timestamp from admin SDK if we want strict types, but specific Date is fine for now
        await db.collection('users').doc(uid).set({
            uid: uid,
            email: EMAIL,
            name: NAME,
            role: 'ADMIN',
            createdAt: new Date(),
            updatedAt: new Date(),
            familyId: null,
            avatarUrl: null
        }, { merge: true })

        console.log('✅ Firestore Admin document created.')
        console.log('-----------------------------------')
        console.log(`Email:    ${EMAIL}`)
        console.log(`Password: ${PASSWORD}`)
        console.log('-----------------------------------')

    } catch (error) {
        console.error('❌ Failed to create admin:', error)
    }
}

createAdmin()
