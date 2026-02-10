import { type NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    // 1. Define Public Routes
    const publicRoutes = ['/', '/login', '/signup', '/verify-email', '/about', '/leaderboard']
    const isPublicRoute = publicRoutes.some(route =>
        pathname === route || pathname.startsWith('/auth/')
    )

    // 2. Define Assets/Static Routes (Exclude from middleware)
    const isAsset = pathname.startsWith('/_next/') ||
        pathname.startsWith('/api/') || // API routes handle their own auth
        pathname.includes('.') || // Files like favicon.ico, images
        pathname === '/favicon.ico'

    if (isPublicRoute || isAsset) {
        return NextResponse.next()
    }

    // 3. Check for Firebase session cookie
    // Note: We only check for presence here because verifyIdToken (firebase-admin)
    // is not compatible with the Edge runtime used by Next.js middleware.
    const sessionCookie = request.cookies.get('firebase-session')?.value

    if (!sessionCookie) {
        // Redirect to login if trying to access a protected route without a session
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
}

// 4. Configure Matcher
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - images in public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
