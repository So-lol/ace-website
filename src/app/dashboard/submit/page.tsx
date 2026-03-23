import { getBonusActivities } from '@/lib/actions/bonuses'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import SubmitForm from './submit-form'

import { getCurrentWeek } from '@/lib/utils'
import { redirect } from 'next/navigation'

export default async function SubmitPage() {
    const user = await getAuthenticatedUser()

    if (!user) {
        redirect('/login')
    }

    const { weekNumber, year } = getCurrentWeek()
    const bonusActivities = await getBonusActivities(true)

    return (
        <SubmitForm
            bonusActivities={bonusActivities}
            weekNumber={weekNumber}
            year={year}
        />
    )
}
