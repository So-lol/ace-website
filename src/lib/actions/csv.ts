'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { UserRole } from '@prisma/client'

export type CSVImportResult = {
    success: boolean
    error?: string
    imported?: number
    skipped?: number
    errors?: string[]
}

export type CSVExportResult = {
    success: boolean
    error?: string
    data?: string
}

/**
 * Parse CSV content into rows
 */
function parseCSV(content: string): string[][] {
    const lines = content.split('\n').filter(line => line.trim())
    return lines.map(line => {
        // Handle quoted values with commas
        const values: string[] = []
        let current = ''
        let inQuotes = false

        for (const char of line) {
            if (char === '"') {
                inQuotes = !inQuotes
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim())
                current = ''
            } else {
                current += char
            }
        }
        values.push(current.trim())
        return values
    })
}

/**
 * Import users from CSV (admin only)
 * Expected format: name,email,role
 */
export async function importUsersFromCSV(csvContent: string): Promise<CSVImportResult> {
    // Verify admin user
    let adminUser
    try {
        adminUser = await requireAdmin()
    } catch {
        return { success: false, error: 'Only admins can import users' }
    }

    try {
        const rows = parseCSV(csvContent)
        if (rows.length < 2) {
            return { success: false, error: 'CSV must have a header row and at least one data row' }
        }

        // Parse header
        const header = rows[0].map(h => h.toLowerCase().trim())
        const nameIdx = header.indexOf('name')
        const emailIdx = header.indexOf('email')
        const roleIdx = header.indexOf('role')

        if (nameIdx === -1 || emailIdx === -1) {
            return { success: false, error: 'CSV must have "name" and "email" columns' }
        }

        const dataRows = rows.slice(1)
        let imported = 0
        let skipped = 0
        const errors: string[] = []

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i]
            const rowNum = i + 2 // 1-indexed, skip header

            const name = row[nameIdx]?.trim()
            const email = row[emailIdx]?.trim()?.toLowerCase()
            const roleStr = row[roleIdx]?.trim()?.toUpperCase() || 'MENTEE'

            // Validate
            if (!name || !email) {
                errors.push(`Row ${rowNum}: Missing name or email`)
                skipped++
                continue
            }

            if (!email.includes('@')) {
                errors.push(`Row ${rowNum}: Invalid email "${email}"`)
                skipped++
                continue
            }

            // Check role
            let role: UserRole = 'MENTEE'
            if (['ADMIN', 'MENTOR', 'MENTEE'].includes(roleStr)) {
                role = roleStr as UserRole
            }

            // Check for duplicate
            const existing = await prisma.user.findUnique({
                where: { email }
            })

            if (existing) {
                skipped++
                continue
            }

            // Create user
            await prisma.user.create({
                data: {
                    id: crypto.randomUUID(),
                    name,
                    email,
                    role,
                }
            })
            imported++
        }

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'CREATE',
                entityType: 'User',
                entityId: 'CSV_IMPORT',
                actorId: adminUser.id,
                afterValue: { imported, skipped, totalRows: dataRows.length },
            }
        })

        revalidatePath('/admin/users')

        return {
            success: true,
            imported,
            skipped,
            errors: errors.length > 0 ? errors : undefined,
        }
    } catch (error) {
        console.error('CSV import error:', error)
        return { success: false, error: 'Failed to import CSV' }
    }
}

/**
 * Export users to CSV (admin only)
 */
export async function exportUsersToCSV(): Promise<CSVExportResult> {
    // Verify admin user
    try {
        await requireAdmin()
    } catch {
        return { success: false, error: 'Only admins can export users' }
    }

    try {
        const users = await prisma.user.findMany({
            include: { family: true },
            orderBy: { name: 'asc' }
        })

        // Build CSV
        const lines = ['name,email,role,family,created_at']
        for (const u of users) {
            const family = u.family?.name || ''
            const created = u.createdAt.toISOString().split('T')[0]
            lines.push(`"${u.name}","${u.email}","${u.role}","${family}","${created}"`)
        }

        return {
            success: true,
            data: lines.join('\n'),
        }
    } catch (error) {
        console.error('CSV export error:', error)
        return { success: false, error: 'Failed to export users' }
    }
}

/**
 * Export pairings to CSV (admin only)
 */
export async function exportPairingsToCSV(): Promise<CSVExportResult> {
    // Verify admin user
    try {
        await requireAdmin()
    } catch {
        return { success: false, error: 'Only admins can export pairings' }
    }

    try {
        const pairings = await prisma.pairing.findMany({
            include: {
                family: true,
                mentor: true,
                mentees: { include: { mentee: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Build CSV
        const lines = ['family,mentor_name,mentor_email,mentee1_name,mentee1_email,mentee2_name,mentee2_email,weekly_points,total_points']
        for (const p of pairings) {
            const mentee1 = p.mentees[0]?.mentee
            const mentee2 = p.mentees[1]?.mentee
            lines.push([
                `"${p.family.name}"`,
                `"${p.mentor.name}"`,
                `"${p.mentor.email}"`,
                mentee1 ? `"${mentee1.name}"` : '""',
                mentee1 ? `"${mentee1.email}"` : '""',
                mentee2 ? `"${mentee2.name}"` : '""',
                mentee2 ? `"${mentee2.email}"` : '""',
                p.weeklyPoints,
                p.totalPoints,
            ].join(','))
        }

        return {
            success: true,
            data: lines.join('\n'),
        }
    } catch (error) {
        console.error('CSV export error:', error)
        return { success: false, error: 'Failed to export pairings' }
    }
}

/**
 * Export leaderboard to CSV (admin only)
 */
export async function exportLeaderboardToCSV(): Promise<CSVExportResult> {
    // Verify admin user
    try {
        await requireAdmin()
    } catch {
        return { success: false, error: 'Only admins can export leaderboard' }
    }

    try {
        const pairings = await prisma.pairing.findMany({
            include: {
                family: true,
                mentor: true,
                mentees: { include: { mentee: true } }
            },
            orderBy: { totalPoints: 'desc' }
        })

        // Build CSV
        const lines = ['rank,family,mentor,mentees,weekly_points,total_points']
        pairings.forEach((p, i) => {
            const menteeNames = p.mentees.map(m => m.mentee.name).join(' & ')
            lines.push([
                i + 1,
                `"${p.family.name}"`,
                `"${p.mentor.name}"`,
                `"${menteeNames}"`,
                p.weeklyPoints,
                p.totalPoints,
            ].join(','))
        })

        return {
            success: true,
            data: lines.join('\n'),
        }
    } catch (error) {
        console.error('CSV export error:', error)
        return { success: false, error: 'Failed to export leaderboard' }
    }
}
