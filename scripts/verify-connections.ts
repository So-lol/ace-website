import 'dotenv/config'
import { cert, initializeApp, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { PrismaClient } from '@prisma/client'

async function main() {
    console.log('🔍 Starting connection verification...\n')

    // 1. Verify Environment Variables
    console.log('1️⃣  Checking configuration...')
    const requiredEnv = [
        'FIREBASE_ADMIN_PROJECT_ID',
        'FIREBASE_ADMIN_CLIENT_EMAIL',
        'FIREBASE_ADMIN_PRIVATE_KEY',
        'DATABASE_URL'
    ]

    const missing = requiredEnv.filter(key => !process.env[key])
    if (missing.length > 0) {
        console.error('❌ Missing environment variables:', missing.join(', '))
        process.exit(1)
    }
    console.log('✅ Configuration found')

    // 2. Test Firebase Admin Connection
    console.log('\n2️⃣  Testing Firebase Admin connection...')
    try {
        if (getApps().length === 0) {
            initializeApp({
                credential: cert({
                    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                })
            })
        }

        const auth = getAuth()
        const listUsersResult = await auth.listUsers(5)
        console.log(`✅ Firebase connected! Found ${listUsersResult.users.length} users in Auth.`)
        listUsersResult.users.forEach(u => console.log(`   - ${u.email} (${u.uid})`))
    } catch (error) {
        console.error('❌ Firebase connection failed:', error)
        process.exit(1)
    }

    // 3. Test Prisma Database Connection
    console.log('\n3️⃣  Testing Prisma Database connection...')
    const prisma = new PrismaClient()
    try {
        const count = await prisma.user.count()
        console.log(`✅ Database connected! Found ${count} users in Postgres.`)

        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: { email: true, name: true }
        })

        if (admins.length > 0) {
            console.log('   Found Admin users:', admins.map(a => a.email).join(', '))
        } else {
            console.log('   ⚠️  No ADMIN users found in database.')
        }

    } catch (error) {
        console.error('❌ Database connection failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main().catch(console.error)
