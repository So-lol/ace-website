import { Metadata } from 'next'
import { AdminHeader } from '@/components/admin'
import { getHelpRequests } from '@/lib/actions/help-requests'
import HelpRequestList from './help-request-list'

export const metadata: Metadata = {
    title: 'Help Requests',
    description: 'Review help requests submitted by ACE users',
}

export default async function HelpRequestsPage() {
    const helpRequests = await getHelpRequests()

    return (
        <>
            <AdminHeader title="Help Requests" />
            <HelpRequestList helpRequests={helpRequests} />
        </>
    )
}
