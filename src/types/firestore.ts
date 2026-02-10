import { Timestamp } from 'firebase-admin/firestore'
import type { UserRole, SubmissionStatus } from './enums'
export type { UserRole, SubmissionStatus }

// ======================
// ENUMS / UNIONS
// ======================
// Definitions moved to enums.ts

// ======================
// COLLECTIONS
// ======================

// users/{uid}
export interface UserDoc {
    uid: string
    email: string
    name: string
    role: UserRole
    familyId: string | null
    avatarUrl: string | null
    createdAt: Timestamp
    updatedAt: Timestamp
}

// families/{id}
export interface FamilyDoc {
    id: string
    name: string
    isArchived: boolean
    memberIds: string[] // Array of User UIDs
    familyHeadIds?: string[] // Array of User UIDs of family heads
    auntUncleIds?: string[] // Array of User UIDs for aunts/uncles
    weeklyPoints?: number
    totalPoints?: number
    createdAt: Timestamp
    updatedAt: Timestamp
}

// pairings/{id}
export interface PairingDoc {
    id: string
    familyId: string
    mentorId: string
    menteeIds: string[] // Array of User UIDs
    weeklyPoints: number
    totalPoints: number
    createdAt: Timestamp
    updatedAt: Timestamp
}

// submissions/{id}
export interface SubmissionDoc {
    id: string
    pairingId: string
    submitterId: string
    weekNumber: number
    year: number
    imageUrl: string
    imagePath: string // Storage path
    status: SubmissionStatus
    basePoints: number
    bonusPoints: number
    totalPoints: number
    reviewerId?: string
    reviewReason?: string
    reviewedAt?: Timestamp
    bonusActivityIds: string[] // IDs of claimed bonuses
    isArchived?: boolean       // For media retention policy
    archivedAt?: Timestamp     // When it was archived
    createdAt: Timestamp
    updatedAt: Timestamp
}

// bonusAttempts/{id} - Optional, if we need detailed tracking per bonus
// For now, simpler to just store IDs in submission or a subcollection

// announcements/{id}
export interface BonusActivityDoc {
    id: string
    name: string
    description: string
    points: number
    isActive: boolean
    createdAt: Timestamp
    updatedAt: Timestamp
}

export interface AnnouncementDoc {
    id: string
    title: string
    content: string
    authorId: string
    authorName: string // Denormalized for display
    isPublished: boolean
    isPinned: boolean
    publishedAt: Timestamp | null
    createdAt: Timestamp
    updatedAt: Timestamp
}

export interface AuditLogDoc {
    id: string
    action: string
    targetType: string
    targetId: string
    actorId: string
    actorEmail?: string
    details: string
    timestamp: Timestamp
    metadata?: Record<string, any>
}

// aceApplications/{id}
export type AceRole = 'FAMILY_HEAD' | 'ANH' | 'CHI' | 'CHANH' | 'EM'

export interface AceApplicationDoc {
    id: string

    // Contact Info
    name: string
    pronouns: string
    email: string
    phone: string
    instagram: string

    // Academic Info
    university: string
    schoolYear: string
    majorsMinors: string
    livesOnCampus: string

    // Role
    role: AceRole

    // Family Head only fields
    familyHeadAcknowledged?: boolean
    familyHeadWhy?: string
    familyHeadHowHelp?: string
    familyHeadExclusions?: string
    familyHeadIdentities?: string
    familyHeadFamilyPrefs?: string
    familyHeadConcerns?: string

    // Non-Family-Head ACE Questions
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

    // Personal Questions
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

    createdAt: Timestamp
    updatedAt: Timestamp
}
