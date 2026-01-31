import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Public routes - allow everyone
    const publicRoutes = ['/', '/leaderboard', '/announcements', '/about', '/login', '/signup', '/auth']
    const isPublicRoute = publicRoutes.some(route =>
        pathname === route || pathname.startsWith('/auth/')
    )

    if (isPublicRoute) {
        return NextResponse.next()
    }

    // Check for Firebase ID token in cookies or Authorization header
    const authHeader = request.headers.get('Authorization')
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    // For browser requests, check cookies for session
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('firebase-session')?.value

    const token = idToken || sessionCookie

    if (!token) {
        // For API routes, return 401
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        // For page routes, redirect to login
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Note: Full token verification happens in API routes using firebase-admin
    // Middleware just checks for token presence for performance

    // Admin routes require additional check in the page/API itself
    // since we can't use firebase-admin in Edge runtime

    return NextResponse.next()
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
