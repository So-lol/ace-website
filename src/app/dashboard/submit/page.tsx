import { getBonusActivities } from '@/lib/actions/bonuses'
import { getUserSubmissions } from '@/lib/actions/submissions'
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
    const [bonusActivities, submissions] = await Promise.all([
        getBonusActivities(true),
        getUserSubmissions(user.id),
    ])
    const existingSubmission = submissions.find(submission => submission.weekNumber === weekNumber && submission.year === year)

    return (
        <SubmitForm
            bonusActivities={bonusActivities}
            weekNumber={weekNumber}
            year={year}
            existingSubmissionStatus={existingSubmission?.status ?? null}
        />
    )
}
