'use server'

import { adminDb } from '@/lib/firebase-admin'
import { requireAdmin } from '@/lib/auth-helpers'
import { AceApplicationDoc } from '@/types/firestore'
import { AceApplication, AceRole } from '@/types/index'
import { Timestamp } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'

const COLLECTION = 'aceApplications'

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

export async function submitAceApplication(input: SubmitAceApplicationInput) {
    try {
        // Basic validation
        if (!input.name || !input.email || !input.phone || !input.role) {
            return { success: false, error: 'Please fill in all required fields.' }
        }

        const now = Timestamp.now()
        const docRef = adminDb.collection(COLLECTION).doc()

        const doc: AceApplicationDoc = {
            id: docRef.id,
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
