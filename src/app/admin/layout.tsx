import { AdminSidebar } from '@/components/admin'
import { requireAdmin } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Server-side authorization check
    await requireAdmin()

    return (
        <div className="min-h-screen bg-muted/30">
            <AdminSidebar />
            <div className="ml-64 transition-all duration-300">
                {children}
            </div>
        </div>
    )
}
