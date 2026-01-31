import {
    User,
    Family,
    Pairing,
    PairingMentee,
    Submission,
    BonusActivity,
    SubmissionBonus,
    Announcement,
    AuditLog,
    PointsAdjustment,
    UserRole,
    SubmissionStatus,
    AdjustmentTargetType
} from '@prisma/client'

// Re-export enums
export { UserRole, SubmissionStatus, AdjustmentTargetType }

// Extended types with relations
export type UserWithFamily = User & {
    family: Family | null
}

export type UserWithPairings = User & {
    family: Family | null
    mentorPairings: PairingWithMentees[]
    menteePairings: (PairingMentee & {
        pairing: Pairing & {
            mentor: User
            family: Family
        }
    })[]
}

export type PairingWithMentees = Pairing & {
    mentees: (PairingMentee & {
        mentee: User
    })[]
    family: Family
}

export type PairingFull = Pairing & {
    mentor: User
    mentees: (PairingMentee & {
        mentee: User
    })[]
    family: Family
    submissions: Submission[]
}

export type FamilyWithMembers = Family & {
    members: User[]
    pairings: Pairing[]
}

export type SubmissionWithRelations = Submission & {
    pairing: Pairing & {
        mentor: User
        mentees: (PairingMentee & {
            mentee: User
        })[]
        family: Family
    }
    submitter: User
    reviewer: User | null
    bonusActivities: (SubmissionBonus & {
        bonusActivity: BonusActivity
    })[]
}

export type AnnouncementWithAuthor = Announcement & {
    author: User
}

export type AuditLogWithActor = AuditLog & {
    actor: User
}

export type PointsAdjustmentWithAdmin = PointsAdjustment & {
    admin: User
}

// Form types
export type CreateFamilyInput = {
    name: string
}

export type UpdateFamilyInput = {
    name?: string
    isArchived?: boolean
}

export type CreateUserInput = {
    email: string
    name: string
    role: UserRole
    familyId?: string
}

export type CreatePairingInput = {
    familyId: string
    mentorId: string
    menteeIds: string[]
}

export type CreateSubmissionInput = {
    pairingId: string
    weekNumber: number
    year: number
    imageUrl: string
    imagePath: string
    bonusActivityIds: string[]
}

export type ReviewSubmissionInput = {
    status: 'APPROVED' | 'REJECTED'
    reason?: string
    basePoints?: number
}

export type CreateBonusActivityInput = {
    name: string
    description?: string
    points: number
    weekNumber?: number
    year?: number
    startDate?: Date
    endDate?: Date
    isActive?: boolean
}

export type CreateAnnouncementInput = {
    title: string
    content: string
    isPublished?: boolean
    isPinned?: boolean
    scheduledFor?: Date
}

export type CreatePointsAdjustmentInput = {
    targetType: AdjustmentTargetType
    targetId: string
    amount: number
    reason: string
}

// Leaderboard types
export type LeaderboardPairing = {
    id: string
    mentorName: string
    menteeNames: string[]
    familyName: string
    totalPoints: number
    rank: number
}

export type LeaderboardFamily = {
    id: string
    name: string
    memberCount: number
    totalPoints: number
    rank: number
}

// CSV Import types
export type CSVImportPreview = {
    headers: string[]
    rows: Record<string, string>[]
    errors: CSVImportError[]
    mappings: Record<string, string>
}

export type CSVImportError = {
    row: number
    column: string
    message: string
    type: 'error' | 'warning'
}

export type CSVImportResult = {
    success: boolean
    usersCreated: number
    familiesCreated: number
    pairingsCreated: number
    errors: CSVImportError[]
}

// Week calculation
export function getCurrentWeek(): { weekNumber: number; year: number } {
    const now = new Date()
    const year = now.getFullYear()

    // Calculate week number (ISO week)
    const startOfYear = new Date(year, 0, 1)
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7)

    return { weekNumber, year }
}
