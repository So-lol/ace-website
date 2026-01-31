const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function main() {
    console.log('Testing Prisma connection...')
    try {
        const count = await prisma.user.count()
        console.log(`✅ Success! Found ${count} users.`)
    } catch (e) {
        console.error('❌ Error:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
