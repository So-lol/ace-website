'use server'

import Papa from 'papaparse'
import { requireAdmin } from '@/lib/auth-helpers'
import { adminDb } from '@/lib/firebase-admin'
import { revalidatePath } from 'next/cache'
import { UserDoc, PairingDoc, SubmissionDoc } from '@/types/firestore'
import { getFamilyLeaderboard, getPairingLeaderboard } from '@/lib/actions/leaderboard'
import { commitUsersImport } from '@/lib/actions/admin'
import { logAuditAction } from '@/lib/actions/audit'

export type CSVImportResult = {
    success: boolean
    error?: string
    imported?: number
    skipped?: number
    errors?: string[]
    errorReport?: string
}

export type CSVExportResult = {
    success: boolean
    error?: string
    data?: string
}

export type CSVExportOptions = {
    familyId?: string
    seasonYear?: number
    weekNumber?: number
}

function escapeCsvValue(value: unknown) {
    const stringValue = String(value ?? '')
    return `"${stringValue.replace(/"/g, '""')}"`
}

function formatCsvLine(values: unknown[]) {
    return values.map(escapeCsvValue).join(',')
}

function parseCsvRows(content: string) {
    const parsed = Papa.parse<Record<string, string>>(content, {
        header: true,
        skipEmptyLines: true,
        transformHeader: header => header.trim().toLowerCase(),
    })

    if (parsed.errors.length > 0) {
        const details = parsed.errors.map(error => error.message).join('; ')
        throw new Error(`Failed to parse CSV: ${details}`)
    }

    return parsed.data
}

function hasExportFilters(options?: CSVExportOptions) {
    return Boolean(options?.familyId || options?.seasonYear || options?.weekNumber)
}

function describeExportFilters(options?: CSVExportOptions) {
    if (!options || !hasExportFilters(options)) {
        return 'no filters'
    }

    const parts = [
        options.familyId ? `family=${options.familyId}` : null,
        options.seasonYear ? `season=${options.seasonYear}` : null,
        options.weekNumber ? `week=${options.weekNumber}` : null,
    ].filter(Boolean)

    return parts.join(', ')
}

async function logExport(
    adminUser: Awaited<ReturnType<typeof requireAdmin>>,
    targetType: string,
    details: string,
    options?: CSVExportOptions
) {
    await logAuditAction(
        adminUser.id,
        'EXPORT',
        targetType,
        'csv',
        details,
        options ? {
            familyId: options.familyId || null,
            seasonYear: options.seasonYear || null,
            weekNumber: options.weekNumber || null,
        } : undefined,
        adminUser.email
    )
}

export async function importUsersFromCSV(csvContent: string): Promise<CSVImportResult> {
    try {
        await requireAdmin()
        const rows = parseCsvRows(csvContent)

        if (rows.length === 0) {
            return { success: false, error: 'CSV must have at least one data row' }
        }

        const result = await commitUsersImport(rows, 'merge')
        revalidatePath('/admin/import')

        return {
            success: result.failed === 0,
            imported: result.success,
            skipped: result.skipped,
            errors: result.errors.length > 0 ? result.errors : undefined,
            errorReport: result.errorReport,
            error: result.failed > 0 ? 'Some rows could not be imported' : undefined,
        }
    } catch (error) {
        console.error('CSV import error:', error)
        return { success: false, error: 'Failed to import CSV' }
    }
}

export async function exportUsersToCSV(options?: CSVExportOptions): Promise<CSVExportResult> {
    try {
        const adminUser = await requireAdmin()

        const [usersSnapshot, familiesSnapshot] = await Promise.all([
            adminDb.collection('users').orderBy('name').get(),
            adminDb.collection('families').get(),
        ])

        const familyMap = new Map<string, string>()
        familiesSnapshot.forEach(doc => {
            familyMap.set(doc.id, doc.data().name)
        })

        const lines = [
            'uid,name,email,role,family_id,family_name,created_at,updated_at',
        ]

        usersSnapshot.docs
            .filter(doc => !options?.familyId || doc.data().familyId === options.familyId)
            .forEach(doc => {
            const user = doc.data() as UserDoc
            lines.push(formatCsvLine([
                user.uid,
                user.name,
                user.email,
                user.role,
                user.familyId || '',
                user.familyId ? familyMap.get(user.familyId) || '' : '',
                user.createdAt?.toDate?.().toISOString() || '',
                user.updatedAt?.toDate?.().toISOString() || '',
            ]))
            })

        await logExport(
            adminUser,
            'USER',
            `Exported users CSV with ${describeExportFilters(options)}`,
            options
        )

        return { success: true, data: lines.join('\n') }
    } catch (error) {
        console.error('CSV export error:', error)
        return { success: false, error: 'Failed to export users' }
    }
}

