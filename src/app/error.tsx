'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { NavbarWithAuthClient, Footer } from '@/components/layout'
import { AlertCircle, RotateCcw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Unhandled Application Error:', error)
    }, [error])

    return (
        <div className="min-h-screen flex flex-col">
            <NavbarWithAuthClient />
            <main className="flex-1 flex items-center justify-center py-12 px-4">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                        <AlertCircle className="w-10 h-10 text-destructive" />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold">Something went wrong</h1>
                        <p className="text-muted-foreground">
                            We encountered an unexpected error. Don&apos;t worry, your data is safe.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                            onClick={() => reset()}
                            variant="default"
                            className="gap-2 doraemon-gradient text-white"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Try Again
                        </Button>
                        <Link href="/">
                            <Button variant="outline" className="gap-2 w-full">
                                <Home className="w-4 h-4" />
                                Back to Home
                            </Button>
                        </Link>
                    </div>

                    {process.env.NODE_ENV === 'development' && (
                        <div className="p-4 bg-muted rounded-lg text-left overflow-auto max-h-40">
                            <p className="text-xs font-mono text-muted-foreground">
                                {error.message}
                            </p>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    )
}
