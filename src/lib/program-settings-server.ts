import 'server-only'

import { cache } from 'react'
import { adminDb } from '@/lib/firebase-admin'
import { ProgramSettingsDoc } from '@/types/firestore'
import { ProgramSettings } from '@/types'
import {
    calculateProgramWeek,
    getDefaultProgramSettings,
    isValidProgramDateInput,
} from '@/lib/program-settings'

const PROGRAM_SETTINGS_COLLECTION = 'settings'
const PROGRAM_SETTINGS_DOC_ID = 'program'

export const getProgramSettings = cache(async (): Promise<ProgramSettings> => {
    const defaultSettings = getDefaultProgramSettings()
    const snapshot = await adminDb.collection(PROGRAM_SETTINGS_COLLECTION).doc(PROGRAM_SETTINGS_DOC_ID).get()

    if (!snapshot.exists) {
        return defaultSettings
    }

    const data = snapshot.data() as Partial<ProgramSettingsDoc> | undefined

    return {
        programStartDate: data?.programStartDate && isValidProgramDateInput(data.programStartDate)
            ? data.programStartDate
            : defaultSettings.programStartDate,
        weekCountStartDate: data?.weekCountStartDate && isValidProgramDateInput(data.weekCountStartDate)
            ? data.weekCountStartDate
            : defaultSettings.weekCountStartDate,
        updatedBy: data?.updatedBy,
        createdAt: data?.createdAt?.toDate(),
        updatedAt: data?.updatedAt?.toDate(),
    }
})

export async function getCurrentProgramWeek(now = new Date()) {
    const settings = await getProgramSettings()
    return calculateProgramWeek(settings.weekCountStartDate, now)
}
