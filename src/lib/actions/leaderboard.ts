'use server'

import { adminDb } from '@/lib/firebase-admin'

export async function getFamilyLeaderboard() {
    try {
        const snapshot = await adminDb.collection('families')
            .orderBy('totalPoints', 'desc')
            .get()

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))
    } catch (error) {
        console.error('Error fetching family leaderboard:', error)
        return []
    }
}

export async function getPairingLeaderboard() {
    try {
        const snapshot = await adminDb.collection('pairings')
            .orderBy('totalPoints', 'desc')
            .get()

        // We need to fetch family names for display
        const pairings = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))

        // Fetch all families to map names
        const familiesSnap = await adminDb.collection('families').get()
        const familyMap = new Map()
        familiesSnap.forEach(doc => {
            familyMap.set(doc.id, doc.data().name)
        })

        // Fetch all users to map names
        // Optimisation: We could just fetch relevant users, but for < 100 users, fetching all is faster than N reads
        const usersSnap = await adminDb.collection('users').get()
        const userMap = new Map()
        usersSnap.forEach(doc => {
            userMap.set(doc.id, doc.data().name)
        })

        const enhancedPairings = pairings.map((p: any) => {
            const menteeNames = (p.menteeIds || []).map((id: string) => userMap.get(id) || 'Unknown')
            return {
                ...p,
                familyName: familyMap.get(p.familyId) || 'Unknown Family',
                mentorName: userMap.get(p.mentorId) || 'Unknown Mentor',
                menteeNames
            }
        })

        return enhancedPairings
    } catch (error) {
        console.error('Error fetching pairing leaderboard:', error)
        return []
    }
}
