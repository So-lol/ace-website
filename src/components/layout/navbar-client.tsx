'use client'

import { useAuth } from '@/lib/auth-context'
import { Navbar } from './navbar'
import { Skeleton } from '@/components/ui/skeleton'

export function NavbarWithAuthClient() {
    const { user, isLoading } = useAuth()

    // During loading, show a simplified navbar
    if (isLoading) {
        return (
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <nav className="container mx-auto flex h-16 items-center justify-between px-4">
                    <Skeleton className="h-10 w-32" />
                    <div className="flex gap-2">
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-24" />
                    </div>
                </nav>
            </header>
        )
    }

    return <Navbar user={user} />
}
