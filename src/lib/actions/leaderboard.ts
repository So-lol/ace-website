'use server'

import { adminDb } from '@/lib/firebase-admin'
import { FamilyDoc, PairingDoc } from '@/types/firestore'

export async function getFamilyLeaderboard() {
    try {
        const [snapshot, pairingsSnap] = await Promise.all([
            adminDb.collection('families').orderBy('totalPoints', 'desc').get(),
            adminDb.collection('pairings').select('familyId', 'mentorId', 'menteeIds').get()
        ])

        // Map pairing members to families
        const pairingMembersByFamily = new Map<string, string[]>()
        pairingsSnap.forEach(doc => {
            const p = doc.data()
            if (!p.familyId) return
            const list = pairingMembersByFamily.get(p.familyId) || []
            if (p.mentorId) list.push(p.mentorId)
            if (p.menteeIds && Array.isArray(p.menteeIds)) list.push(...p.menteeIds)
            pairingMembersByFamily.set(p.familyId, list)
        })

        return snapshot.docs.map(doc => {
            const data = doc.data() as FamilyDoc

            // Calculate unique users count (Members + Heads + Aunts/Uncles)
            const heads = data.familyHeadIds || []
            // Legacy support for single familyHeadId if needed
            const legacyHead = (data as any).familyHeadId
            if (legacyHead && !heads.includes(legacyHead)) {
                heads.push(legacyHead)
            }

            const pMembers = pairingMembersByFamily.get(doc.id) || []
            const uniqueMembers = new Set([
                ...pMembers,
                ...heads,
                ...(data.auntUncleIds || [])
            ])

            return {
                id: doc.id,
                name: data.name,
                totalPoints: data.totalPoints || 0,
                weeklyPoints: data.weeklyPoints || 0,
                memberCount: uniqueMembers.size,
                createdAt: data.createdAt?.toDate?.() || new Date(),
                updatedAt: data.updatedAt?.toDate?.() || new Date(),
            }
        })
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

        const pairings = snapshot.docs.map(doc => ({
            ...(doc.data() as PairingDoc),
            id: doc.id
        }))

        // Fetch all families to map names
        const familiesSnap = await adminDb.collection('families').get()
        const familyMap = new Map()
        familiesSnap.forEach(doc => {
            familyMap.set(doc.id, doc.data().name)
        })

        // Fetch all users to map names
        const usersSnap = await adminDb.collection('users').get()
        const userMap = new Map()
        usersSnap.forEach(doc => {
            userMap.set(doc.id, doc.data().name)
        })

        const enhancedPairings = pairings.map((p) => {
            const menteeNames = (p.menteeIds || []).map((id: string) => userMap.get(id) || 'Unknown')
            return {
                id: p.id,
                familyId: p.familyId,
                mentorId: p.mentorId,
                totalPoints: p.totalPoints || 0,
                weeklyPoints: p.weeklyPoints || 0,
                familyName: familyMap.get(p.familyId) || 'Unknown Family',
                mentorName: userMap.get(p.mentorId) || 'Unknown Mentor',
                menteeNames,
                createdAt: p.createdAt?.toDate?.() || new Date(),
                updatedAt: p.updatedAt?.toDate?.() || new Date(),
            }
        })

        return enhancedPairings
    } catch (error) {
        console.error('Error fetching pairing leaderboard:', error)
        return []
    }
}
