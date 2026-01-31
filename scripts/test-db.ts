
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
})

async function main() {
    console.log('Testing database connection...')
    try {
        const result = await prisma.$queryRaw`SELECT 1`
        console.log('Successfully connected to database!', result)
    } catch (e) {
        console.error('Failed to connect to database:', e)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

main()
