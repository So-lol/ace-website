import { getAceApplications } from '@/lib/actions/ace-applications'
import { AdminHeader } from '@/components/admin'
import { ApplicationsTable } from './applications-table'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'ACE Applications',
}

export default async function AdminApplicationsPage() {
    const applications = await getAceApplications()

    return (
        <div>
            <AdminHeader title="ACE Applications" />
            <div className="p-6">
                <ApplicationsTable applications={applications} />
            </div>
        </div>
    )
}
