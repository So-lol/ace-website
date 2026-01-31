import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { NavbarWithAuthClient, Footer } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    ArrowLeft,
    FileText,
    Clock,
    CheckCircle2,
    XCircle,
    Eye,
    Calendar,
    Trophy
} from 'lucide-react'

export const metadata: Metadata = {
    title: 'My Submissions',
    description: 'View your submission history',
}

// Mock data
const submissions = [
    {
        id: '1',
        weekNumber: 4,
        year: 2026,
        status: 'APPROVED',
        basePoints: 10,
        bonusPoints: 5,
        totalPoints: 15,
        imageUrl: '/placeholder-photo.jpg',
        bonuses: ['Study Session Together'],
        submittedAt: '2026-01-22T14:30:00',
        reviewedAt: '2026-01-23T10:15:00',
        reviewReason: null
    },
    {
        id: '2',
        weekNumber: 3,
        year: 2026,
        status: 'APPROVED',
        basePoints: 10,
        bonusPoints: 0,
        totalPoints: 10,
        imageUrl: '/placeholder-photo.jpg',
        bonuses: [],
        submittedAt: '2026-01-15T18:45:00',
        reviewedAt: '2026-01-16T09:00:00',
        reviewReason: null
    },
    {
        id: '3',
        weekNumber: 2,
        year: 2026,
        status: 'APPROVED',
        basePoints: 10,
        bonusPoints: 5,
        totalPoints: 15,
        imageUrl: '/placeholder-photo.jpg',
        bonuses: ['Coffee Date'],
        submittedAt: '2026-01-08T16:20:00',
        reviewedAt: '2026-01-09T11:30:00',
        reviewReason: null
    },
    {
        id: '4',
        weekNumber: 1,
        year: 2026,
        status: 'REJECTED',
        basePoints: 0,
        bonusPoints: 0,
        totalPoints: 0,
        imageUrl: '/placeholder-photo.jpg',
        bonuses: [],
        submittedAt: '2026-01-02T20:00:00',
        reviewedAt: '2026-01-03T14:00:00',
        reviewReason: 'Photo does not clearly show both members of the pairing. Please ensure all pairing members are visible in future submissions.'
    },
]

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

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    })
}

export default function SubmissionsPage() {
    const totalPoints = submissions.reduce((sum, s) => sum + s.totalPoints, 0)
    const approvedCount = submissions.filter(s => s.status === 'APPROVED').length

    return (
        <div className="min-h-screen flex flex-col">
            <NavbarWithAuthClient />

            <main className="flex-1 py-8">
                <div className="container mx-auto px-4 max-w-4xl">
                    {/* Back Link */}
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>

                    {/* Header */}
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

                    {/* Submissions List */}
                    <div className="space-y-4">
                        {submissions.map((submission) => (
                            <Card key={submission.id} className="overflow-hidden">
                                <div className="flex flex-col sm:flex-row">
                                    {/* Image Thumbnail */}
                                    <div className="sm:w-48 h-32 sm:h-auto bg-muted flex items-center justify-center shrink-0">
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                            <FileText className="w-8 h-8" />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 p-4">
                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                                            <div>
                                                <h3 className="font-semibold text-lg">Week {submission.weekNumber}</h3>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Calendar className="w-4 h-4" />
                                                    Submitted {formatDate(submission.submittedAt)}
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

                                        {/* Bonuses */}
                                        {submission.bonuses.length > 0 && (
                                            <div className="mb-3">
                                                <span className="text-sm text-muted-foreground">Bonuses: </span>
                                                {submission.bonuses.map((bonus, i) => (
                                                    <Badge key={i} variant="outline" className="mr-1 text-xs">
                                                        {bonus}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}

                                        {/* Points Breakdown */}
                                        {submission.status === 'APPROVED' && (
                                            <div className="text-sm text-muted-foreground mb-3">
                                                Base: {submission.basePoints} pts
                                                {submission.bonusPoints > 0 && (
                                                    <span className="text-[#FFD700]"> + {submission.bonusPoints} bonus</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Rejection Reason */}
                                        {submission.status === 'REJECTED' && submission.reviewReason && (
                                            <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20 text-sm">
                                                <span className="font-medium text-destructive">Reason: </span>
                                                <span className="text-muted-foreground">{submission.reviewReason}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {submissions.length === 0 && (
                        <Card className="text-center py-12">
                            <CardContent>
                                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="font-semibold mb-2">No Submissions Yet</h3>
                                <p className="text-muted-foreground mb-4">
                                    You haven&apos;t submitted any photos yet.
                                </p>
                                <Link href="/dashboard/submit">
                                    <Button className="doraemon-gradient text-white">
                                        Submit Your First Photo
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    )
}