export async function exportPairingsToCSV(options?: CSVExportOptions): Promise<CSVExportResult> {
    try {
        const adminUser = await requireAdmin()

        const [pairingsSnapshot, usersSnapshot, familiesSnapshot] = await Promise.all([
            adminDb.collection('pairings').orderBy('createdAt', 'desc').get(),
            adminDb.collection('users').get(),
            adminDb.collection('families').get(),
        ])

        const userMap = new Map<string, UserDoc>()
        usersSnapshot.forEach(doc => {
            userMap.set(doc.id, doc.data() as UserDoc)
        })

        const familyMap = new Map<string, string>()
        familiesSnapshot.forEach(doc => {
            familyMap.set(doc.id, doc.data().name)
        })

        const lines = [
            'pairing_id,family_id,family_name,mentor_id,mentor_name,mentor_email,mentee1_id,mentee1_name,mentee1_email,mentee2_id,mentee2_name,mentee2_email,weekly_points,total_points,created_at,updated_at',
        ]

        pairingsSnapshot.docs
            .filter(doc => !options?.familyId || doc.data().familyId === options.familyId)
            .forEach(doc => {
            const pairing = doc.data() as PairingDoc
            const mentor = userMap.get(pairing.mentorId)
            const mentees = (pairing.menteeIds || []).map(id => userMap.get(id) || null)
            const mentee1 = mentees[0]
            const mentee2 = mentees[1]

            lines.push(formatCsvLine([
                doc.id,
                pairing.familyId,
                familyMap.get(pairing.familyId) || '',
                pairing.mentorId,
                mentor?.name || '',
                mentor?.email || '',
                pairing.menteeIds?.[0] || '',
                mentee1?.name || '',
                mentee1?.email || '',
                pairing.menteeIds?.[1] || '',
                mentee2?.name || '',
                mentee2?.email || '',
                pairing.weeklyPoints || 0,
                pairing.totalPoints || 0,
                pairing.createdAt?.toDate?.().toISOString() || '',
                pairing.updatedAt?.toDate?.().toISOString() || '',
            ]))
            })

        await logExport(
            adminUser,
            'PAIRING',
            `Exported pairings CSV with ${describeExportFilters(options)}`,
            options
        )

        return { success: true, data: lines.join('\n') }
    } catch (error) {
        console.error('CSV export error:', error)
        return { success: false, error: 'Failed to export pairings' }
    }
}

