'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar, Footer } from '@/components/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Cat, ArrowLeft, Loader2, Mail } from 'lucide-react'
import { resetPassword } from '@/lib/actions/auth'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setIsLoading(true)

        try {
            const result = await resetPassword(formData)

            if (result.success) {
                toast.success('Password reset email sent!')
                router.push(result.redirectTo || '/login?message=reset-email-sent')
            } else {
                toast.error(result.error || 'Failed to send reset email')
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
                        <h1 className="text-2xl font-bold">Reset Password</h1>
                        <p className="text-muted-foreground">We&apos;ll send you a reset link</p>
                    </div>

                    <Card className="doraemon-shadow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="w-5 h-5" />
                                Forgot Password
                            </CardTitle>
                            <CardDescription>
                                Enter your email address and we&apos;ll send you a link to reset your password.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form action={handleSubmit} className="space-y-4">
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

                                <Button
                                    type="submit"
                                    className="w-full h-11 doraemon-gradient text-white hover:opacity-90"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        'Send Reset Link'
                                    )}
                                </Button>
                            </form>

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
