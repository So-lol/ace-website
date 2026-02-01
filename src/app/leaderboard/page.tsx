import { Metadata } from 'next'
import { NavbarWithAuthClient, Footer } from '@/components/layout'
import LeaderboardClient from './leaderboard-client'
import { getFamilyLeaderboard, getPairingLeaderboard } from '@/lib/actions/leaderboard'
import { FamilyDoc } from '@/types/firestore'

export const metadata: Metadata = {
    title: 'Leaderboard',
    description: 'See the top performing families and pairings in the ACE program',
}

export default async function LeaderboardPage() {
    const [families, pairings] = await Promise.all([
        getFamilyLeaderboard(),
        getPairingLeaderboard()
    ])

    // cast families to fix any type issues if necessary, usually it's derived from server action

    return (
        <div className="min-h-screen flex flex-col">
            <NavbarWithAuthClient />

            <main className="flex-1 py-12">
                <LeaderboardClient families={families as (FamilyDoc & { id: string })[]} pairings={pairings} />
            </main>

            <Footer />
        </div>
    )
}
