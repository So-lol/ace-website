import { Metadata } from 'next'
import { AdminHeader } from '@/components/admin'
import { getFamilies } from '@/lib/actions/families'
import { getUsers } from '@/lib/actions/users'
import FamilyList from './family-list'

export const metadata: Metadata = {
    title: 'Manage Families',
    description: 'Manage ACE family groups',
}

export default async function FamiliesPage() {
    const [families, users] = await Promise.all([
        getFamilies(true), // true = include archived
        getUsers()
    ])

    return (
        <>
            <AdminHeader title="Families" />
            <FamilyList families={families} users={users} />
        </>
    )
}
