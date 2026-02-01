import { Metadata } from 'next'
import { AdminHeader } from '@/components/admin'
import { getPairings } from '@/lib/actions/pairings'
import { getFamilies } from '@/lib/actions/families'
import { getUsers } from '@/lib/actions/users'
import PairingList from './pairing-list'

export const metadata: Metadata = {
    title: 'Pairing Management',
    description: 'Manage mentor-mentee pairings',
}

export default async function PairingsPage() {
    const [pairings, families, users] = await Promise.all([
        getPairings(),
        getFamilies(),
        getUsers()
    ])

    return (
        <>
            <AdminHeader title="Pairings" />
            <PairingList pairings={pairings} families={families} users={users} />
        </>
    )
}
