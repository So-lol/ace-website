
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
import { signUp } from '@/lib/actions/auth'
import { toast } from 'sonner'

export default function SignupPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setIsLoading(true)

        try {
            const result = await signUp(formData)

            if (result.success) {
                if (result.redirectTo?.includes('check-email')) {
                    toast.success('Account created! Check your email to confirm.')
                    router.push(result.redirectTo)
                } else {
                    toast.success('Account created successfully!')
                    router.push(result.redirectTo || '/dashboard')
                    router.refresh()
                }
            } else {
                toast.error(result.error || 'Failed to create account')
            }
        } catch (err) {
            toast.error('An unexpected error occurred')
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
                            <form action={handleSubmit} className="space-y-4">
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
