'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Users,
    UsersRound,
    Link2,
    FileUp,
    FileDown,
    Gift,
    Megaphone,
    FileImage,
    Calculator,
    FileText,
    Cat,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Image,
    ClipboardList
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

const adminNavItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Families', href: '/admin/families', icon: UsersRound },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Pairings', href: '/admin/pairings', icon: Link2 },
    { name: 'Applications', href: '/admin/applications', icon: ClipboardList },
    { divider: true },
    { name: 'Import Data', href: '/admin/import', icon: FileUp },
    { name: 'Export Data', href: '/admin/export', icon: FileDown },
    { divider: true },
    { name: 'Bonus Activities', href: '/admin/bonuses', icon: Gift },
    { name: 'Announcements', href: '/admin/announcements', icon: Megaphone },
    { divider: true },
    { name: 'Submissions', href: '/admin/submissions', icon: FileImage },
    { name: 'Media', href: '/admin/media', icon: Image },
    { name: 'Points', href: '/admin/points', icon: Calculator },
    { name: 'Audit Log', href: '/admin/audit', icon: FileText },
]

export function AdminSidebar() {
    const pathname = usePathname()
    const [collapsed, setCollapsed] = useState(false)

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
                collapsed ? "w-16" : "w-64"
            )}
        >
            <div className="flex flex-col h-full">
                {/* Logo */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
                    {!collapsed && (
                        <Link href="/admin" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full doraemon-gradient flex items-center justify-center">
                                <Cat className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-bold text-sidebar-foreground">ACE Admin</span>
                        </Link>
                    )}
                    {collapsed && (
                        <Link href="/admin" className="w-full flex justify-center">
                            <div className="w-8 h-8 rounded-full doraemon-gradient flex items-center justify-center">
                                <Cat className="w-5 h-5 text-white" />
                            </div>
                        </Link>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3">
                    <ul className="space-y-1">
                        {adminNavItems.map((item, index) => {
                            if ('divider' in item) {
                                return <li key={`divider-${index}`} className="my-3 border-t border-sidebar-border" />
                            }

                            const Icon = item.icon
                            const isActive = pathname === item.href

                            return (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                            isActive
                                                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                                        )}
                                        title={collapsed ? item.name : undefined}
                                    >
                                        <Icon className="w-5 h-5 shrink-0" />
                                        {!collapsed && <span>{item.name}</span>}
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                </nav>

                {/* Footer */}
                <div className="border-t border-sidebar-border p-3 space-y-2">
                    <Link
                        href="/"
                        className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                            "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        )}
                        title={collapsed ? "Back to Site" : undefined}
                    >
                        <LogOut className="w-5 h-5 shrink-0" />
                        {!collapsed && <span>Back to Site</span>}
                    </Link>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground"
                        onClick={() => setCollapsed(!collapsed)}
                    >
                        {collapsed ? (
                            <ChevronRight className="w-4 h-4" />
                        ) : (
                            <>
                                <ChevronLeft className="w-4 h-4 mr-2" />
                                Collapse
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </aside>
    )
}

export function AdminHeader({ title }: { title: string }) {
    return (
        <header className="h-16 border-b bg-background flex items-center px-6">
            <h1 className="text-xl font-semibold">{title}</h1>
        </header>
    )
}
