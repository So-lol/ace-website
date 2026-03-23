import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { NavbarWithAuthClient, Footer } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    ArrowLeft,
    FileText,
    Clock,
    CheckCircle2,
    XCircle,
    Calendar,
    Trophy
} from 'lucide-react'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { getUserSubmissions } from '@/lib/actions/submissions'

export const metadata: Metadata = {
    title: 'My Submissions',
    description: 'View your submission history',
}

function getStatusBadge(status: string) {
    switch (status) {
        case 'APPROVED':
            return (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Approved
                </Badge>
            )
        case 'REJECTED':
            return (
                <Badge variant="destructive" className="gap-1">
                    <XCircle className="w-3 h-3" />
                    Rejected
                </Badge>
            )
        case 'PENDING':
        default:
            return (
                <Badge variant="secondary" className="gap-1">
                    <Clock className="w-3 h-3" />
                    Pending Review
                </Badge>
            )
    }
}

function formatDate(date: Date) {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    })
}

export default async function SubmissionsPage() {
    const user = await getAuthenticatedUser()

    if (!user) {
        redirect('/login')
    }

    const submissions = await getUserSubmissions(user.id)
    const totalPoints = submissions.reduce((sum, submission) => sum + submission.totalPoints, 0)
    const approvedCount = submissions.filter(submission => submission.status === 'APPROVED').length

    return (
        <div className="min-h-screen flex flex-col">
            <NavbarWithAuthClient />

            <main className="flex-1 py-8">
                <div className="container mx-auto px-4 max-w-4xl">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-bold mb-1">My Submissions</h1>
                            <p className="text-muted-foreground">
                                View all your weekly photo submissions
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <Card className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-[#FFD700]" />
                                    <div>
                                        <div className="text-lg font-bold">{totalPoints}</div>
                                        <div className="text-xs text-muted-foreground">Total Points</div>
                                    </div>
                                </div>
                            </Card>
                            <Card className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    <div>
                                        <div className="text-lg font-bold">{approvedCount}</div>
                                        <div className="text-xs text-muted-foreground">Approved</div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {submissions.length === 0 ? (
                            <Card>
                                <CardContent className="py-10 text-center text-muted-foreground">
                                    No submissions yet.
                                </CardContent>
                            </Card>
                        ) : submissions.map((submission) => (
                            <Card key={submission.id} className="overflow-hidden">
                                <div className="flex flex-col sm:flex-row">
                                    <div className="sm:w-48 h-32 sm:h-auto bg-muted flex items-center justify-center shrink-0 relative">
                                        {submission.imageUrl ? (
                                            <Image
                                                src={submission.imageUrl}
                                                alt={`Week ${submission.weekNumber} submission`}
                                                fill
                                                unoptimized
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                <FileText className="w-8 h-8" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 p-4">
                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                                            <div>
                                                <h3 className="font-semibold text-lg">Week {submission.weekNumber}</h3>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Calendar className="w-4 h-4" />
                                                    Submitted {formatDate(submission.createdAt)}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getStatusBadge(submission.status)}
                                                {submission.status === 'APPROVED' && (
                                                    <span className="text-lg font-bold text-primary">
                                                        +{submission.totalPoints} pts
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {submission.bonuses.length > 0 && (
                                            <div className="mb-3">
                                                <span className="text-sm text-muted-foreground">Bonuses: </span>
                                                {submission.bonuses.map((bonus, index) => (
                                                    <Badge key={`${submission.id}-${index}`} variant="outline" className="mr-1 text-xs">
                                                        {bonus}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}

                                        {submission.status === 'APPROVED' && (
                                            <div className="text-sm text-muted-foreground mb-3">
                                                Bonus total: <span className="text-[#FFD700]">{submission.bonusPoints} pts</span>
                                            </div>
                                        )}

                                        {submission.status === 'REJECTED' && submission.reviewReason && (
                                            <div className="p-3 bg-destructive/10 rounded-lg">
                                                <p className="text-sm font-medium text-destructive mb-1">Rejection Reason</p>
                                                <p className="text-sm text-muted-foreground">{submission.reviewReason}</p>
                                            </div>
                                        )}

                                        {submission.reviewedAt && (
                                            <div className="text-xs text-muted-foreground mt-3">
                                                Reviewed {formatDate(submission.reviewedAt)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
