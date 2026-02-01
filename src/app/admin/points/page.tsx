import { getPairingsForPointsAdmin, getPointsHistory } from '@/lib/actions/points'
import PointsForm from './points-form'

export default async function PointsAdminPage() {
    const [pairings, auditLogs] = await Promise.all([
        getPairingsForPointsAdmin(),
        getPointsHistory() as Promise<any[]>
    ])

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Points Administration</h1>
                <p className="text-muted-foreground">
                    Manually adjust points for pairings. All changes are logged for audit purposes.
                </p>
            </div>

            <PointsForm pairings={pairings} auditLogs={auditLogs} />
        </div>
    )
}
