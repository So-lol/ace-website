import { type NextRequest, NextResponse } from 'next/server'
import { isAssetRoute, isPublicRoute } from '@/lib/auth-utils'

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    if (isPublicRoute(pathname) || isAssetRoute(pathname)) {
        return NextResponse.next()
    }

    // Proxy runs at the edge, so this is only a presence check.
    // Canonical session validation happens in server actions/handlers with firebase-admin.
    const sessionCookie = request.cookies.get('firebase-session')?.value

    if (!sessionCookie) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