export async function exportLeaderboardToCSV(options?: CSVExportOptions): Promise<CSVExportResult> {
    try {
        const adminUser = await requireAdmin()

        if (options?.seasonYear || options?.weekNumber || options?.familyId) {
            const [familiesSnapshot, pairingsSnapshot, usersSnapshot, submissionsSnapshot] = await Promise.all([
                adminDb.collection('families').get(),
                adminDb.collection('pairings').get(),
                adminDb.collection('users').get(),
                adminDb.collection('submissions').where('status', '==', 'APPROVED').get(),
            ])

            const userMap = new Map<string, string>()
            usersSnapshot.forEach(doc => {
                userMap.set(doc.id, doc.data().name || 'Unknown')
            })

            const familyMap = new Map<string, { id: string; name: string }>()
            familiesSnapshot.forEach(doc => {
                familyMap.set(doc.id, { id: doc.id, name: doc.data().name })
            })

            const pairings = pairingsSnapshot.docs
                .map(doc => ({ ...(doc.data() as PairingDoc), id: doc.id }))
                .filter(pairing => !options?.familyId || pairing.familyId === options.familyId)

            const pairingTotals = new Map<string, number>()
            const familyTotals = new Map<string, number>()

            submissionsSnapshot.docs.forEach(doc => {
                const submission = doc.data() as SubmissionDoc
                if (options?.seasonYear && submission.year !== options.seasonYear) {
                    return
                }
                if (options?.weekNumber && submission.weekNumber !== options.weekNumber) {
                    return
                }

                const pairing = pairings.find(item => item.id === submission.pairingId)
                if (!pairing) {
                    return
                }

                pairingTotals.set(pairing.id, (pairingTotals.get(pairing.id) || 0) + (submission.totalPoints || 0))
                familyTotals.set(pairing.familyId, (familyTotals.get(pairing.familyId) || 0) + (submission.totalPoints || 0))
            })

            const lines = [
                'leaderboard_type,rank,name,family_name,mentor_name,mentee_names,total_points,season_year,week_number',
            ]

            const rankedFamilies = Array.from(familyTotals.entries())
                .sort((left, right) => right[1] - left[1])
            rankedFamilies.forEach(([familyId, totalPoints], index) => {
                const family = familyMap.get(familyId)
                lines.push(formatCsvLine([
                    'family',
                    index + 1,
                    family?.name || familyId,
                    family?.name || familyId,
                    '',
                    '',
                    totalPoints,
                    options?.seasonYear || '',
                    options?.weekNumber || '',
                ]))
            })

            const rankedPairings = pairings
                .map(pairing => ({ pairing, totalPoints: pairingTotals.get(pairing.id) || 0 }))
                .filter(entry => entry.totalPoints > 0)
                .sort((left, right) => right.totalPoints - left.totalPoints)

            rankedPairings.forEach(({ pairing, totalPoints }, index) => {
                lines.push(formatCsvLine([
                    'pairing',
                    index + 1,
                    `${userMap.get(pairing.mentorId) || 'Unknown Mentor'} & ${(pairing.menteeIds || []).map(id => userMap.get(id) || 'Unknown').join(', ')}`,
                    familyMap.get(pairing.familyId)?.name || pairing.familyId,
                    userMap.get(pairing.mentorId) || 'Unknown Mentor',
                    (pairing.menteeIds || []).map(id => userMap.get(id) || 'Unknown').join('; '),
                    totalPoints,
                    options?.seasonYear || '',
                    options?.weekNumber || '',
                ]))
            })

            await logExport(
                adminUser,
                'LEADERBOARD',
                `Exported leaderboard CSV with ${describeExportFilters(options)}`,
                options
            )

            return { success: true, data: lines.join('\n') }
        }

        const [families, pairings] = await Promise.all([
            getFamilyLeaderboard(),
            getPairingLeaderboard(),
        ])

        const lines = [
            'leaderboard_type,rank,name,family_name,mentor_name,mentee_names,total_points,weekly_points,member_count,created_at,updated_at',
        ]

        families.forEach((family, index) => {
            lines.push(formatCsvLine([
                'family',
                index + 1,
                family.name,
                family.name,
                '',
                '',
                family.totalPoints,
                family.weeklyPoints,
                family.memberCount,
                family.createdAt.toISOString(),
                family.updatedAt.toISOString(),
            ]))
        })

        pairings.forEach((pairing, index) => {
            lines.push(formatCsvLine([
                'pairing',
                index + 1,
                `${pairing.mentorName} & ${pairing.menteeNames.join(', ')}`,
                pairing.familyName,
                pairing.mentorName,
                pairing.menteeNames.join('; '),
                pairing.totalPoints,
                pairing.weeklyPoints,
                '',
                pairing.createdAt.toISOString(),
                pairing.updatedAt.toISOString(),
            ]))
        })

        await logExport(
            adminUser,
            'LEADERBOARD',
            `Exported leaderboard CSV with ${describeExportFilters(options)}`,
            options
        )

        return { success: true, data: lines.join('\n') }
    } catch (error) {
        console.error('CSV export error:', error)
        return { success: false, error: 'Failed to export leaderboard' }
    }
}
