import { Metadata } from 'next'
import { AdminHeader } from '@/components/admin'
import { getBonusActivities } from '@/lib/actions/bonuses'
import BonusList from './bonus-list'

export const metadata: Metadata = {
    title: 'Bonus Activities',
    description: 'Manage weekly bonus activities',
}

export default async function BonusesPage() {
    const bonuses = await getBonusActivities(false) // false = fetch all, including inactive

    return (
        <>
            <AdminHeader title="Bonus Activities" />
            <BonusList bonuses={bonuses} />
        </>
    )
}
