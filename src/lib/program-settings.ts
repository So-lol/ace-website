import type { ProgramSettings } from '@/types'

export const DEFAULT_PROGRAM_START_DATE = '2026-02-09'
export const DEFAULT_WEEK_COUNT_START_DATE = '2026-02-09'

const MS_PER_DAY = 1000 * 60 * 60 * 24

export type CurrentProgramWeek = {
    weekNumber: number
    year: number
}

export function isValidProgramDateInput(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false
    }

    const parsedDate = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value
}

export function getDefaultProgramSettings(): ProgramSettings {
    return {
        programStartDate: DEFAULT_PROGRAM_START_DATE,
        weekCountStartDate: DEFAULT_WEEK_COUNT_START_DATE,
    }
}

function parseProgramDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`)
}

function getUtcStartOfDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function calculateProgramWeek(weekCountStartDate: string, now = new Date()): CurrentProgramWeek {
    const safeWeekCountStartDate = isValidProgramDateInput(weekCountStartDate)
        ? weekCountStartDate
        : DEFAULT_WEEK_COUNT_START_DATE

    const startDate = parseProgramDate(safeWeekCountStartDate)
    const today = getUtcStartOfDay(now)
    const diffInDays = Math.floor((today.getTime() - startDate.getTime()) / MS_PER_DAY)

    if (diffInDays < 0) {
        return {
            weekNumber: 0,
            year: startDate.getUTCFullYear(),
        }
    }

    return {
        weekNumber: Math.floor(diffInDays / 7) + 1,
        year: startDate.getUTCFullYear(),
    }
}
