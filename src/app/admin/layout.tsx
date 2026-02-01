import { AdminSidebar } from '@/components/admin'

export const dynamic = 'force-dynamic'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-muted/30">
            <AdminSidebar />
            <div className="ml-64 transition-all duration-300">
                {children}
            </div>
        </div>
    )
}
