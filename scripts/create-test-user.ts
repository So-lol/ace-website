import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

// Hack to ensure adminDb uses the newly loaded env vars if it initializes on import
// We're assuming firebase-admin.ts initializes lazily or after this runs
import { adminAuth, adminDb } from '../src/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

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
        console.log('Login credentials:');
        console.log('Email:', email);
        console.log('Password:', password);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

main();
