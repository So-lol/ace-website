import { getAceApplications, getAceApplicationSettings } from '@/lib/actions/ace-applications'
import { AdminHeader } from '@/components/admin'
import { ApplicationsTable } from './applications-table'
import { ApplicationSettingsCard } from './application-settings-card'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'ACE Applications',
}

export default async function AdminApplicationsPage() {
    const [applications, settings] = await Promise.all([
        getAceApplications(),
        getAceApplicationSettings(),
    ])

    return (
        <div>
            <AdminHeader title="ACE Applications" />
            <div className="p-6 space-y-6">
                <ApplicationSettingsCard
                    isOpen={settings.isOpen}
                    deadlineAtIso={settings.deadlineAt?.toISOString() ?? null}
                    revealAtIso={settings.revealAt?.toISOString() ?? null}
                    updatedAtIso={settings.updatedAt?.toISOString() ?? null}
                />
                <ApplicationsTable applications={applications} />
            </div>
        </div>
    )
}
