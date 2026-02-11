// Safe Client Types (No firebase-admin imports)
import type { UserRole, SubmissionStatus } from './enums'
export type { UserRole, SubmissionStatus }

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
    description: string
    points: number
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

// ======================
// EXTENDED INTERFACES (Relations)
// ======================

export type UserWithFamily = User & {
    family: Family | null
}

export interface Announcement {
    id: string
    title: string
    content: string
    authorId: string
    authorName: string
    isPublished: boolean
    isPinned: boolean
    publishedAt: Date | null
    createdAt: Date
    updatedAt: Date
}

// ======================
// ACE APPLICATION
// ======================
export type AceRole = 'FAMILY_HEAD' | 'ANH' | 'CHI' | 'CHANH' | 'EM'

export interface AceApplication {
    id: string
    name: string
    pronouns: string
    email: string
    phone: string
    instagram: string
    university: string
    schoolYear: string
    majorsMinors: string
    livesOnCampus: string
    role: AceRole

    // Family Head fields
    familyHeadAcknowledged?: boolean
    familyHeadWhy?: string
    familyHeadHowHelp?: string
    familyHeadExclusions?: string
    familyHeadIdentities?: string
    familyHeadFamilyPrefs?: string
    familyHeadConcerns?: string

    // Non-Family-Head fields
    goals?: string
    willingMultiple?: string
    preferredActivities?: string[]
    preferredActivitiesOther?: string
    familyHeadPreference?: string
    pairingPreferences?: string
    pairingExclusions?: string
    meetFrequency?: string
    otherCommitments?: string
    coreIdentities?: string

    // Personal
    hobbies: string
    musicTaste: string
    perfectDay: string
    dreamVacation: string
    introExtroScale: number
    reachOutStyle: string
    additionalInfo: string

    // Final
    availableForReveal: string
    finalComments: string
    selfIntro: string

    createdAt: Date
    updatedAt: Date
}
