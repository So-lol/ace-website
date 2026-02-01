import { config } from 'dotenv';
import path from 'path';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Firebase Admin (Self-contained)
const apps = getApps();
let app;

if (apps.length > 0) {
    app = apps[0];
} else {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    // Handle escaped newlines in private key
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        console.error('Missing Firebase Admin credentials in environment variables');
        process.exit(1);
    }

    app = initializeApp({
        credential: cert({
            projectId,
            clientEmail,
            privateKey,
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
}

const adminAuth = getAuth(app);
const adminDb = getFirestore(app);

async function main() {
    const email = 'admin@ace.com';
    const password = 'password123';
    const name = 'Admin User';

    console.log(`Creating user ${email}...`);

    try {
        let uid;
        try {
            const user = await adminAuth.getUserByEmail(email);
            uid = user.uid;
            console.log('User already exists in Auth, updating password...');
            await adminAuth.updateUser(uid, { password, emailVerified: true });
        } catch (e) {
            console.log('User does not exist in Auth, creating...');
            const user = await adminAuth.createUser({
                email,
                password,
                displayName: name,
                emailVerified: true,
            });
            uid = user.uid;
        }

        console.log(`User UID: ${uid}`);
        console.log('Creating/Updating Firestore profile...');

        await adminDb.collection('users').doc(uid).set({
            uid,
            email,
            name,
            role: 'ADMIN',
            familyId: null,
            avatarUrl: null,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        }, { merge: true });

        console.log('✅ Success! User created/updated.');
        console.log('--------------------------------------------------');
        console.log('LOGIN CREDENTIALS:');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('--------------------------------------------------');
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

main();
