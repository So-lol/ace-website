'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar, Footer } from '@/components/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Cat, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { verifyAndSyncUser } from '@/lib/actions/auth'
import { useAuth } from '@/lib/auth-context'
import { auth } from '@/lib/firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { toast } from 'sonner'

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { user, skipNextSync } = useAuth()
    const [isLoading, setIsLoading] = useState(false)
    const redirectPath = searchParams.get('redirect')
    const message = searchParams.get('message')
    const error = searchParams.get('error')

    // Security: Validate redirect path to prevent Open Redirect vulnerabilities
    const safeRedirect = (path: string | null) => {
        if (!path) return '/dashboard'
        // Ensure path is relative and doesn't start with // (protocol relative)
        if (path.startsWith('/') && !path.startsWith('//')) {
            return path
        }
        return '/dashboard'
    }

    // Redirect if already logged in
    useEffect(() => {
        if (user && !isLoading) {
            const target = safeRedirect(redirectPath)
            router.push(target)
        }
    }, [user, isLoading, redirectPath, router])

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsLoading(true)

        const formData = new FormData(e.currentTarget)
        const email = (formData.get('email') as string).trim()
        const password = formData.get('password') as string

        if (!email || !password) {
            toast.error('Email and password are required')
            setIsLoading(false)
            return
        }

        try {
            // Tell AuthContext to skip the next onIdTokenChanged sync
            // so it doesn't race with our verifyAndSyncUser call below
            skipNextSync()

            // Sign in with Firebase client SDK
            const userCredential = await signInWithEmailAndPassword(auth, email.toLowerCase(), password)
            const user = userCredential.user

            // Check if email is verified
            if (!user.emailVerified) {
                toast.error('Please verify your email address first.')
                setIsLoading(false)
                router.push('/verify-email')
                return
            }

            const idToken = await user.getIdToken()

            // Sync with our database and set session cookie
            const result = await verifyAndSyncUser(idToken)

            if (result.success) {
                toast.success('Signed in successfully!')

                const targetPath = safeRedirect(redirectPath || result.redirectTo || null)

                // Use window.location for reliable redirect after login
                // This forces a full page load, ensuring middleware re-evaluates the cookie
                window.location.href = targetPath
                return // Exit early - don't run any more code
            } else {
                toast.error(result.error || 'Failed to sign in')
                setIsLoading(false)
            }
        } catch (err: any) {
            const errorCode = err.code || ''

            if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
                toast.error('Invalid email or password')
            } else if (errorCode === 'auth/too-many-requests') {
                toast.error('Too many failed attempts. Please try again later.')
            } else if (errorCode === 'auth/user-disabled') {
                toast.error('This account has been disabled.')
            } else {
                console.error('Unexpected sign in error:', err)
                toast.error(`Sign in error: ${err.message || 'An unexpected error occurred'}`)
            }
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />

            <main className="flex-1 flex items-center justify-center py-12 px-4">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center gap-2 group mb-4">
                            <div className="relative">
                                <div className="w-14 h-14 rounded-full doraemon-gradient flex items-center justify-center doraemon-shadow group-hover:doraemon-glow transition-all duration-300">
                                    <Cat className="w-8 h-8 text-white" />
                                </div>
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#FFD700] border-2 border-[#E60012]" />
                            </div>
                        </Link>
                        <h1 className="text-2xl font-bold">Welcome Back</h1>
                        <p className="text-muted-foreground">Sign in to your ACE account</p>
                    </div>

                    {/* Success Messages */}
                    {message === 'check-email' && (
                        <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg flex gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-green-800 dark:text-green-200">
                                <p className="font-medium">Check your email!</p>
                                <p>We&apos;ve sent you a confirmation link to verify your account.</p>
                            </div>
                        </div>
                    )}

                    {message === 'account-created' && (
                        <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg flex gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-green-800 dark:text-green-200">
                                <p className="font-medium">Account created!</p>
                                <p>You can now sign in with your email and password.</p>
                            </div>
                        </div>
                    )}

                    {message === 'reset-email-sent' && (
                        <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg flex gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-green-800 dark:text-green-200">
                                <p className="font-medium">Password reset email sent!</p>
                                <p>Check your inbox for a link to reset your password.</p>
                            </div>
                        </div>
                    )}

                    {message === 'email-verified' && (
                        <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg flex gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-green-800 dark:text-green-200">
                                <p className="font-medium">Email Verified!</p>
                                <p>Your email has been verified. You can now sign in.</p>
                            </div>
                        </div>
                    )}

                    {message === 'password-reset-success' && (
                        <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg flex gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-green-800 dark:text-green-200">
                                <p className="font-medium">Password Changed!</p>
                                <p>Your password has been updated successfully. Please sign in with your new password.</p>
                            </div>
                        </div>
                    )}

                    {/* Error Messages */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-red-800 dark:text-red-200">
                                <p className="font-medium">Authentication Error</p>
                                <p>There was a problem signing you in. Please try again.</p>
                            </div>
                        </div>
                    )}

                    <Card className="doraemon-shadow">
                        <CardHeader>
                            <CardTitle>Sign In</CardTitle>
                            <CardDescription>
                                Enter your email and password to access your account
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="your.email@umn.edu"
                                        className="h-11"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password">Password</Label>
                                        <Link
                                            href="/forgot-password"
                                            className="text-sm text-primary hover:underline"
                                        >
                                            Forgot password?
                                        </Link>
                                    </div>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="h-11"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-11 doraemon-gradient text-white hover:opacity-90"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Signing in...
                                        </>
                                    ) : (
                                        'Sign In'
                                    )}
                                </Button>
                            </form>

                            <p className="text-center text-sm text-muted-foreground mt-6">
                                Don&apos;t have an account?{' '}
                                <Link href="/signup" className="text-primary hover:underline font-medium">
                                    Sign up
                                </Link>
                            </p>
                        </CardContent>
                    </Card>

                    {/* Back to home */}
                    <div className="mt-6 text-center">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to home
                        </Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    )
}
