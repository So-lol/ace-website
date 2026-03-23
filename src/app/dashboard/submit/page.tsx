import { getBonusActivities } from '@/lib/actions/bonuses'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import SubmitForm from './submit-form'

import { getCurrentProgramWeek } from '@/lib/program-settings-server'
import { redirect } from 'next/navigation'

export default async function SubmitPage() {
    const user = await getAuthenticatedUser()

    if (!user) {
        redirect('/login')
    }

    const [currentWeek, bonusActivities] = await Promise.all([
        getCurrentProgramWeek(),
        getBonusActivities(true),
    ])
    const { weekNumber, year } = currentWeek

    return (
        <SubmitForm
            bonusActivities={bonusActivities}
            weekNumber={weekNumber}
            year={year}
        />
    )
}
