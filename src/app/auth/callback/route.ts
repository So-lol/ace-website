import { NextResponse } from 'next/server'

/**
 * Firebase auth callback route
 * 
 * Note: Firebase email/password authentication doesn't use OAuth redirect callbacks
 * like Supabase does. This route is kept for any future OAuth providers (Google, etc.)
 * or for handling email verification links.
 */
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const next = searchParams.get('next') ?? '/dashboard'
    const mode = searchParams.get('mode')
    const oobCode = searchParams.get('oobCode')

    // Handle email verification
    if (mode === 'verifyEmail' && oobCode) {
        // Email verification is handled client-side with Firebase SDK
        return NextResponse.redirect(`${origin}/login?message=email-verified`)
    }

    // Handle password reset
    if (mode === 'resetPassword' && oobCode) {
        // Redirect to password reset page with the code
        return NextResponse.redirect(`${origin}/auth/reset-password?oobCode=${oobCode}`)
    }

    // Default: redirect to the intended destination
    return NextResponse.redirect(`${origin}${next}`)
}
