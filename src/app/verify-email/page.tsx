'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar, Footer } from '@/components/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Cat, ArrowLeft, Mail, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react'
import { auth } from '@/lib/firebase'
import { sendEmailVerification, onAuthStateChanged } from 'firebase/auth'
import { toast } from 'sonner'

export default function VerifyEmailPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [email, setEmail] = useState<string | null>(null)
    const [isVerified, setIsVerified] = useState(false)
    const [countdown, setCountdown] = useState(0)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setEmail(user.email)
                // Check if already verified
                await user.reload()
                if (user.emailVerified) {
                    setIsVerified(true)
                    toast.success('Email verified! Redirecting...')
                    setTimeout(() => {
                        router.push('/login?message=email-verified')
                    }, 2000)
                }
            } else {
                // No user, redirect to signup
                router.push('/signup')
            }
        })

        return () => unsubscribe()
    }, [router])

    // Countdown timer for resend button
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [countdown])

    // Poll for verification status every 3 seconds (faster detection)
    useEffect(() => {
        if (isVerified) return

        const interval = setInterval(async () => {
            const user = auth.currentUser
            if (user) {
                await user.reload()
                if (user.emailVerified) {
                    setIsVerified(true)
                    clearInterval(interval)
                    toast.success('Email verified! Redirecting...')
                    setTimeout(() => {
                        router.push('/login?message=email-verified')
                    }, 2000)
                }
            }
        }, 3000) // Reduced from 5s to 3s for faster detection

        return () => clearInterval(interval)
    }, [isVerified, router])

    async function handleResendEmail() {
        const user = auth.currentUser
        if (!user) {
            toast.error('No user found. Please sign up again.')
            router.push('/signup')
            return
        }

        setIsLoading(true)
        try {
            // First try with actionCodeSettings (includes continue URL)
            await sendEmailVerification(user, {
                url: `${window.location.origin}/login?message=email-verified`,
                handleCodeInApp: false,
            })
            toast.success('Verification email sent! Check your inbox.')
            setCountdown(60) // 60 second cooldown
        } catch (error: any) {
            console.error('Error sending verification email:', error.code, error.message)

            if (error.code === 'auth/too-many-requests') {
                toast.error('Firebase is rate-limiting email sends. Please wait 5-10 minutes before trying again.')
                setCountdown(300) // 5 minute cooldown for rate limits
            } else if (error.code === 'auth/unauthorized-continue-uri') {
                // The continue URL domain is not authorized in Firebase Console
                // Try sending without actionCodeSettings as a fallback
                try {
                    await sendEmailVerification(user)
                    toast.success('Verification email sent! Check your inbox.')
                    setCountdown(60)
                } catch (fallbackError: any) {
                    console.error('Fallback email send also failed:', fallbackError.code, fallbackError.message)
                    toast.error(`Email send failed: ${fallbackError.code || fallbackError.message}`)
                }
            } else {
                // Show the actual error code so we can diagnose
                toast.error(`Email send failed (${error.code}): ${error.message}`)
            }
        } finally {
            setIsLoading(false)
        }
    }

    if (isVerified) {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-1 flex items-center justify-center py-12 px-4">
                    <Card className="max-w-md w-full text-center doraemon-shadow">
                        <CardContent className="pt-8 pb-8">
                            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                            <h2 className="text-xl font-bold mb-2">Email Verified!</h2>
                            <p className="text-muted-foreground mb-4">
                                Your email has been verified successfully. Redirecting to login...
                            </p>
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                        </CardContent>
                    </Card>
                </main>
                <Footer />
            </div>
        )
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
                    </div>

                    <Card className="doraemon-shadow">
                        <CardHeader className="text-center">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
                                <Mail className="w-8 h-8 text-primary" />
                            </div>
                            <CardTitle>Verify Your Email</CardTitle>
                            <CardDescription>
                                We&apos;ve sent a verification link to your email
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {email && (
                                <div className="text-center p-4 bg-muted rounded-lg">
                                    <p className="text-sm text-muted-foreground mb-1">Verification email sent to:</p>
                                    <p className="font-medium">{email}</p>
                                </div>
                            )}

                            <div className="space-y-3">
                                <div className="text-center py-3">
                                    <p className="text-sm font-medium text-primary mb-2 animate-pulse">
                                        ⏳ Waiting for verification...
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Checking every 3 seconds
                                    </p>
                                </div>

                                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <p className="text-sm font-medium mb-2">📧 Helpful Tips:</p>
                                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                                        <li>Check your spam or junk folder</li>
                                        <li>Add noreply@ace-website.com to your contacts</li>
                                        <li>The link expires after 24 hours</li>
                                        <li>Keep this page open to auto-detect verification</li>
                                    </ul>
                                </div>

                                <Button
                                    onClick={handleResendEmail}
                                    variant="outline"
                                    className="w-full gap-2"
                                    disabled={isLoading || countdown > 0}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : countdown > 0 ? (
                                        <>
                                            <RefreshCw className="w-4 h-4" />
                                            Resend in {countdown}s
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-4 h-4" />
                                            Resend Verification Email
                                        </>
                                    )}
                                </Button>
                            </div>

                            <div className="text-center pt-4 border-t">
                                <p className="text-sm text-muted-foreground mb-3">
                                    Already verified?
                                </p>
                                <Link href="/login">
                                    <Button variant="default" className="doraemon-gradient text-white">
                                        Go to Login
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="text-center mt-6">
                        <Link href="/signup" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                            <ArrowLeft className="w-4 h-4" />
                            Back to sign up
                        </Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
