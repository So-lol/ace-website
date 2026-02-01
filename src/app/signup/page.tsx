
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar, Footer } from '@/components/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Cat, ArrowLeft, Loader2 } from 'lucide-react'
import { auth } from '@/lib/firebase'
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth'
import { toast } from 'sonner'

export default function SignupPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsLoading(true)

        const formData = new FormData(e.currentTarget)
        const name = formData.get('name') as string
        const email = formData.get('email') as string
        const password = formData.get('password') as string
        const confirmPassword = formData.get('confirmPassword') as string

        if (!name || !email || !password) {
            toast.error('All fields are required')
            setIsLoading(false)
            return
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match')
            setIsLoading(false)
            return
        }

        if (password.length < 8) {
            toast.error('Password must be at least 8 characters')
            setIsLoading(false)
            return
        }

        try {
            // Create user with Firebase client SDK
            const userCredential = await createUserWithEmailAndPassword(auth, email.toLowerCase(), password)
            const user = userCredential.user

            // Update display name
            await updateProfile(user, { displayName: name })

            // Send verification email
            await sendEmailVerification(user, {
                url: `${window.location.origin}/login?message=email-verified`,
            })

            toast.success('Account created! Please verify your email.')
            router.push('/verify-email')
        } catch (error: any) {
            console.error('Signup error:', error)
            if (error.code === 'auth/email-already-in-use') {
                toast.error('This email is already registered. Please sign in.')
            } else if (error.code === 'auth/invalid-email') {
                toast.error('Please enter a valid email address.')
            } else if (error.code === 'auth/weak-password') {
                toast.error('Password is too weak. Please use a stronger password.')
            } else {
                toast.error('Failed to create account. Please try again.')
            }
        } finally {
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
                        <h1 className="text-2xl font-bold">Join ACE</h1>
                        <p className="text-muted-foreground">Create your account to get started</p>
                    </div>

                    <Card className="doraemon-shadow">
                        <CardHeader>
                            <CardTitle>Create Account</CardTitle>
                            <CardDescription>
                                Enter your information to create your ACE account
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        type="text"
                                        placeholder="Your full name"
                                        className="h-11"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>

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
                                    <p className="text-xs text-muted-foreground">
                                        Use your UMN email if possible
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
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
                                    <p className="text-xs text-muted-foreground">
                                        At least 8 characters
                                    </p>
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
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Creating account...
                                        </>
                                    ) : (
                                        'Create Account'
                                    )}
                                </Button>
                            </form>

                            <p className="text-center text-sm text-muted-foreground mt-6">
                                Already have an account?{' '}
                                <Link href="/login" className="text-primary font-medium hover:underline">
                                    Sign in
                                </Link>
                            </p>
                        </CardContent>
                    </Card>

                    <div className="text-center mt-6">
                        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
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
