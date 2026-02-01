import { getBonusActivities } from '@/lib/actions/bonuses'
import SubmitForm from './submit-form'

import { getCurrentWeek } from '@/lib/utils'

export default async function SubmitPage() {
    // Fetch active bonus activities from Firestore
    const bonusActivities = await getBonusActivities(true)
    const { weekNumber, year } = getCurrentWeek()

    return <SubmitForm bonusActivities={bonusActivities} weekNumber={weekNumber} year={year} />
}
