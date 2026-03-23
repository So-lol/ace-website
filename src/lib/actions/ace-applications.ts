'use server'

import { adminDb } from '@/lib/firebase-admin'
import { requireAdmin, getAuthenticatedUser, type AuthenticatedUser } from '@/lib/auth-helpers'
import { AceApplicationDoc, AceApplicationSettingsDoc } from '@/types/firestore'
import { AceApplication, AceApplicationSettings, AceRole } from '@/types/index'
import { Timestamp } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'
import { logAuditAction } from '@/lib/actions/audit'
import { areAceApplicationsOpen } from '@/lib/ace-application-settings'

const COLLECTION = 'aceApplications'
const SETTINGS_COLLECTION = 'appSettings'
const SETTINGS_DOC_ID = 'aceApplications'

interface SubmitAceApplicationInput {
    // Contact
    name: string
    pronouns: string
    email: string
    phone: string
    instagram: string
    // Academic
    university: string
    schoolYear: string
    majorsMinors: string
    livesOnCampus: string
    // Role
    role: AceRole
    // Family Head
    familyHeadAcknowledged?: boolean
    familyHeadWhy?: string
    familyHeadHowHelp?: string
    familyHeadExclusions?: string
    familyHeadIdentities?: string
    familyHeadFamilyPrefs?: string
    familyHeadConcerns?: string
    // ACE Questions (non-family-head)
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
}

export interface CurrentAceApplicationStatus {
    hasApplied: boolean
    application: {
        id: string
        applicantId?: string
        role: AceRole
        createdAtIso: string
    } | null
}

interface UpdateAceApplicationSettingsInput {
    isOpen: boolean
    deadlineAtIso: string | null
    revealAtIso: string | null
}

const DEFAULT_ACE_APPLICATION_SETTINGS: AceApplicationSettings = {
    isOpen: true,
    deadlineAt: null,
    revealAt: null,
    updatedAt: null,
}

function toDate(value: Timestamp | Date | null | undefined): Date | null {
    if (value instanceof Timestamp) {
        return value.toDate()
    }

    return value instanceof Date ? value : null
}

function docToAceApplicationSettings(
    settings: Partial<AceApplicationSettingsDoc> | null | undefined
): AceApplicationSettings {
    if (!settings) {
        return DEFAULT_ACE_APPLICATION_SETTINGS
    }

    return {
        isOpen: settings.isOpen ?? true,
        deadlineAt: toDate(settings.deadlineAt),
        revealAt: toDate(settings.revealAt),
        updatedAt: toDate(settings.updatedAt),
    }
}

async function findExistingApplicationForUser(user: AuthenticatedUser): Promise<AceApplicationDoc | null> {
    const applicationByUid = await adminDb
        .collection(COLLECTION)
        .where('applicantId', '==', user.id)
        .limit(1)
        .get()

    if (!applicationByUid.empty) {
        return applicationByUid.docs[0].data() as AceApplicationDoc
    }

    const applicationByEmail = await adminDb
        .collection(COLLECTION)
        .where('email', '==', user.email.trim().toLowerCase())
        .limit(1)
        .get()

    if (!applicationByEmail.empty) {
        return applicationByEmail.docs[0].data() as AceApplicationDoc
    }

    return null
}

export async function getAceApplicationSettings(): Promise<AceApplicationSettings> {
    try {
        const settingsDoc = await adminDb.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID).get()
        if (!settingsDoc.exists) {
            return DEFAULT_ACE_APPLICATION_SETTINGS
        }

        return docToAceApplicationSettings(settingsDoc.data() as AceApplicationSettingsDoc)
    } catch (error) {
        console.error('Error fetching ACE application settings:', error)
        return DEFAULT_ACE_APPLICATION_SETTINGS
    }
}

export async function updateAceApplicationSettings(input: UpdateAceApplicationSettingsInput) {
    const admin = await requireAdmin()

    try {
        const deadlineAt = input.deadlineAtIso ? new Date(input.deadlineAtIso) : null
        const revealAt = input.revealAtIso ? new Date(input.revealAtIso) : null

        if (deadlineAt && Number.isNaN(deadlineAt.getTime())) {
            return { success: false, error: 'Please enter a valid application deadline.' }
        }

        if (revealAt && Number.isNaN(revealAt.getTime())) {
            return { success: false, error: 'Please enter a valid reveal date.' }
        }

        if (deadlineAt && revealAt && revealAt < deadlineAt) {
            return { success: false, error: 'Reveal date must be after the application deadline.' }
        }

        await adminDb.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID).set({
            isOpen: input.isOpen,
            deadlineAt: deadlineAt ? Timestamp.fromDate(deadlineAt) : null,
            revealAt: revealAt ? Timestamp.fromDate(revealAt) : null,
            updatedAt: Timestamp.now(),
        } satisfies AceApplicationSettingsDoc)

        revalidatePath('/apply')
        revalidatePath('/admin/applications')

        await logAuditAction(
            admin.id,
            'UPDATE',
            'ACE_APPLICATION_SETTINGS',
            SETTINGS_DOC_ID,
            `Updated ACE application settings (${input.isOpen ? 'open' : 'closed'})`,
            {
                isOpen: input.isOpen,
                deadlineAt: deadlineAt?.toISOString() ?? null,
                revealAt: revealAt?.toISOString() ?? null,
            },
            admin.email
        )

        return { success: true }
    } catch (error) {
        console.error('Error updating ACE application settings:', error)
        return { success: false, error: 'Failed to update ACE application settings.' }
    }
}

