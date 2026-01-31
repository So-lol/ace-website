import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export async function middleware(request: NextRequest) {
    const { supabaseResponse, user } = await updateSession(request)

    const { pathname } = request.nextUrl

    // Public routes - allow everyone
    const publicRoutes = ['/', '/leaderboard', '/announcements', '/about', '/login', '/signup', '/auth']
    const isPublicRoute = publicRoutes.some(route =>
        pathname === route || pathname.startsWith('/auth/')
    )

    if (isPublicRoute) {
        return supabaseResponse
    }

    // Protected routes - require authentication
    if (!user) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Admin routes - require admin role
    if (pathname.startsWith('/admin')) {
        try {
            const dbUser = await prisma.user.findUnique({
                where: { email: user.email! },
                select: { role: true }
            })

            if (!dbUser || dbUser.role !== UserRole.ADMIN) {
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }
        } catch (error) {
            console.error('Error checking admin role:', error)
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
