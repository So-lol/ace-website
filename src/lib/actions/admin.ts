'use server'

import { adminAuth, adminDb, getUserByEmail } from '@/lib/firebase-admin'
import { requireAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { logAuditAction } from '@/lib/actions/audit'
import { UserDoc, PairingDoc, FamilyDoc, AceApplicationDoc, AceRole } from '@/types/firestore'
import { UserRole } from '@/types/enums'
import { getErrorMessage } from '@/lib/errors'

export type ImportMode = 'users' | 'pairings' | 'applications'
export type ImportConflictStrategy = 'skip' | 'merge' | 'replace'
export type ImportRowStatus = 'ready' | 'conflict' | 'invalid'
export type ImportRowAction = 'create' | 'update' | 'skip' | 'error'

export type ImportStats = {
    total: number
    success: number
    failed: number
    skipped: number
    created: number
    updated: number
    errors: string[]
    errorReport: string
    strategy?: ImportConflictStrategy
}

export type ImportCsvRow = Record<string, string | undefined>

export type ImportPreviewRow = {
    rowNumber: number
    key: string
    status: ImportRowStatus
    action: ImportRowAction
    messages: string[]
    raw: ImportCsvRow
}

export type ImportPreview = {
    mode: ImportMode
    total: number
    valid: number
    invalid: number
    conflicts: number
    processable: number
    missingColumns: string[]
    errors: string[]
    errorReport: string
    rows: ImportPreviewRow[]
}

type ImportUserRow = ImportCsvRow & {
    uid?: string
    email?: string
    name?: string
    role?: string
    family_id?: string
}

type ImportPairingRow = ImportCsvRow & {
    mentor_email?: string
    mentee1_email?: string
    mentee2_email?: string
    family_id?: string
}

type ImportApplicationRow = ImportCsvRow & {
    id?: string
    applicantid?: string
    name?: string
    pronouns?: string
    email?: string
    phone?: string
    instagram?: string
    university?: string
    schoolyear?: string
    majorsminors?: string
    livesoncampus?: string
    role?: string
    familyheadacknowledged?: string
    familyheadwhy?: string
    familyheadhowhelp?: string
    familyheadexclusions?: string
    familyheadidentities?: string
    familyheadfamilyprefs?: string
    familyheadconcerns?: string
    goals?: string
    willingmultiple?: string
    preferredactivities?: string
    preferredactivitiesother?: string
    familyheadpreference?: string
    pairingpreferences?: string
    pairingexclusions?: string
    meetfrequency?: string
    othercommitments?: string
    coreidentities?: string
    hobbies?: string
    musictaste?: string
    perfectday?: string
    dreamvacation?: string
    introextroscale?: string
    reachoutstyle?: string
    additionalinfo?: string
    availableforreveal?: string
    finalcomments?: string
    selfintro?: string
    submitted?: string
    created_at?: string
    updated_at?: string
}

type ExistingUserRecord = {
    id: string
    data: UserDoc
}

type ExistingPairingRecord = {
    id: string
    data: PairingDoc
}

type ExistingApplicationRecord = {
    id: string
    data: AceApplicationDoc
}

const USER_ROLES: UserRole[] = ['ADMIN', 'MENTOR', 'MENTEE']
const ACE_ROLES: AceRole[] = ['FAMILY_HEAD', 'ANH', 'CHI', 'CHANH', 'EM']
const USER_REQUIRED_COLUMNS = ['email', 'name', 'role']
const PAIRING_REQUIRED_COLUMNS = ['mentor_email', 'mentee1_email', 'family_id']
const APPLICATION_REQUIRED_COLUMNS = ['name', 'email', 'phone', 'role']

function normalizeValue(value: string | undefined): string {
    return value?.trim() || ''
}

function normalizeEmail(value: string | undefined): string {
    return normalizeValue(value).toLowerCase()
}

function parseUserRole(role: string | undefined): UserRole | null {
    if (!role) {
        return null
    }

    const normalizedRole = normalizeValue(role).toUpperCase()
    return USER_ROLES.includes(normalizedRole as UserRole)
        ? (normalizedRole as UserRole)
        : null
}

function parseAceRole(role: string | undefined): AceRole | null {
    if (!role) {
        return null
    }

    const normalizedRole = normalizeValue(role).toUpperCase().replace(/[\s/-]+/g, '_')
    const aliasMap: Record<string, AceRole> = {
        FAMILY_HEAD: 'FAMILY_HEAD',
        FAMILYHEAD: 'FAMILY_HEAD',
        ANH: 'ANH',
        CHI: 'CHI',
        CHANH: 'CHANH',
        EM: 'EM',
    }

    const mappedRole = aliasMap[normalizedRole]
    return mappedRole && ACE_ROLES.includes(mappedRole) ? mappedRole : null
}

function parseBooleanValue(value: string | undefined): boolean | undefined {
    const normalizedValue = normalizeValue(value).toLowerCase()
    if (!normalizedValue) {
        return undefined
    }

    if (['true', 'yes', 'y', '1'].includes(normalizedValue)) {
        return true
    }

    if (['false', 'no', 'n', '0'].includes(normalizedValue)) {
        return false
    }

    return undefined
}

function parseNumberValue(value: string | undefined): number | null {
    const normalizedValue = normalizeValue(value)
    if (!normalizedValue) {
        return null
    }

    const parsed = Number(normalizedValue)
    return Number.isFinite(parsed) ? parsed : null
}

function parseActivities(value: string | undefined): string[] {
    const normalizedValue = normalizeValue(value)
    if (!normalizedValue) {
        return []
    }

    return uniqueValues(
        normalizedValue
            .split(/[|;,]/)
            .map(entry => entry.trim())
            .filter(Boolean)
    )
}

function parseTimestampValue(value: string | undefined): Timestamp | null {
    const normalizedValue = normalizeValue(value)
    if (!normalizedValue) {
        return null
    }

    const parsed = new Date(normalizedValue)
    return Number.isNaN(parsed.getTime()) ? null : Timestamp.fromDate(parsed)
}

function arraysEqual(left: string[], right: string[]) {
    return left.length === right.length && left.every((value, index) => value === right[index])
}

function uniqueValues(values: string[]) {
    return Array.from(new Set(values))
}

function escapeCsvValue(value: unknown) {
    const stringValue = String(value ?? '')
    return `"${stringValue.replace(/"/g, '""')}"`
}

function buildErrorReport(rows: ImportPreviewRow[]) {
    const reportRows = rows
        .filter(row => row.status !== 'ready')
        .map(row => [
            row.rowNumber,
            row.key,
            row.status,
            row.action,
            row.messages.join(' | '),
        ].map(escapeCsvValue).join(','))

    return [
        'row_number,key,status,action,messages',
        ...reportRows,
    ].join('\n')
}

function countDuplicates(keys: string[]) {
    const counts = new Map<string, number>()
    for (const key of keys) {
        if (!key) {
            continue
        }
        counts.set(key, (counts.get(key) || 0) + 1)
    }
    return counts
}

async function fetchUsersByEmails(emails: string[]) {
    const normalizedEmails = uniqueValues(emails.filter(Boolean))
    const usersByEmail = new Map<string, ExistingUserRecord>()

    for (let index = 0; index < normalizedEmails.length; index += 30) {
        const chunk = normalizedEmails.slice(index, index + 30)
        if (chunk.length === 0) {
            continue
        }

        const snapshot = await adminDb.collection('users')
            .where('email', 'in', chunk)
            .get()

        snapshot.forEach(doc => {
            const data = doc.data() as UserDoc
            usersByEmail.set(normalizeEmail(data.email), { id: doc.id, data })
        })
    }

    return usersByEmail
}

async function fetchFamiliesByIds(familyIds: string[]) {
    const normalizedIds = uniqueValues(familyIds.filter(Boolean))
    const familiesById = new Map<string, { id: string; data: FamilyDoc }>()

    for (let index = 0; index < normalizedIds.length; index += 30) {
        const chunk = normalizedIds.slice(index, index + 30)
        if (chunk.length === 0) {
            continue
        }

        const snapshot = await adminDb.collection('families')
            .where('__name__', 'in', chunk)
            .get()

        snapshot.forEach(doc => {
            familiesById.set(doc.id, { id: doc.id, data: doc.data() as FamilyDoc })
        })
    }

    return familiesById
}

async function fetchPairingsByMentorIds(mentorIds: string[]) {
    const normalizedIds = uniqueValues(mentorIds.filter(Boolean))
    const pairingsByMentorId = new Map<string, ExistingPairingRecord>()

    for (let index = 0; index < normalizedIds.length; index += 30) {
        const chunk = normalizedIds.slice(index, index + 30)
        if (chunk.length === 0) {
            continue
        }

        const snapshot = await adminDb.collection('pairings')
            .where('mentorId', 'in', chunk)
            .get()

        snapshot.forEach(doc => {
            const data = doc.data() as PairingDoc
            pairingsByMentorId.set(data.mentorId, { id: doc.id, data })
        })
    }

    return pairingsByMentorId
}

async function fetchApplicationsByEmails(emails: string[]) {
    const normalizedEmails = uniqueValues(emails.filter(Boolean))
    const applicationsByEmail = new Map<string, ExistingApplicationRecord>()

    for (let index = 0; index < normalizedEmails.length; index += 30) {
        const chunk = normalizedEmails.slice(index, index + 30)
        if (chunk.length === 0) {
            continue
        }

        const snapshot = await adminDb.collection('aceApplications')
            .where('email', 'in', chunk)
            .get()

        snapshot.forEach(doc => {
            const data = doc.data() as AceApplicationDoc
            applicationsByEmail.set(normalizeEmail(data.email), { id: doc.id, data })
        })
    }

    return applicationsByEmail
}

async function fetchApplicationsByApplicantIds(applicantIds: string[]) {
    const normalizedIds = uniqueValues(applicantIds.filter(Boolean))
    const applicationsByApplicantId = new Map<string, ExistingApplicationRecord>()

    for (let index = 0; index < normalizedIds.length; index += 30) {
        const chunk = normalizedIds.slice(index, index + 30)
        if (chunk.length === 0) {
            continue
        }

        const snapshot = await adminDb.collection('aceApplications')
            .where('applicantId', 'in', chunk)
            .get()

        snapshot.forEach(doc => {
            const data = doc.data() as AceApplicationDoc
            if (data.applicantId) {
                applicationsByApplicantId.set(normalizeValue(data.applicantId), { id: doc.id, data })
            }
        })
    }

    return applicationsByApplicantId
}

async function analyzeUsers(rows: ImportUserRow[]): Promise<ImportPreview> {
    const presentColumns = new Set(rows.flatMap(row => Object.keys(row)))
    const missingColumns = USER_REQUIRED_COLUMNS.filter(column => !presentColumns.has(column))
    const emailCounts = countDuplicates(rows.map(row => normalizeEmail(row.email)))
    const usersByEmail = await fetchUsersByEmails(rows.map(row => normalizeEmail(row.email)))
    const familiesById = await fetchFamiliesByIds(rows.map(row => normalizeValue(row.family_id)))
    const previewRows: ImportPreviewRow[] = []

    let valid = 0
    let invalid = 0
    let conflicts = 0

    rows.forEach((row, index) => {
        const rowNumber = index + 2
        const email = normalizeEmail(row.email)
        const name = normalizeValue(row.name)
        const familyId = normalizeValue(row.family_id)
        const role = parseUserRole(row.role)
        const messages: string[] = []
        let status: ImportRowStatus = 'ready'
        let action: ImportRowAction = 'create'

        if (!email) {
            messages.push('Missing email')
        } else if (!email.includes('@')) {
            messages.push(`Invalid email: ${email}`)
        }

        if (!name) {
            messages.push('Missing name')
        }

        if (!role) {
            messages.push(`Invalid role: ${normalizeValue(row.role) || 'missing'}`)
        }

        if (familyId && !familiesById.has(familyId)) {
            messages.push(`Family not found: ${familyId}`)
        }

        if (email && (emailCounts.get(email) || 0) > 1) {
            messages.push('Duplicate email appears multiple times in this upload')
        }

        const existingUser = email ? usersByEmail.get(email) : null
        if (existingUser && role) {
            const sameAsExisting =
                existingUser.data.name === name &&
                existingUser.data.role === role &&
                (existingUser.data.familyId || '') === familyId

            if (sameAsExisting) {
                action = 'skip'
                messages.push('Matches the existing user record; commit will be idempotent')
            } else {
                status = 'conflict'
                action = 'update'
                messages.push('Existing user found for this email')
            }
        }

        if (messages.some(message =>
            message.startsWith('Missing') ||
            message.startsWith('Invalid') ||
            message.startsWith('Duplicate email') ||
            message.startsWith('Family not found')
        )) {
            status = 'invalid'
            action = 'error'
        }

        if (status === 'invalid') {
            invalid++
        } else {
            valid++
            if (status === 'conflict') {
                conflicts++
            }
        }

        previewRows.push({
            rowNumber,
            key: email || `row-${rowNumber}`,
            status,
            action,
            messages,
            raw: row,
        })
    })

    return {
        mode: 'users',
        total: rows.length,
        valid,
        invalid,
        conflicts,
        processable: valid,
        missingColumns,
        errors: previewRows.flatMap(row => row.status === 'invalid' ? row.messages.map(message => `Row ${row.rowNumber}: ${message}`) : []),
        errorReport: buildErrorReport(previewRows),
        rows: previewRows,
    }
}

async function analyzePairings(rows: ImportPairingRow[]): Promise<ImportPreview> {
    const presentColumns = new Set(rows.flatMap(row => Object.keys(row)))
    const missingColumns = PAIRING_REQUIRED_COLUMNS.filter(column => !presentColumns.has(column))
    const mentorEmailCounts = countDuplicates(rows.map(row => normalizeEmail(row.mentor_email)))

    const allEmails = uniqueValues(rows.flatMap(row => [
        normalizeEmail(row.mentor_email),
        normalizeEmail(row.mentee1_email),
        normalizeEmail(row.mentee2_email),
    ]).filter(Boolean))

    const usersByEmail = await fetchUsersByEmails(allEmails)
    const familiesById = await fetchFamiliesByIds(rows.map(row => normalizeValue(row.family_id)))
    const pairingsByMentorId = await fetchPairingsByMentorIds(
        rows
            .map(row => usersByEmail.get(normalizeEmail(row.mentor_email))?.id || '')
            .filter(Boolean)
    )

    const previewRows: ImportPreviewRow[] = []
    let valid = 0
    let invalid = 0
    let conflicts = 0

    rows.forEach((row, index) => {
        const rowNumber = index + 2
        const mentorEmail = normalizeEmail(row.mentor_email)
        const menteeEmails = uniqueValues([
            normalizeEmail(row.mentee1_email),
            normalizeEmail(row.mentee2_email),
        ].filter(Boolean))
        const familyId = normalizeValue(row.family_id)
        const messages: string[] = []
        let status: ImportRowStatus = 'ready'
        let action: ImportRowAction = 'create'

        if (!mentorEmail) {
            messages.push('Missing mentor email')
        }

        if (menteeEmails.length === 0) {
            messages.push('At least one mentee email is required')
        }

        if (!familyId) {
            messages.push('Missing family_id')
        }

        if (mentorEmail && (mentorEmailCounts.get(mentorEmail) || 0) > 1) {
            messages.push('Duplicate mentor appears multiple times in this upload')
        }

        if (new Set([mentorEmail, ...menteeEmails]).size !== 1 + menteeEmails.length) {
            messages.push('Mentor and mentees must all be different users')
        }

        const mentor = usersByEmail.get(mentorEmail)
        if (!mentor) {
            messages.push(`Mentor not found: ${mentorEmail}`)
        } else if (mentor.data.role !== 'MENTOR' && mentor.data.role !== 'ADMIN') {
            messages.push(`Mentor user must have role MENTOR or ADMIN: ${mentorEmail}`)
        }

        for (const menteeEmail of menteeEmails) {
            const mentee = usersByEmail.get(menteeEmail)
            if (!mentee) {
                messages.push(`Mentee not found: ${menteeEmail}`)
                continue
            }

            if (mentee.data.role !== 'MENTEE') {
                messages.push(`Mentee user must have role MENTEE: ${menteeEmail}`)
            }
        }

        if (familyId && !familiesById.has(familyId)) {
            messages.push(`Family not found: ${familyId}`)
        }

        if (mentor) {
            const existingPairing = pairingsByMentorId.get(mentor.id)
            if (existingPairing) {
                const incomingMenteeIds = menteeEmails
                    .map(email => usersByEmail.get(email)?.id || '')
                    .filter(Boolean)
                const existingMenteeIds = [...(existingPairing.data.menteeIds || [])].sort()
                const sortedIncomingMenteeIds = [...incomingMenteeIds].sort()

                const sameAsExisting =
                    existingPairing.data.familyId === familyId &&
                    arraysEqual(existingMenteeIds, sortedIncomingMenteeIds)

                if (sameAsExisting) {
                    action = 'skip'
                    messages.push('Matches the existing pairing; commit will be idempotent')
                } else {
                    status = 'conflict'
                    action = 'update'
                    messages.push('Existing pairing found for this mentor')
                }
            }
        }

        if (messages.some(message =>
            message.startsWith('Missing') ||
            message.startsWith('Mentor not found') ||
            message.startsWith('Mentee not found') ||
            message.startsWith('Family not found') ||
            message.startsWith('Duplicate mentor') ||
            message.startsWith('Mentor and mentees') ||
            message.startsWith('Mentee user') ||
            message.startsWith('Mentor user')
        )) {
            status = 'invalid'
            action = 'error'
        }

        if (status === 'invalid') {
            invalid++
        } else {
            valid++
            if (status === 'conflict') {
                conflicts++
            }
        }

        previewRows.push({
            rowNumber,
            key: mentorEmail || `row-${rowNumber}`,
            status,
            action,
            messages,
            raw: row,
        })
    })

    return {
        mode: 'pairings',
        total: rows.length,
        valid,
        invalid,
        conflicts,
        processable: valid,
        missingColumns,
        errors: previewRows.flatMap(row => row.status === 'invalid' ? row.messages.map(message => `Row ${row.rowNumber}: ${message}`) : []),
        errorReport: buildErrorReport(previewRows),
        rows: previewRows,
    }
}

async function analyzeApplications(rows: ImportApplicationRow[]): Promise<ImportPreview> {
    const presentColumns = new Set(rows.flatMap(row => Object.keys(row)))
    const missingColumns = APPLICATION_REQUIRED_COLUMNS.filter(column => !presentColumns.has(column))
    const applicantIds = rows.map(row => normalizeValue(row.applicantid))
    const emails = rows.map(row => normalizeEmail(row.email))
    const keyCounts = countDuplicates(rows.map(row => normalizeValue(row.applicantid) || normalizeEmail(row.email)))
    const applicationsByEmail = await fetchApplicationsByEmails(emails)
    const applicationsByApplicantId = await fetchApplicationsByApplicantIds(applicantIds)
    const previewRows: ImportPreviewRow[] = []

    let valid = 0
    let invalid = 0
    let conflicts = 0

    rows.forEach((row, index) => {
        const rowNumber = index + 2
        const applicantId = normalizeValue(row.applicantid)
        const email = normalizeEmail(row.email)
        const role = parseAceRole(row.role)
        const introExtroScale = parseNumberValue(row.introextroscale)
        const key = applicantId || email || `row-${rowNumber}`
        const messages: string[] = []
        let status: ImportRowStatus = 'ready'
        let action: ImportRowAction = 'create'

        if (!normalizeValue(row.name)) {
            messages.push('Missing name')
        }

        if (!email) {
            messages.push('Missing email')
        } else if (!email.includes('@')) {
            messages.push(`Invalid email: ${email}`)
        }

        if (!normalizeValue(row.phone)) {
            messages.push('Missing phone')
        }

        if (!role) {
            messages.push(`Invalid role: ${normalizeValue(row.role) || 'missing'}`)
        }

        if (normalizeValue(row.introextroscale) && (introExtroScale === null || introExtroScale < 1 || introExtroScale > 10)) {
            messages.push('introExtroScale must be a number between 1 and 10')
        }

        const createdAtValue = normalizeValue(row.created_at || row.submitted)
        if (createdAtValue && !parseTimestampValue(createdAtValue)) {
            messages.push(`Invalid created date: ${createdAtValue}`)
        }

        const updatedAtValue = normalizeValue(row.updated_at)
        if (updatedAtValue && !parseTimestampValue(updatedAtValue)) {
            messages.push(`Invalid updated date: ${updatedAtValue}`)
        }

        if ((keyCounts.get(key) || 0) > 1) {
            messages.push('Duplicate application appears multiple times in this upload')
        }

        const existingApplication = applicantId
            ? applicationsByApplicantId.get(applicantId) || applicationsByEmail.get(email) || null
            : applicationsByEmail.get(email) || null

        if (existingApplication && role) {
            const sameAsExisting =
                existingApplication.data.name === normalizeValue(row.name) &&
                normalizeEmail(existingApplication.data.email) === email &&
                existingApplication.data.phone === normalizeValue(row.phone) &&
                existingApplication.data.role === role

            if (sameAsExisting) {
                action = 'skip'
                messages.push('Matches the existing application; commit will be idempotent')
            } else {
                status = 'conflict'
                action = 'update'
                messages.push('Existing application found for this applicant')
            }
        }

        if (messages.some(message =>
            message.startsWith('Missing') ||
            message.startsWith('Invalid') ||
            message.startsWith('Duplicate application') ||
            message.startsWith('introExtroScale')
        )) {
            status = 'invalid'
            action = 'error'
        }

        if (status === 'invalid') {
            invalid++
        } else {
            valid++
            if (status === 'conflict') {
                conflicts++
            }
        }

        previewRows.push({
            rowNumber,
            key,
            status,
            action,
            messages,
            raw: row,
        })
    })

    return {
        mode: 'applications',
        total: rows.length,
        valid,
        invalid,
        conflicts,
        processable: valid,
        missingColumns,
        errors: previewRows.flatMap(row => row.status === 'invalid' ? row.messages.map(message => `Row ${row.rowNumber}: ${message}`) : []),
        errorReport: buildErrorReport(previewRows),
        rows: previewRows,
    }
}

export async function previewUsersImport(users: ImportUserRow[]): Promise<ImportPreview> {
    await requireAdmin()
    return analyzeUsers(users)
}

export async function previewPairingsImport(pairings: ImportPairingRow[]): Promise<ImportPreview> {
    await requireAdmin()
    return analyzePairings(pairings)
}

export async function previewApplicationsImport(applications: ImportApplicationRow[]): Promise<ImportPreview> {
    await requireAdmin()
    return analyzeApplications(applications)
}

export async function commitUsersImport(users: ImportUserRow[], strategy: ImportConflictStrategy): Promise<ImportStats> {
    const adminUser = await requireAdmin()
    const preview = await analyzeUsers(users)
    const stats: ImportStats = {
        total: preview.total,
        success: 0,
        failed: preview.invalid,
        skipped: 0,
        created: 0,
        updated: 0,
        errors: [...preview.errors],
        errorReport: preview.errorReport,
        strategy,
    }

    const usersByEmail = await fetchUsersByEmails(users.map(row => normalizeEmail(row.email)))
    const familiesById = await fetchFamiliesByIds(users.map(row => normalizeValue(row.family_id)))
    let changed = false

    for (const previewRow of preview.rows) {
        const raw = previewRow.raw as ImportUserRow
        const email = normalizeEmail(raw.email)
        const name = normalizeValue(raw.name)
        const role = parseUserRole(raw.role)
        const familyId = normalizeValue(raw.family_id)

        if (previewRow.status === 'invalid') {
            continue
        }

        const existingUser = usersByEmail.get(email) || null
        if (previewRow.status === 'conflict' && strategy === 'skip') {
            stats.skipped++
            continue
        }

        if (previewRow.action === 'skip') {
            stats.skipped++
            continue
        }

        if (!role) {
            stats.failed++
            stats.errors.push(`Row ${previewRow.rowNumber}: Invalid role`)
            continue
        }

        if (familyId && !familiesById.has(familyId)) {
            stats.failed++
            stats.errors.push(`Row ${previewRow.rowNumber}: Family not found: ${familyId}`)
            continue
        }

        let createdAuthUser = false

        try {
            const existingAuthUser = await getUserByEmail(email)
            const authUser = existingAuthUser || await adminAuth.createUser({
                email,
                displayName: name,
                emailVerified: true,
            })
            createdAuthUser = !existingAuthUser

            const userRef = adminDb.collection('users').doc(authUser.uid)
            const currentUserData = existingUser?.data
            const previousFamilyId = currentUserData?.familyId || null

            const nextUserData: UserDoc = {
                uid: authUser.uid,
                email,
                name: strategy === 'replace'
                    ? name
                    : name || currentUserData?.name || authUser.displayName || email,
                role: strategy === 'replace'
                    ? role
                    : currentUserData?.role || role,
                familyId: strategy === 'replace'
                    ? (familyId || null)
                    : familyId || currentUserData?.familyId || null,
                avatarUrl: currentUserData?.avatarUrl || null,
                ...(currentUserData?.pronouns ? { pronouns: currentUserData.pronouns } : {}),
                ...(currentUserData?.phone ? { phone: currentUserData.phone } : {}),
                ...(currentUserData?.socialLinks ? { socialLinks: currentUserData.socialLinks } : {}),
                ...(currentUserData?.majorsMinors ? { majorsMinors: currentUserData.majorsMinors } : {}),
                createdAt: currentUserData?.createdAt || Timestamp.now(),
                updatedAt: Timestamp.now(),
            }

            const batch = adminDb.batch()
            batch.set(userRef, nextUserData, { merge: true })

            if (existingUser && existingUser.id !== authUser.uid) {
                batch.delete(adminDb.collection('users').doc(existingUser.id))
            }

            if (nextUserData.familyId) {
                batch.set(adminDb.collection('families').doc(nextUserData.familyId), {
                    memberIds: FieldValue.arrayUnion(authUser.uid),
                    updatedAt: Timestamp.now(),
                }, { merge: true })
            }

            if (previousFamilyId && previousFamilyId !== nextUserData.familyId) {
                batch.set(adminDb.collection('families').doc(previousFamilyId), {
                    memberIds: FieldValue.arrayRemove(authUser.uid),
                    updatedAt: Timestamp.now(),
                }, { merge: true })
            }

            await batch.commit()
            changed = true
            stats.success++
            if (existingUser) {
                stats.updated++
            } else {
                stats.created++
            }
        } catch (error: unknown) {
            if (createdAuthUser) {
                try {
                    const authUser = await getUserByEmail(email)
                    if (authUser) {
                        await adminAuth.deleteUser(authUser.uid)
                    }
                } catch (cleanupError) {
                    console.error('Failed to clean up auth user after CSV import error:', cleanupError)
                }
            }

            stats.failed++
            stats.errors.push(`Row ${previewRow.rowNumber}: ${getErrorMessage(error)}`)
        }
    }

    if (changed) {
        revalidatePath('/admin/import')
        revalidatePath('/admin/users')
        revalidatePath('/admin/families')
        revalidatePath('/leaderboard')

        await logAuditAction(
            adminUser.id,
            'IMPORT',
            'USER',
            'csv',
            `Imported users from CSV with ${strategy} strategy`,
            {
                total: stats.total,
                success: stats.success,
                failed: stats.failed,
                skipped: stats.skipped,
                created: stats.created,
                updated: stats.updated,
            },
            adminUser.email
        )
    }

    stats.errorReport = buildErrorReport(preview.rows.filter(row => row.status !== 'ready').concat(
        stats.errors
            .filter(error => error.startsWith('Row '))
            .map(error => {
                const match = error.match(/^Row (\d+):\s*(.*)$/)
                return {
                    rowNumber: match ? Number(match[1]) : 0,
                    key: 'runtime-error',
                    status: 'invalid' as ImportRowStatus,
                    action: 'error' as ImportRowAction,
                    messages: [match ? match[2] : error],
                    raw: {},
                }
            })
    ))

    return stats
}

export async function commitPairingsImport(pairings: ImportPairingRow[], strategy: ImportConflictStrategy): Promise<ImportStats> {
    const adminUser = await requireAdmin()
    const preview = await analyzePairings(pairings)
    const stats: ImportStats = {
        total: preview.total,
        success: 0,
        failed: preview.invalid,
        skipped: 0,
        created: 0,
        updated: 0,
        errors: [...preview.errors],
        errorReport: preview.errorReport,
        strategy,
    }

    const allEmails = uniqueValues(pairings.flatMap(row => [
        normalizeEmail(row.mentor_email),
        normalizeEmail(row.mentee1_email),
        normalizeEmail(row.mentee2_email),
    ]).filter(Boolean))
    const usersByEmail = await fetchUsersByEmails(allEmails)
    const familiesById = await fetchFamiliesByIds(pairings.map(row => normalizeValue(row.family_id)))
    const pairingsByMentorId = await fetchPairingsByMentorIds(
        pairings
            .map(row => usersByEmail.get(normalizeEmail(row.mentor_email))?.id || '')
            .filter(Boolean)
    )
    let changed = false

    for (const previewRow of preview.rows) {
        const raw = previewRow.raw as ImportPairingRow
        const mentorEmail = normalizeEmail(raw.mentor_email)
        const menteeEmails = uniqueValues([
            normalizeEmail(raw.mentee1_email),
            normalizeEmail(raw.mentee2_email),
        ].filter(Boolean))
        const familyId = normalizeValue(raw.family_id)

        if (previewRow.status === 'invalid') {
            continue
        }

        if (previewRow.status === 'conflict' && strategy === 'skip') {
            stats.skipped++
            continue
        }

        if (previewRow.action === 'skip') {
            stats.skipped++
            continue
        }

        const mentor = usersByEmail.get(mentorEmail)
        const menteeIds = menteeEmails
            .map(email => usersByEmail.get(email)?.id || '')
            .filter(Boolean)

        if (!mentor || !familiesById.has(familyId) || menteeIds.length === 0) {
            stats.failed++
            stats.errors.push(`Row ${previewRow.rowNumber}: Pairing references could not be resolved during commit`)
            continue
        }

        try {
            const existingPairing = pairingsByMentorId.get(mentor.id) || null
            const nextMenteeIds = strategy === 'merge' && existingPairing
                ? uniqueValues([...(existingPairing.data.menteeIds || []), ...menteeIds])
                : menteeIds

            if (nextMenteeIds.length > 2) {
                stats.failed++
                stats.errors.push(`Row ${previewRow.rowNumber}: Merge would exceed the two-mentee limit`)
                continue
            }

            const pairingRef = existingPairing
                ? adminDb.collection('pairings').doc(existingPairing.id)
                : adminDb.collection('pairings').doc(`pairing_${mentor.id}`)

            const pairingData: PairingDoc = {
                id: pairingRef.id,
                familyId: familyId || existingPairing?.data.familyId || '',
                mentorId: mentor.id,
                menteeIds: nextMenteeIds,
                weeklyPoints: existingPairing?.data.weeklyPoints || 0,
                totalPoints: existingPairing?.data.totalPoints || 0,
                createdAt: existingPairing?.data.createdAt || Timestamp.now(),
                updatedAt: Timestamp.now(),
            }

            const batch = adminDb.batch()
            batch.set(pairingRef, pairingData, { merge: true })

            const familyMemberIds = [mentor.id, ...nextMenteeIds]
            batch.set(adminDb.collection('families').doc(pairingData.familyId), {
                memberIds: FieldValue.arrayUnion(...familyMemberIds),
                updatedAt: Timestamp.now(),
            }, { merge: true })

            for (const userId of familyMemberIds) {
                batch.set(adminDb.collection('users').doc(userId), {
                    familyId: pairingData.familyId,
                    updatedAt: Timestamp.now(),
                }, { merge: true })
            }

            if (existingPairing) {
                const previousFamilyId = existingPairing.data.familyId
                const previousMemberIds = uniqueValues([existingPairing.data.mentorId, ...(existingPairing.data.menteeIds || [])])
                const removedMemberIds = previousMemberIds.filter(userId => !familyMemberIds.includes(userId))

                if (previousFamilyId && previousFamilyId !== pairingData.familyId) {
                    batch.set(adminDb.collection('families').doc(previousFamilyId), {
                        memberIds: FieldValue.arrayRemove(...previousMemberIds),
                        updatedAt: Timestamp.now(),
                    }, { merge: true })
                } else if (removedMemberIds.length > 0) {
                    batch.set(adminDb.collection('families').doc(pairingData.familyId), {
                        memberIds: FieldValue.arrayRemove(...removedMemberIds),
                        updatedAt: Timestamp.now(),
                    }, { merge: true })
                }

                for (const userId of removedMemberIds) {
                    batch.set(adminDb.collection('users').doc(userId), {
                        familyId: null,
                        updatedAt: Timestamp.now(),
                    }, { merge: true })
                }
            }

            await batch.commit()
            changed = true
            stats.success++
            if (existingPairing) {
                stats.updated++
                pairingsByMentorId.set(mentor.id, { id: pairingRef.id, data: pairingData })
            } else {
                stats.created++
                pairingsByMentorId.set(mentor.id, { id: pairingRef.id, data: pairingData })
            }
        } catch (error: unknown) {
            stats.failed++
            stats.errors.push(`Row ${previewRow.rowNumber}: ${getErrorMessage(error)}`)
        }
    }

    if (changed) {
        revalidatePath('/admin/import')
        revalidatePath('/admin/users')
        revalidatePath('/admin/pairings')
        revalidatePath('/admin/families')
        revalidatePath('/leaderboard')

        await logAuditAction(
            adminUser.id,
            'IMPORT',
            'PAIRING',
            'csv',
            `Imported pairings from CSV with ${strategy} strategy`,
            {
                total: stats.total,
                success: stats.success,
                failed: stats.failed,
                skipped: stats.skipped,
                created: stats.created,
                updated: stats.updated,
            },
            adminUser.email
        )
    }

    stats.errorReport = buildErrorReport(preview.rows.filter(row => row.status !== 'ready').concat(
        stats.errors
            .filter(error => error.startsWith('Row '))
            .map(error => {
                const match = error.match(/^Row (\d+):\s*(.*)$/)
                return {
                    rowNumber: match ? Number(match[1]) : 0,
                    key: 'runtime-error',
                    status: 'invalid' as ImportRowStatus,
                    action: 'error' as ImportRowAction,
                    messages: [match ? match[2] : error],
                    raw: {},
                }
            })
    ))

    return stats
}

export async function commitApplicationsImport(applications: ImportApplicationRow[], strategy: ImportConflictStrategy): Promise<ImportStats> {
    const adminUser = await requireAdmin()
    const preview = await analyzeApplications(applications)
    const stats: ImportStats = {
        total: preview.total,
        success: 0,
        failed: preview.invalid,
        skipped: 0,
        created: 0,
        updated: 0,
        errors: [...preview.errors],
        errorReport: preview.errorReport,
        strategy,
    }

    const applicationsByEmail = await fetchApplicationsByEmails(applications.map(row => normalizeEmail(row.email)))
    const applicationsByApplicantId = await fetchApplicationsByApplicantIds(applications.map(row => normalizeValue(row.applicantid)))
    let changed = false

    for (const previewRow of preview.rows) {
        const raw = previewRow.raw as ImportApplicationRow
        const applicantId = normalizeValue(raw.applicantid)
        const email = normalizeEmail(raw.email)
        const role = parseAceRole(raw.role)

        if (previewRow.status === 'invalid') {
            continue
        }

        if (previewRow.status === 'conflict' && strategy === 'skip') {
            stats.skipped++
            continue
        }

        if (previewRow.action === 'skip') {
            stats.skipped++
            continue
        }

        if (!role) {
            stats.failed++
            stats.errors.push(`Row ${previewRow.rowNumber}: Invalid role`)
            continue
        }

        const existingApplication = applicantId
            ? applicationsByApplicantId.get(applicantId) || applicationsByEmail.get(email) || null
            : applicationsByEmail.get(email) || null
        const createdAt = parseTimestampValue(raw.created_at || raw.submitted) || existingApplication?.data.createdAt || Timestamp.now()
        const updatedAt = parseTimestampValue(raw.updated_at) || Timestamp.now()
        const introExtroScale = parseNumberValue(raw.introextroscale)

        const baseDoc: AceApplicationDoc = {
            id: existingApplication?.id || normalizeValue(raw.id) || adminDb.collection('aceApplications').doc().id,
            ...(applicantId ? { applicantId } : existingApplication?.data.applicantId ? { applicantId: existingApplication.data.applicantId } : {}),
            name: strategy === 'replace'
                ? normalizeValue(raw.name)
                : normalizeValue(raw.name) || existingApplication?.data.name || '',
            pronouns: strategy === 'replace'
                ? normalizeValue(raw.pronouns)
                : normalizeValue(raw.pronouns) || existingApplication?.data.pronouns || '',
            email,
            phone: strategy === 'replace'
                ? normalizeValue(raw.phone)
                : normalizeValue(raw.phone) || existingApplication?.data.phone || '',
            instagram: strategy === 'replace'
                ? normalizeValue(raw.instagram)
                : normalizeValue(raw.instagram) || existingApplication?.data.instagram || '',
            university: strategy === 'replace'
                ? normalizeValue(raw.university) || 'University of Minnesota - Twin Cities'
                : normalizeValue(raw.university) || existingApplication?.data.university || 'University of Minnesota - Twin Cities',
            schoolYear: strategy === 'replace'
                ? normalizeValue(raw.schoolyear)
                : normalizeValue(raw.schoolyear) || existingApplication?.data.schoolYear || '',
            majorsMinors: strategy === 'replace'
                ? normalizeValue(raw.majorsminors)
                : normalizeValue(raw.majorsminors) || existingApplication?.data.majorsMinors || '',
            livesOnCampus: strategy === 'replace'
                ? normalizeValue(raw.livesoncampus)
                : normalizeValue(raw.livesoncampus) || existingApplication?.data.livesOnCampus || '',
            role,
            hobbies: strategy === 'replace'
                ? normalizeValue(raw.hobbies)
                : normalizeValue(raw.hobbies) || existingApplication?.data.hobbies || '',
            musicTaste: strategy === 'replace'
                ? normalizeValue(raw.musictaste)
                : normalizeValue(raw.musictaste) || existingApplication?.data.musicTaste || '',
            perfectDay: strategy === 'replace'
                ? normalizeValue(raw.perfectday)
                : normalizeValue(raw.perfectday) || existingApplication?.data.perfectDay || '',
            dreamVacation: strategy === 'replace'
                ? normalizeValue(raw.dreamvacation)
                : normalizeValue(raw.dreamvacation) || existingApplication?.data.dreamVacation || '',
            introExtroScale: strategy === 'replace'
                ? introExtroScale ?? 5
                : introExtroScale ?? existingApplication?.data.introExtroScale ?? 5,
            reachOutStyle: strategy === 'replace'
                ? normalizeValue(raw.reachoutstyle)
                : normalizeValue(raw.reachoutstyle) || existingApplication?.data.reachOutStyle || '',
            additionalInfo: strategy === 'replace'
                ? normalizeValue(raw.additionalinfo)
                : normalizeValue(raw.additionalinfo) || existingApplication?.data.additionalInfo || '',
            availableForReveal: strategy === 'replace'
                ? normalizeValue(raw.availableforreveal)
                : normalizeValue(raw.availableforreveal) || existingApplication?.data.availableForReveal || '',
            finalComments: strategy === 'replace'
                ? normalizeValue(raw.finalcomments)
                : normalizeValue(raw.finalcomments) || existingApplication?.data.finalComments || '',
            selfIntro: strategy === 'replace'
                ? normalizeValue(raw.selfintro)
                : normalizeValue(raw.selfintro) || existingApplication?.data.selfIntro || '',
            createdAt,
            updatedAt,
        }

        const familyHeadAcknowledged = parseBooleanValue(raw.familyheadacknowledged)
        const nextDoc: AceApplicationDoc = role === 'FAMILY_HEAD'
            ? {
                ...baseDoc,
                ...(familyHeadAcknowledged !== undefined ? { familyHeadAcknowledged } : existingApplication?.data.familyHeadAcknowledged !== undefined ? { familyHeadAcknowledged: existingApplication.data.familyHeadAcknowledged } : {}),
                familyHeadWhy: strategy === 'replace' ? normalizeValue(raw.familyheadwhy) : normalizeValue(raw.familyheadwhy) || existingApplication?.data.familyHeadWhy || '',
                familyHeadHowHelp: strategy === 'replace' ? normalizeValue(raw.familyheadhowhelp) : normalizeValue(raw.familyheadhowhelp) || existingApplication?.data.familyHeadHowHelp || '',
                familyHeadExclusions: strategy === 'replace' ? normalizeValue(raw.familyheadexclusions) : normalizeValue(raw.familyheadexclusions) || existingApplication?.data.familyHeadExclusions || '',
                familyHeadIdentities: strategy === 'replace' ? normalizeValue(raw.familyheadidentities) : normalizeValue(raw.familyheadidentities) || existingApplication?.data.familyHeadIdentities || '',
                familyHeadFamilyPrefs: strategy === 'replace' ? normalizeValue(raw.familyheadfamilyprefs) : normalizeValue(raw.familyheadfamilyprefs) || existingApplication?.data.familyHeadFamilyPrefs || '',
                familyHeadConcerns: strategy === 'replace' ? normalizeValue(raw.familyheadconcerns) : normalizeValue(raw.familyheadconcerns) || existingApplication?.data.familyHeadConcerns || '',
            }
            : {
                ...baseDoc,
                goals: strategy === 'replace' ? normalizeValue(raw.goals) : normalizeValue(raw.goals) || existingApplication?.data.goals || '',
                willingMultiple: strategy === 'replace' ? normalizeValue(raw.willingmultiple) : normalizeValue(raw.willingmultiple) || existingApplication?.data.willingMultiple || '',
                preferredActivities: strategy === 'replace' ? parseActivities(raw.preferredactivities) : parseActivities(raw.preferredactivities).length > 0 ? parseActivities(raw.preferredactivities) : existingApplication?.data.preferredActivities || [],
                preferredActivitiesOther: strategy === 'replace' ? normalizeValue(raw.preferredactivitiesother) : normalizeValue(raw.preferredactivitiesother) || existingApplication?.data.preferredActivitiesOther || '',
                familyHeadPreference: strategy === 'replace' ? normalizeValue(raw.familyheadpreference) : normalizeValue(raw.familyheadpreference) || existingApplication?.data.familyHeadPreference || '',
                pairingPreferences: strategy === 'replace' ? normalizeValue(raw.pairingpreferences) : normalizeValue(raw.pairingpreferences) || existingApplication?.data.pairingPreferences || '',
                pairingExclusions: strategy === 'replace' ? normalizeValue(raw.pairingexclusions) : normalizeValue(raw.pairingexclusions) || existingApplication?.data.pairingExclusions || '',
                meetFrequency: strategy === 'replace' ? normalizeValue(raw.meetfrequency) : normalizeValue(raw.meetfrequency) || existingApplication?.data.meetFrequency || '',
                otherCommitments: strategy === 'replace' ? normalizeValue(raw.othercommitments) : normalizeValue(raw.othercommitments) || existingApplication?.data.otherCommitments || '',
                coreIdentities: strategy === 'replace' ? normalizeValue(raw.coreidentities) : normalizeValue(raw.coreidentities) || existingApplication?.data.coreIdentities || '',
            }

        try {
            await adminDb.collection('aceApplications').doc(nextDoc.id).set(nextDoc, { merge: true })
            changed = true
            stats.success++
            if (existingApplication) {
                stats.updated++
                applicationsByEmail.set(email, { id: nextDoc.id, data: nextDoc })
                if (nextDoc.applicantId) {
                    applicationsByApplicantId.set(nextDoc.applicantId, { id: nextDoc.id, data: nextDoc })
                }
            } else {
                stats.created++
                applicationsByEmail.set(email, { id: nextDoc.id, data: nextDoc })
                if (nextDoc.applicantId) {
                    applicationsByApplicantId.set(nextDoc.applicantId, { id: nextDoc.id, data: nextDoc })
                }
            }
        } catch (error: unknown) {
            stats.failed++
            stats.errors.push(`Row ${previewRow.rowNumber}: ${getErrorMessage(error)}`)
        }
    }

    if (changed) {
        revalidatePath('/admin/import')
        revalidatePath('/admin/applications')

        await logAuditAction(
            adminUser.id,
            'IMPORT',
            'ACE_APPLICATION',
            'csv',
            `Imported ACE applications from CSV with ${strategy} strategy`,
            {
                total: stats.total,
                success: stats.success,
                failed: stats.failed,
                skipped: stats.skipped,
                created: stats.created,
                updated: stats.updated,
            },
            adminUser.email
        )
    }

    stats.errorReport = buildErrorReport(preview.rows.filter(row => row.status !== 'ready').concat(
        stats.errors
            .filter(error => error.startsWith('Row '))
            .map(error => {
                const match = error.match(/^Row (\d+):\s*(.*)$/)
                return {
                    rowNumber: match ? Number(match[1]) : 0,
                    key: 'runtime-error',
                    status: 'invalid' as ImportRowStatus,
                    action: 'error' as ImportRowAction,
                    messages: [match ? match[2] : error],
                    raw: {},
                }
            })
    ))

    return stats
}

export async function importUsers(users: ImportUserRow[]): Promise<ImportStats> {
    return commitUsersImport(users, 'merge')
}

export async function importPairings(pairings: ImportPairingRow[]): Promise<ImportStats> {
    return commitPairingsImport(pairings, 'merge')
}

export async function importApplications(applications: ImportApplicationRow[]): Promise<ImportStats> {
    return commitApplicationsImport(applications, 'merge')
}
