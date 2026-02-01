import { Metadata } from 'next'
import { AdminHeader } from '@/components/admin'
import { getFamilies } from '@/lib/actions/families'
import FamilyList from './family-list'

export const metadata: Metadata = {
    title: 'Manage Families',
    description: 'Manage ACE family groups',
}

export default async function FamiliesPage() {
    const families = await getFamilies(true) // true = include archived

    return (
        <>
            <AdminHeader title="Families" />
            <FamilyList families={families} />
        </>
    )
}