export async function getCurrentAceApplicationStatus(): Promise<CurrentAceApplicationStatus> {
    const authUser = await getAuthenticatedUser()
    if (!authUser) {
        return { hasApplied: false, application: null }
    }

    const existingApplication = await findExistingApplicationForUser(authUser)
    if (!existingApplication) {
        return { hasApplied: false, application: null }
    }

    return {
        hasApplied: true,
        application: {
            id: existingApplication.id,
            applicantId: existingApplication.applicantId,
            role: existingApplication.role,
            createdAtIso: existingApplication.createdAt.toDate().toISOString(),
        },
    }
}

export async function submitAceApplication(input: SubmitAceApplicationInput) {
    try {
        // Verify the user is authenticated
        const authUser = await getAuthenticatedUser()
        if (!authUser) {
            return { success: false, error: 'You must be signed in to submit an application.' }
        }

        const existingApplication = await findExistingApplicationForUser(authUser)
        if (existingApplication) {
            return { success: false, error: 'You have already applied to the ACE program.' }
        }

        const settings = await getAceApplicationSettings()
        if (!areAceApplicationsOpen(settings)) {
            return { success: false, error: 'ACE applications are currently closed.' }
        }

        // Basic validation
        if (!input.name || !input.email || !input.phone || !input.role) {
            return { success: false, error: 'Please fill in all required fields.' }
        }

        const now = Timestamp.now()
        const docRef = adminDb.collection(COLLECTION).doc()

        const doc: AceApplicationDoc = {
            id: docRef.id,
            applicantId: authUser.id,
            // Contact
            name: input.name.trim(),
            pronouns: input.pronouns.trim(),
            email: input.email.trim().toLowerCase(),
            phone: input.phone.trim(),
            instagram: input.instagram.trim(),
            // Academic
            university: input.university || 'University of Minnesota - Twin Cities',
            schoolYear: input.schoolYear,
            majorsMinors: input.majorsMinors.trim(),
            livesOnCampus: input.livesOnCampus,
            // Role
            role: input.role,
            // Personal
            hobbies: input.hobbies.trim(),
            musicTaste: input.musicTaste.trim(),
            perfectDay: input.perfectDay.trim(),
            dreamVacation: (input.dreamVacation || '').trim(),
            introExtroScale: input.introExtroScale,
            reachOutStyle: input.reachOutStyle,
            additionalInfo: (input.additionalInfo || '').trim(),
            // Final
            availableForReveal: input.availableForReveal,
            finalComments: (input.finalComments || '').trim(),
            selfIntro: (input.selfIntro || '').trim(),
            // Timestamps
            createdAt: now,
            updatedAt: now,
        }

        // Conditionally add role-specific fields
        if (input.role === 'FAMILY_HEAD') {
            doc.familyHeadAcknowledged = input.familyHeadAcknowledged
            doc.familyHeadWhy = (input.familyHeadWhy || '').trim()
            doc.familyHeadHowHelp = (input.familyHeadHowHelp || '').trim()
            doc.familyHeadExclusions = (input.familyHeadExclusions || '').trim()
            doc.familyHeadIdentities = (input.familyHeadIdentities || '').trim()
            doc.familyHeadFamilyPrefs = (input.familyHeadFamilyPrefs || '').trim()
            doc.familyHeadConcerns = (input.familyHeadConcerns || '').trim()
        } else {
            doc.goals = (input.goals || '').trim()
            doc.willingMultiple = input.willingMultiple
            doc.preferredActivities = input.preferredActivities || []
            doc.preferredActivitiesOther = (input.preferredActivitiesOther || '').trim()
            doc.familyHeadPreference = (input.familyHeadPreference || '').trim()
            doc.pairingPreferences = (input.pairingPreferences || '').trim()
            doc.pairingExclusions = (input.pairingExclusions || '').trim()
            doc.meetFrequency = input.meetFrequency
            doc.otherCommitments = (input.otherCommitments || '').trim()
            doc.coreIdentities = (input.coreIdentities || '').trim()
        }

        await docRef.set(doc)

        return { success: true, id: docRef.id }
    } catch (error) {
        console.error('Error submitting ACE application:', error)
        return { success: false, error: 'Failed to submit application. Please try again.' }
    }
}

function docToApplication(doc: AceApplicationDoc): AceApplication {
    return {
        ...doc,
        createdAt: doc.createdAt.toDate(),
        updatedAt: doc.updatedAt.toDate(),
    }
}

export async function getAceApplications(): Promise<AceApplication[]> {
    await requireAdmin()

    const snapshot = await adminDb
        .collection(COLLECTION)
        .orderBy('createdAt', 'desc')
        .get()

    return snapshot.docs.map((d) => docToApplication(d.data() as AceApplicationDoc))
}

export async function deleteAceApplication(id: string) {
    await requireAdmin()

    try {
        await adminDb.collection(COLLECTION).doc(id).delete()
        revalidatePath('/admin/applications')
        return { success: true }
    } catch (error) {
        console.error('Error deleting ACE application:', error)
        return { success: false, error: 'Failed to delete application.' }
    }
}
