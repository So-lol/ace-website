// Safe Client Types (No firebase-admin imports)

// ======================
// ENUMS / UNIONS
// ======================
export type UserRole = 'ADMIN' | 'MENTOR' | 'MENTEE'
export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type AdjustmentTargetType = 'SUBMISSION' | 'PAIRING' | 'FAMILY'

// ======================
// BASE INTERFACES (Client-side representations)
// ======================

export interface User {
    id: string
    uid: string // Keep consistency if needed
    name: string
    email: string
    role: UserRole
    familyId: string | null
    avatarUrl: string | null
    createdAt: Date
    updatedAt: Date
}

export interface Family {
    id: string
    name: string
    isArchived: boolean
    memberIds: string[]
    createdAt: Date
    updatedAt: Date
}

export interface Pairing {
    id: string
    familyId: string
    mentorId: string
    menteeIds: string[]
    weeklyPoints: number
    totalPoints: number
    createdAt: Date
    updatedAt: Date
}

export interface Submission {
    id: string
    pairingId: string
    submitterId: string
    weekNumber: number
    year: number
    imageUrl: string
    imagePath: string
    status: SubmissionStatus
    basePoints: number
    bonusPoints: number
    totalPoints: number
    reviewerId?: string
    reviewReason?: string
    reviewedAt?: Date
    bonusActivityIds: string[]
    createdAt: Date
    updatedAt: Date
}

export interface BonusActivity {
    id: string
    name: string
    description?: string
    points: number
    isActive: boolean
    // ... other fields
}

// ======================
// EXTENDED INTERFACES (Relations)
// ======================

export type UserWithFamily = User & {
    family: Family | null
}

export type PairingWithMentees = Pairing & {
    mentees: User[] // or UserWithFamily?
    family: Family
}

export type UserWithPairings = User & {
    family: Family | null
    mentorPairings: PairingWithMentees[]
    menteePairings: PairingWithMentees[]
}

export type PairingFull = Pairing & {
    mentor: User
    mentees: User[]
    family: Family
    submissions: Submission[]
}

export type FamilyWithMembers = Family & {
    members: User[]
    pairings: Pairing[]
}

export type SubmissionWithRelations = Submission & {
    pairing: PairingFull
    submitter: User
    reviewer: User | null
    bonusActivities: { bonusActivity: BonusActivity }[]
}

export type AnnouncementWithAuthor = {
    id: string
    title: string
    content: string
    authorId: string
    author: User
    isPublished: boolean
    createdAt: Date
}

// ======================
// UTILS
// ======================

export function getCurrentWeek(): { weekNumber: number; year: number } {
    const now = new Date()
    const year = now.getFullYear()
    const startOfYear = new Date(year, 0, 1)
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7)
    return { weekNumber, year }
}

// Input Types
export type CreateFamilyInput = { name: string }
export type CreateUserInput = { email: string; name: string; role: UserRole }
export type CreatePairingInput = { familyId: string; mentorId: string; menteeIds: string[] }
