import { Timestamp } from 'firebase-admin/firestore'

// ======================
// ENUMS / UNIONS
// ======================
export type UserRole = 'ADMIN' | 'MENTOR' | 'MENTEE'
export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

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
    createdAt: Timestamp
    updatedAt: Timestamp
}

// bonusAttempts/{id} - Optional, if we need detailed tracking per bonus
// For now, simpler to just store IDs in submission or a subcollection

// announcements/{id}
export interface AnnouncementDoc {
    id: string
    title: string
    content: string
    authorId: string
    isPublished: boolean
    createdAt: Timestamp
    updatedAt: Timestamp
}
