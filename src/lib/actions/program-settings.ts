'use server'

import { Timestamp } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-helpers'
import { logAuditAction } from '@/lib/actions/audit'
import { getErrorMessage } from '@/lib/errors'
import { adminDb } from '@/lib/firebase-admin'
import { getProgramSettings } from '@/lib/program-settings-server'
import { isValidProgramDateInput } from '@/lib/program-settings'

const PROGRAM_SETTINGS_COLLECTION = 'settings'
const PROGRAM_SETTINGS_DOC_ID = 'program'

export async function getProgramSettingsForAdmin() {
    await requireAdmin()
    return getProgramSettings()
}

export async function updateProgramSettings(data: { programStartDate: string; weekCountStartDate: string }) {
    try {
        const admin = await requireAdmin()
        const programStartDate = data.programStartDate.trim()
        const weekCountStartDate = data.weekCountStartDate.trim()

        if (!isValidProgramDateInput(programStartDate) || !isValidProgramDateInput(weekCountStartDate)) {
            return { success: false, error: 'Please enter valid dates for both program settings.' }
        }

        const settingsRef = adminDb.collection(PROGRAM_SETTINGS_COLLECTION).doc(PROGRAM_SETTINGS_DOC_ID)
        const existingSnapshot = await settingsRef.get()
        const now = Timestamp.now()

        await settingsRef.set({
            programStartDate,
            weekCountStartDate,
            updatedBy: admin.id,
            updatedAt: now,
            createdAt: existingSnapshot.exists ? existingSnapshot.get('createdAt') || now : now,
        }, { merge: true })

        await logAuditAction(
            admin.id,
            'UPDATE',
            'PROGRAM_SETTINGS',
            PROGRAM_SETTINGS_DOC_ID,
            'Updated ACE program schedule settings',
            {
                programStartDate,
                weekCountStartDate,
            },
            admin.email
        )

        revalidatePath('/admin')
        revalidatePath('/admin/settings')
        revalidatePath('/dashboard')
        revalidatePath('/dashboard/submit')

        return { success: true }
    } catch (error) {
        console.error('Error updating program settings:', error)
        return { success: false, error: getErrorMessage(error) || 'Failed to update program settings.' }
    }
}
