import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { NavbarWithAuthClient, Footer } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, ArrowLeft, Lock } from 'lucide-react'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import {
    getCurrentAceApplicationStatus,
    getAceApplicationSettings,
} from '@/lib/actions/ace-applications'
import { areAceApplicationsOpen } from '@/lib/ace-application-settings'
import { ApplyFormPage } from './apply-form-page'

export const metadata: Metadata = {
    title: 'Apply',
    description: 'Apply to the ACE program',
}

const ROLE_LABELS: Record<string, string> = {
    FAMILY_HEAD: 'Family Head',
    ANH: 'Anh',
    CHI: 'Chi',
    CHANH: 'Chanh',
    EM: 'Em',
}

export default async function ApplyPage() {
    const user = await getAuthenticatedUser()

    if (!user) {
        redirect('/login?redirect=/apply')
    }

    const [applicationStatus, settings] = await Promise.all([
        getCurrentAceApplicationStatus(),
        getAceApplicationSettings(),
    ])

    if (applicationStatus.hasApplied && applicationStatus.application) {
        const submittedAt = new Date(applicationStatus.application.createdAtIso)

        return (
            <div className="min-h-screen flex flex-col">
                <NavbarWithAuthClient />

                <main className="flex-1 py-12">
                    <div className="container mx-auto px-4 max-w-2xl">
                        <div className="mb-6">
                            <Link href="/dashboard">
                                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Dashboard
                                </Button>
                            </Link>
                        </div>

                        <Card className="doraemon-shadow">
                            <CardContent className="p-8 text-center">
                                <div className="w-20 h-20 rounded-full doraemon-gradient flex items-center justify-center mx-auto mb-6 animate-bounce-slow">
                                    <CheckCircle2 className="w-10 h-10 text-white" />
                                </div>
                                <h1 className="text-3xl font-bold mb-3">You&apos;ve already applied</h1>
                                <p className="text-muted-foreground mb-6">
                                    Your ACE application is already on file, so you don&apos;t need to submit another one.
                                </p>
                                <div className="flex flex-col items-center gap-3 mb-8">
                                    <Badge variant="secondary" className="text-sm px-3 py-1">
                                        Role: {ROLE_LABELS[applicationStatus.application.role] ?? applicationStatus.application.role}
                                    </Badge>
                                    <p className="text-sm text-muted-foreground">
                                        Submitted on {submittedAt.toLocaleString()}
                                    </p>
                                    {settings.revealAt && (
                                        <p className="text-sm text-muted-foreground">
                                            Reveal details: {settings.revealAt.toLocaleString()}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-4 justify-center">
                                    <Link href="/dashboard">
                                        <Button className="doraemon-gradient text-white">Go to Dashboard</Button>
                                    </Link>
                                    <Link href="/">
                                        <Button variant="outline">Back to Home</Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </main>

                <Footer />
            </div>
        )
    }

    if (!areAceApplicationsOpen(settings)) {
        return (
            <div className="min-h-screen flex flex-col">
                <NavbarWithAuthClient />

                <main className="flex-1 py-12">
                    <div className="container mx-auto px-4 max-w-2xl">
                        <div className="mb-6">
                            <Link href="/dashboard">
                                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Dashboard
                                </Button>
                            </Link>
                        </div>

                        <Card className="doraemon-shadow">
                            <CardContent className="p-8 text-center">
                                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                                    <Lock className="w-10 h-10 text-muted-foreground" />
                                </div>
                                <h1 className="text-3xl font-bold mb-3">Applications are closed</h1>
                                <p className="text-muted-foreground mb-4">
                                    ACE applications are not accepting new submissions right now.
                                </p>
                                {settings.deadlineAt && (
                                    <p className="text-sm text-muted-foreground mb-8">
                                        Latest deadline: {settings.deadlineAt.toLocaleString()}
                                    </p>
                                )}
                                <div className="flex gap-4 justify-center">
                                    <Link href="/dashboard">
                                        <Button className="doraemon-gradient text-white">Go to Dashboard</Button>
                                    </Link>
                                    <Link href="/">
                                        <Button variant="outline">Back to Home</Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </main>

                <Footer />
            </div>
        )
    }

    return (
        <ApplyFormPage
            userId={user.id}
            deadlineAtIso={settings.deadlineAt?.toISOString() ?? null}
            revealAtIso={settings.revealAt?.toISOString() ?? null}
        />
    )
}
