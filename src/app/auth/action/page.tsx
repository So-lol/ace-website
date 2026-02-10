'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar, Footer } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Cat, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { auth } from '@/lib/firebase'
import { applyActionCode, checkActionCode } from 'firebase/auth'
import { toast } from 'sonner'

type ActionMode = 'verifyEmail' | 'resetPassword' | 'recoverEmail' | null
type ActionState = 'loading' | 'success' | 'error' | 'invalid'

export default function AuthActionPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [state, setState] = useState<ActionState>('loading')
    const [mode, setMode] = useState<ActionMode>(null)
    const [errorMessage, setErrorMessage] = useState<string>('')
    const actionStarted = useRef(false)

    useEffect(() => {
        // Prevent double execution in React StrictMode
        if (actionStarted.current) return
        actionStarted.current = true

        const handleAction = async () => {
            const actionMode = searchParams.get('mode') as ActionMode
            const oobCode = searchParams.get('oobCode')

            if (!oobCode || !actionMode) {
                setState('invalid')
                setErrorMessage('Invalid or missing verification code.')
                return
            }

            setMode(actionMode)

            try {
                // Verify the action code is valid first
                await checkActionCode(auth, oobCode)

                // Apply the action based on mode
                switch (actionMode) {
                    case 'verifyEmail':
                        await applyActionCode(auth, oobCode)
                        setState('success')
                        toast.success('Email verified successfully!')

                        // Redirect to login after 3 seconds
                        setTimeout(() => {
                            router.push('/login?message=email-verified')
                        }, 3000)
                        break

                    case 'resetPassword':
                        // Redirect to password reset page with the code
                        router.push(`/forgot-password?oobCode=${oobCode}`)
                        break

                    case 'recoverEmail':
                        await applyActionCode(auth, oobCode)
                        setState('success')
                        toast.success('Email recovered successfully!')
                        setTimeout(() => {
                            router.push('/login')
                        }, 3000)
                        break

                    default:
                        setState('invalid')
                        setErrorMessage('Unknown action type.')
                }
            } catch (error: any) {
                console.error('Error applying action code:', error)
                setState('error')

                // Provide specific error messages
                if (error.code === 'auth/expired-action-code') {
                    setErrorMessage('This verification link has expired. Please request a new one.')
                } else if (error.code === 'auth/invalid-action-code') {
                    setErrorMessage('This verification link is invalid or has already been used.')
                } else if (error.code === 'auth/user-disabled') {
                    setErrorMessage('This account has been disabled.')
                } else if (error.code === 'auth/user-not-found') {
                    setErrorMessage('No account found with this email.')
                } else {
                    setErrorMessage('An error occurred while verifying your email. Please try again.')
                }
            }
        }

        handleAction()
    }, [searchParams, router])

    const getTitle = () => {
        if (state === 'loading') return 'Verifying...'
        if (state === 'success') {
            if (mode === 'verifyEmail') return 'Email Verified!'
            if (mode === 'recoverEmail') return 'Email Recovered!'
            return 'Success!'
        }
        if (state === 'error') return 'Verification Failed'
        return 'Invalid Link'
    }

    const getDescription = () => {
        if (state === 'loading') return 'Please wait while we verify your email...'
        if (state === 'success') {
            if (mode === 'verifyEmail') return 'Your email has been verified successfully. Redirecting to login...'
            if (mode === 'recoverEmail') return 'Your email has been recovered. Redirecting to login...'
            return 'Action completed successfully.'
        }
        if (state === 'error') return errorMessage
        return 'This verification link is invalid or has expired.'
    }

    const getIcon = () => {
        if (state === 'loading') {
            return <Loader2 className="w-12 h-12 text-primary animate-spin" />
        }
        if (state === 'success') {
            return <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
        }
        if (state === 'error') {
            return <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
        }
        return <AlertCircle className="w-12 h-12 text-yellow-600 dark:text-yellow-400" />
    }

    const getBackgroundColor = () => {
        if (state === 'success') return 'bg-green-100 dark:bg-green-900'
        if (state === 'error') return 'bg-red-100 dark:bg-red-900'
        if (state === 'invalid') return 'bg-yellow-100 dark:bg-yellow-900'
        return 'bg-primary/10'
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
                        <CardContent className="pt-8 pb-8 text-center">
                            <div className={`w-20 h-20 rounded-full ${getBackgroundColor()} flex items-center justify-center mx-auto mb-6`}>
                                {getIcon()}
                            </div>

                            <h2 className="text-2xl font-bold mb-3">{getTitle()}</h2>
                            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                                {getDescription()}
                            </p>

                            {state === 'loading' && (
                                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-75" />
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-150" />
                                </div>
                            )}

                            {(state === 'error' || state === 'invalid') && (
                                <div className="space-y-3">
                                    <Link href="/verify-email">
                                        <Button variant="default" className="doraemon-gradient text-white">
                                            Resend Verification Email
                                        </Button>
                                    </Link>
                                    <div>
                                        <Link href="/signup">
                                            <Button variant="outline">
                                                Back to Sign Up
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {state === 'success' && mode === 'verifyEmail' && (
                                <div className="text-sm text-muted-foreground">
                                    Redirecting in 3 seconds...
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>

            <Footer />
        </div>
    )
}

