import type { Metadata } from 'next'
import { AdminHeader } from '@/components/admin'
import { getCurrentProgramWeek, getProgramSettings } from '@/lib/program-settings-server'
import ProgramSettingsForm from './program-settings-form'

export const metadata: Metadata = {
    title: 'Program Settings',
    description: 'Manage ACE program schedule settings',
}

export default async function ProgramSettingsPage() {
    const [settings, currentWeek] = await Promise.all([
        getProgramSettings(),
        getCurrentProgramWeek(),
    ])

    return (
        <>
            <AdminHeader title="Program Settings" />
            <main className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">ACE Program Schedule</h1>
                    <p className="text-muted-foreground">
                        Only admins can change the program start date and the date used to count the current week number.
                    </p>
                </div>

                <ProgramSettingsForm settings={settings} currentWeek={currentWeek} />
            </main>
        </>
    )
}
