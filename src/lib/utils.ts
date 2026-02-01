import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Semester Start Date: January 1, 2026 (Adjust as needed)
const SEMESTER_START_DATE = new Date('2026-01-01T00:00:00-08:00') // PST

export function getCurrentWeek(): { weekNumber: number, year: number } {
  const now = new Date()
  const diffInTime = now.getTime() - SEMESTER_START_DATE.getTime()
  const diffInDays = Math.ceil(diffInTime / (1000 * 3600 * 24))

  // Week 1 starts on day 1. If diff is negative (before start), return 0 or 1.
  if (diffInDays < 0) return { weekNumber: 0, year: SEMESTER_START_DATE.getFullYear() }

  // Calculate week number (1-indexed)
  const weekNumber = Math.ceil((diffInDays + 1) / 7)
  return { weekNumber, year: SEMESTER_START_DATE.getFullYear() }
}
