// Consolidated Enums and Types for ACE Website

export type UserRole = 'ADMIN' | 'MENTOR' | 'MENTEE'
export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type AdjustmentTargetType = 'SUBMISSION' | 'PAIRING' | 'FAMILY'

export const USER_ROLES: UserRole[] = ['ADMIN', 'MENTOR', 'MENTEE']
export const SUBMISSION_STATUSES: SubmissionStatus[] = ['PENDING', 'APPROVED', 'REJECTED']
