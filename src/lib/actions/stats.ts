'use server'

import { adminDb } from '@/lib/firebase-admin'
import { requireAdmin } from '@/lib/auth-helpers'
import { getCurrentWeek } from '@/lib/utils'

export async function getAdminStats() {
    try {
        // Secure action
        await requireAdmin()

        const { weekNumber, year } = getCurrentWeek()

        const [
            usersSnap,
            familiesSnap,
            pairingsSnap,
            submissionsSnap,
            announcementsSnap,
            activeBonusesSnap,
            approvedSubmissionsThisWeekSnap
        ] = await Promise.all([
            adminDb.collection('users').count().get(),
            adminDb.collection('families').count().get(),
            adminDb.collection('pairings').count().get(),
            adminDb.collection('submissions').where('status', '==', 'PENDING').count().get(),
            adminDb.collection('announcements').count().get(),
            adminDb.collection('bonusActivities').where('isActive', '==', true).count().get(),
            adminDb.collection('submissions')
                .where('status', '==', 'APPROVED')
                .where('weekNumber', '==', weekNumber)
                .where('year', '==', year)
                .get()
        ])

        const approvedSubmissions = approvedSubmissionsThisWeekSnap.docs.map(d => d.data())
        const pointsThisWeek = approvedSubmissions.reduce((sum, s) => sum + (s.totalPoints || 0), 0)

        return {
            totalUsers: usersSnap.data().count,
            totalFamilies: familiesSnap.data().count,
            totalPairings: pairingsSnap.data().count,
            pendingSubmissions: submissionsSnap.data().count,
            totalAnnouncements: announcementsSnap.data().count,
            activeBonuses: activeBonusesSnap.data().count,
            pointsThisWeek,
            approvedThisWeek: approvedSubmissions.length
        }
    } catch (error) {
        console.error('Error fetching admin stats:', error)
        return {
            totalUsers: 0,
            totalFamilies: 0,
            totalPairings: 0,
            pendingSubmissions: 0,
            totalAnnouncements: 0,
            activeBonuses: 0,
            pointsThisWeek: 0,
            approvedThisWeek: 0
        }
    }
}

export async function getUserStats(userId: string) {
    try {
        const submissionsSnap = await adminDb.collection('submissions')
            .where('submitterId', '==', userId)
            .get()

        const submissions = submissionsSnap.docs.map(doc => doc.data())
        const totalPoints = submissions.reduce((acc, sub) => acc + (sub.totalPoints || 0), 0)
        const totalSubmissions = submissions.length

        // Calculate weeks submitted count (unique weeks)
        const submittedWeeks = new Set(submissions.map(sub => `${sub.year}-${sub.weekNumber}`)).size

        return {
            totalPoints,
            totalSubmissions,
            submittedWeeks,
            streak: 0
        }
    } catch (error) {
        console.error('Error fetching user stats:', error)
        return {
            totalPoints: 0,
            totalSubmissions: 0,
            submittedWeeks: 0,
            streak: 0
        }
    }
}
