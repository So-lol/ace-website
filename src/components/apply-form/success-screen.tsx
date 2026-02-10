import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { NavbarWithAuthClient, Footer } from '@/components/layout'
import { CheckCircle2, ArrowLeft } from 'lucide-react'

export function SuccessScreen() {
    return (
        <div className="min-h-screen flex flex-col">
            <NavbarWithAuthClient />
            <main className="flex-1 flex items-center justify-center py-12 px-4">
                <div className="max-w-lg text-center">
                    <div className="w-20 h-20 rounded-full doraemon-gradient flex items-center justify-center mx-auto mb-6 animate-bounce-slow">
                        <CheckCircle2 className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold mb-4">Application Submitted! 🎉</h1>
                    <p className="text-muted-foreground mb-2">
                        Thank you for applying to VSAM&apos;s A.C.E. Program!
                    </p>
                    <p className="text-muted-foreground mb-8">
                        We&apos;ll be reviewing applications and you&apos;ll learn about your pairing at the reveal event
                        on <strong>Friday, October 24th from 6-8 PM</strong> in Bruininks 114.
                        Keep an eye on our Instagram for more details!
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Link href="/">
                            <Button variant="outline" className="gap-2">
                                <ArrowLeft className="w-4 h-4" />
                                Back to Home
                            </Button>
                        </Link>
                        <a href="https://instagram.com/vsam.ace/" target="_blank" rel="noopener noreferrer">
                            <Button className="gap-2 doraemon-gradient text-white hover:opacity-90">
                                Follow on Instagram
                            </Button>
                        </a>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}
