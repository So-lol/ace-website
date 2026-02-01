'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
    Menu,
    Trophy,
    Megaphone,
    Info,
    LogIn,
    LogOut,
    LayoutDashboard,
    Cat,
    User,
    Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/actions/auth'

const navigation = [
    { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
    { name: 'Announcements', href: '/announcements', icon: Megaphone },
    { name: 'About ACE', href: '/about', icon: Info },
]

interface NavbarProps {
    user?: {
        name: string
        email: string
        role: string
    } | null
}

import { auth } from '@/lib/firebase'
import { signOut as firebaseSignOut } from 'firebase/auth'



export function Navbar({ user }: NavbarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const handleSignOut = async () => {
        try {
            // 1. Sign out from Firebase Client SDK
            await firebaseSignOut(auth)

            // 2. Sign out from Server Session
            const result = await signOut()

            if (result.success && result.redirectTo) {
                router.push(result.redirectTo)
                router.refresh()
            }
        } catch (error) {
            console.error('Error signing out:', error)
            // Fallback
            router.push('/login')
        }
    }

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <nav className="container mx-auto flex h-16 items-center justify-between px-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full doraemon-gradient flex items-center justify-center doraemon-shadow group-hover:doraemon-glow transition-all duration-300">
                            <Cat className="w-6 h-6 text-white" />
                        </div>
                        {/* Doraemon bell decoration */}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#FFD700] border-2 border-[#E60012]" />
                    </div>
                    <div className="hidden sm:block">
                        <span className="font-bold text-xl bg-gradient-to-r from-[#0099D6] to-[#0077B3] bg-clip-text text-transparent">
                            VSAM ACE
                        </span>
                        <p className="text-[10px] text-muted-foreground -mt-1">
                            Anh Chi Em Program
                        </p>
                    </div>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-1">
                    {navigation.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        return (
                            <Link key={item.name} href={item.href}>
                                <Button
                                    variant={isActive ? "secondary" : "ghost"}
                                    size="sm"
                                    className={cn(
                                        "gap-2 transition-all duration-200",
                                        isActive && "bg-primary/10 text-primary"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.name}
                                </Button>
                            </Link>
                        )
                    })}
                </div>

                {/* Auth Buttons */}
                <div className="hidden md:flex items-center gap-2">
                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="gap-2">
                                    <Avatar className="w-8 h-8">
                                        <AvatarFallback className="doraemon-gradient text-white text-xs">
                                            {getInitials(user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="hidden lg:inline">{user.name.split(' ')[0]}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <div className="px-2 py-1.5">
                                    <p className="font-medium">{user.name}</p>
                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard" className="cursor-pointer">
                                        <LayoutDashboard className="w-4 h-4 mr-2" />
                                        Dashboard
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/profile" className="cursor-pointer">
                                        <User className="w-4 h-4 mr-2" />
                                        Profile
                                    </Link>
                                </DropdownMenuItem>
                                {user.role === 'ADMIN' && (
                                    <DropdownMenuItem asChild>
                                        <Link href="/admin" className="cursor-pointer">
                                            <Settings className="w-4 h-4 mr-2" />
                                            Admin Panel
                                        </Link>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={handleSignOut}
                                    className="cursor-pointer text-red-600 focus:text-red-600"
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Sign Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Link href="/login">
                            <Button className="gap-2 doraemon-gradient text-white hover:opacity-90">
                                <LogIn className="w-4 h-4" />
                                Sign In
                            </Button>
                        </Link>
                    )}
                </div>

                {/* Mobile Menu */}
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <SheetTrigger asChild className="md:hidden">
                        <Button variant="ghost" size="icon">
                            <Menu className="w-5 h-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[280px]">
                        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                        <SheetDescription className="sr-only">Main navigation links and user options</SheetDescription>
                        <div className="flex flex-col gap-4 mt-8">
                            {/* User info in mobile */}
                            {user && (
                                <div className="pb-4 border-b">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-10 h-10">
                                            <AvatarFallback className="doraemon-gradient text-white">
                                                {getInitials(user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{user.name}</p>
                                            <p className="text-xs text-muted-foreground">{user.email}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {navigation.map((item) => {
                                const Icon = item.icon
                                const isActive = pathname === item.href
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <Button
                                            variant={isActive ? "secondary" : "ghost"}
                                            className={cn(
                                                "w-full justify-start gap-3",
                                                isActive && "bg-primary/10 text-primary"
                                            )}
                                        >
                                            <Icon className="w-5 h-5" />
                                            {item.name}
                                        </Button>
                                    </Link>
                                )
                            })}

                            <div className="border-t pt-4 mt-2 space-y-2">
                                {user ? (
                                    <>
                                        <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                                            <Button variant="ghost" className="w-full justify-start gap-3">
                                                <LayoutDashboard className="w-5 h-5" />
                                                Dashboard
                                            </Button>
                                        </Link>
                                        {user.role === 'ADMIN' && (
                                            <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                                                <Button variant="ghost" className="w-full justify-start gap-3">
                                                    <Settings className="w-5 h-5" />
                                                    Admin Panel
                                                </Button>
                                            </Link>
                                        )}
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-start gap-3 text-red-600"
                                            onClick={() => {
                                                setMobileMenuOpen(false)
                                                handleSignOut()
                                            }}
                                        >
                                            <LogOut className="w-5 h-5" />
                                            Sign Out
                                        </Button>
                                    </>
                                ) : (
                                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                                        <Button className="w-full gap-2 doraemon-gradient text-white">
                                            <LogIn className="w-5 h-5" />
                                            Sign In
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </nav>
        </header>
    )
}
