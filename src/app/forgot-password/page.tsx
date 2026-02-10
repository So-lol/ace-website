'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar, Footer } from '@/components/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Cat, ArrowLeft, Loader2, Mail, Lock, CheckCircle2 } from 'lucide-react'
import { sendPasswordResetEmail, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const oobCode = searchParams.get('oobCode')

    const [isLoading, setIsLoading] = useState(false)
    const [isVerifying, setIsVerifying] = useState(!!oobCode)
    const [isValidCode, setIsValidCode] = useState(false)
    const [isResetComplete, setIsResetComplete] = useState(false)
    const [email, setEmail] = useState('')

    // Verify code on mount if it exists
    useEffect(() => {
        if (oobCode) {
            const verifyCode = async () => {
                try {
                    const userEmail = await verifyPasswordResetCode(auth, oobCode)
                    setEmail(userEmail)
                    setIsValidCode(true)
                } catch (err) {
                    console.error('Invalid reset code:', err)
                    toast.error('This password reset link is invalid or has expired.')
                } finally {
                    setIsVerifying(false)
                }
            }
            verifyCode()
        }
    }, [oobCode])

    // Handle "Request Reset" form
    async function handleRequestReset(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsLoading(true)
        const formData = new FormData(e.currentTarget)
        const email = formData.get('email') as string

        try {
            // We want to handle the reset in-app using our custom forgot-password page
            // The link in the email will go to /auth/action which redirects to /forgot-password?oobCode=...
            await sendPasswordResetEmail(auth, email, {
                url: `${window.location.origin}/auth/action`,
            })
            toast.success('Password reset email sent!')
            // Optional: stay on page with success message
            setIsResetComplete(true)
        } catch (err: any) {
            console.error(err)
            if (err.code === 'auth/user-not-found') {
                toast.error('No account found with this email.')
            } else {
                toast.error('Failed to send reset email. Please try again.')
            }
        } finally {
            setIsLoading(false)
        }
    }

    // Handle "Actual Reset" form
    async function handleConfirmReset(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!oobCode) return

        setIsLoading(true)
        const formData = new FormData(e.currentTarget)
        const password = formData.get('password') as string
        const confirmPassword = formData.get('confirmPassword') as string

        if (password !== confirmPassword) {
            toast.error('Passwords do not match')
            setIsLoading(false)
            return
        }

        try {
            await confirmPasswordReset(auth, oobCode, password)
            toast.success('Password changed successfully!')
            setIsResetComplete(true)
            setTimeout(() => {
                router.push('/login?message=password-reset-success')
            }, 3000)
        } catch (err: any) {
            console.error('Error resetting password:', err)
            if (err.code === 'auth/weak-password') {
                toast.error('Password is too weak.')
            } else {
                toast.error('Failed to reset password. The link may have expired.')
            }
        } finally {
            setIsLoading(false)
        }
    }

    // 1. Loading State (Verifying Code)
    if (isVerifying) {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-1 flex items-center justify-center py-12 px-4">
                    <div className="text-center space-y-4">
                        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                        <p className="text-muted-foreground">Verifying reset link...</p>
                    </div>
                </main>
                <Footer />
            </div>
        )
    }

    // 2. Success State
    if (isResetComplete) {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-1 flex items-center justify-center py-12 px-4">
                    <Card className="max-w-md w-full doraemon-shadow">
                        <CardContent className="pt-8 pb-8 text-center">
                            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
                            </div>
                            <h2 className="text-2xl font-bold mb-3">
                                {oobCode ? 'Password Changed!' : 'Email Sent!'}
                            </h2>
                            <p className="text-muted-foreground mb-6">
                                {oobCode
                                    ? 'Your password has been updated. Redirecting to login...'
                                    : 'Please check your inbox for the reset link.'}
                            </p>
                            <Link href="/login">
                                <Button className="doraemon-gradient text-white">Back to Login</Button>
                            </Link>
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
                        <h1 className="text-2xl font-bold">
                            {oobCode ? 'Create New Password' : 'Forgotten Password?'}
                        </h1>
                        <p className="text-muted-foreground">
                            {oobCode ? `Resetting password for ${email}` : "No worries, we'll send you reset instructions"}
                        </p>
                    </div>

                    <Card className="doraemon-shadow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {oobCode ? <Lock className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                                {oobCode ? 'New Password' : 'Reset Link'}
                            </CardTitle>
                            <CardDescription>
                                {oobCode
                                    ? 'Please enter your new password below.'
                                    : 'Enter your email address and we&apos;ll send you a link to reset your password.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {oobCode && isValidCode ? (
                                <form onSubmit={handleConfirmReset} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="password">New Password</Label>
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            placeholder="••••••••"
                                            className="h-11"
                                            required
                                            minLength={8}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                                        <Input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type="password"
                                            placeholder="••••••••"
                                            className="h-11"
                                            required
                                            minLength={8}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full h-11 doraemon-gradient text-white hover:opacity-90"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                                    </Button>
                                </form>
                            ) : (
                                <form onSubmit={handleRequestReset} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
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
                                    <Button
                                        type="submit"
                                        className="w-full h-11 doraemon-gradient text-white hover:opacity-90"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
                                    </Button>
                                </form>
                            )}

                            <p className="text-center text-sm text-muted-foreground mt-6">
                                Remember your password?{' '}
                                <Link href="/login" className="text-primary font-medium hover:underline">
                                    Sign in
                                </Link>
                            </p>
                        </CardContent>
                    </Card>

                    <div className="text-center mt-6">
                        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                            <ArrowLeft className="w-4 h-4" />
                            Back to login
                        </Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}

