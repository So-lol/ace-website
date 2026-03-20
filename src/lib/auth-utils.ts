export function normalizeEmail(email: string) {
    return email.trim().toLowerCase()
}

export function getPublicAppUrl() {
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
    if (!configuredUrl) {
        return null
    }

    try {
        const parsed = new URL(configuredUrl)
        return parsed.toString().replace(/\/$/, '')
    } catch {
        return null
    }
}

export function getAuthActionUrl(fallbackOrigin?: string | null) {
    const baseUrl = getPublicAppUrl() || fallbackOrigin?.trim() || null
    if (!baseUrl) {
        return null
    }

    try {
        return new URL('/auth/action', baseUrl).toString()
    } catch {
        return null
    }
}

export function getAuthActionCodeSettings(fallbackOrigin?: string | null) {
    const url = getAuthActionUrl(fallbackOrigin)
    if (!url) {
        return null
    }

    return {
        url,
        handleCodeInApp: false,
    }
}

export function sanitizeRedirectPath(path: string | null | undefined, fallback = '/dashboard') {
    if (!path) return fallback

    const trimmedPath = path.trim()
    if (!trimmedPath.startsWith('/') || trimmedPath.startsWith('//')) {
        return fallback
    }

    try {
        const parsed = new URL(trimmedPath, 'http://localhost')
        if (parsed.origin !== 'http://localhost') {
            return fallback
        }

        return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback
    } catch {
        return fallback
    }
}

const PUBLIC_ROUTES = new Set([
    '/',
    '/about',
    '/announcements',
    '/forgot-password',
    '/leaderboard',
    '/login',
    '/signup',
    '/verify-email',
])

export function isPublicRoute(pathname: string) {
    return PUBLIC_ROUTES.has(pathname) || pathname.startsWith('/auth/')
}

export function isAssetRoute(pathname: string) {
    return pathname.startsWith('/_next/') ||
        pathname.startsWith('/api/') ||
        pathname.includes('.') ||
        pathname === '/favicon.ico'
}
