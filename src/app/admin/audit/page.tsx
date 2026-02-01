import { getAuditLogs } from '@/lib/actions/audit'
import AuditLogsList from './audit-logs-list'
import { AdminHeader } from '@/components/admin'

export default async function AuditPage() {
    const logs = await getAuditLogs()

    // Serialize timestamps
    const serializedLogs = logs.map(log => ({
        ...log,
        timestamp: log.timestamp.toDate()
    }))

    return (
        <div className="flex flex-col gap-6">
            <AdminHeader title="Audit Log" />
            <div className="px-6 pb-6">
                <AuditLogsList logs={serializedLogs} />
            </div>
        </div>
    )
}
