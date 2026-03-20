import { Metadata } from 'next'
import { NavbarWithAuthClient, Footer } from '@/components/layout'
import LeaderboardClient from './leaderboard-client'
import { getFamilyLeaderboard, getPairingLeaderboard } from '@/lib/actions/leaderboard'

export const metadata: Metadata = {
    title: 'Leaderboard',
    description: 'See the top performing families and pairings in the ACE program',
}

export default async function LeaderboardPage() {
    const [families, pairings] = await Promise.all([
        getFamilyLeaderboard(),
        getPairingLeaderboard()
    ])

    return (
        <div className="min-h-screen flex flex-col">
            <NavbarWithAuthClient />

            <main className="flex-1 py-12">
                <LeaderboardClient families={families} pairings={pairings} />
            </main>

            <Footer />
        </div>
    )
}
