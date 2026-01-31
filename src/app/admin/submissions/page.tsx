import { Metadata } from 'next'
import { AdminHeader } from '@/components/admin'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Search,
    CheckCircle2,
    XCircle,
    Clock,
    Eye,
    FileImage,
    Filter
} from 'lucide-react'

export const metadata: Metadata = {
    title: 'Review Submissions',
    description: 'Review and approve photo submissions',
}

// Mock data
const submissions = [
    {
        id: '1',
        pairing: 'Linh Nguyen & Minh Tran, An Le',
        family: 'Pho Family',
        week: 5,
        status: 'PENDING',
        bonuses: ['Study Session'],
        submittedAt: '2026-01-30T14:30:00',
    },
    {
        id: '2',
        pairing: 'Hai Pham & Tuan Vo',
        family: 'Banh Mi Squad',
        week: 5,
        status: 'PENDING',
        bonuses: [],
        submittedAt: '2026-01-30T12:15:00',
    },
    {
        id: '3',
        pairing: 'Mai Hoang & Duc Bui, Hoa Dang',
        family: 'Spring Roll Crew',
        week: 5,
        status: 'PENDING',
        bonuses: ['Game Night'],
        submittedAt: '2026-01-30T10:00:00',
    },
    {
        id: '4',
        pairing: 'Khoa Do & Vy Lam',
        family: 'Pho Family',
        week: 5,
        status: 'APPROVED',
        bonuses: ['Study Session', 'Game Night'],
        submittedAt: '2026-01-29T18:45:00',
        reviewedAt: '2026-01-30T09:00:00',
        points: 20
    },
    {
        id: '5',
        pairing: 'Thao Le & Nam Trinh',
        family: 'Boba Gang',
        week: 5,
        status: 'REJECTED',
        bonuses: [],
        submittedAt: '2026-01-29T16:20:00',
        reviewedAt: '2026-01-30T08:30:00',
        reason: 'Photo is blurry and does not clearly show pairing members'
    },
]

function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    })
}

function SubmissionCard({ submission }: { submission: typeof submissions[0] }) {
    return (
        <Card className="overflow-hidden">
            <div className="flex">
                {/* Image Preview */}
                <div className="w-32 h-32 bg-muted shrink-0 flex items-center justify-center">
                    <FileImage className="w-8 h-8 text-muted-foreground" />
                </div>

                {/* Content */}
                <CardContent className="flex-1 p-4">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="font-semibold">{submission.pairing}</h3>
                            <p className="text-sm text-muted-foreground">
                                {submission.family} • Week {submission.week}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {submission.status === 'PENDING' && (
                                <Badge variant="secondary" className="gap-1">
                                    <Clock className="w-3 h-3" />
                                    Pending
                                </Badge>
                            )}
                            {submission.status === 'APPROVED' && (
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Approved
                                </Badge>
                            )}
                            {submission.status === 'REJECTED' && (
                                <Badge variant="destructive" className="gap-1">
                                    <XCircle className="w-3 h-3" />
                                    Rejected
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                        {submission.bonuses.map((bonus, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                                {bonus}
                            </Badge>
                        ))}
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                            Submitted {formatDateTime(submission.submittedAt)}
                        </span>

                        {submission.status === 'PENDING' && (
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="gap-1">
                                    <Eye className="w-4 h-4" />
                                    View
                                </Button>
                                <Button size="sm" variant="destructive" className="gap-1">
                                    <XCircle className="w-4 h-4" />
                                    Reject
                                </Button>
                                <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Approve
                                </Button>
                            </div>
                        )}

                        {submission.status === 'APPROVED' && 'points' in submission && (
                            <span className="font-semibold text-primary">+{submission.points} pts</span>
                        )}

                        {submission.status === 'REJECTED' && 'reason' in submission && (
                            <span className="text-xs text-destructive max-w-xs truncate">
                                {submission.reason}
                            </span>
                        )}
                    </div>
                </CardContent>
            </div>
        </Card>
    )
}

export default function SubmissionsPage() {
    const pendingCount = submissions.filter(s => s.status === 'PENDING').length
    const approvedCount = submissions.filter(s => s.status === 'APPROVED').length
    const rejectedCount = submissions.filter(s => s.status === 'REJECTED').length

    return (
        <>
            <AdminHeader title="Submissions" />

            <main className="p-6">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by pairing or family..."
                            className="pl-10"
                        />
                    </div>
                    <Button variant="outline" className="gap-2">
                        <Filter className="w-4 h-4" />
                        Filter by Week
                    </Button>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="pending" className="w-full">
                    <TabsList className="mb-6">
                        <TabsTrigger value="pending" className="gap-2">
                            <Clock className="w-4 h-4" />
                            Pending ({pendingCount})
                        </TabsTrigger>
                        <TabsTrigger value="approved" className="gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Approved ({approvedCount})
                        </TabsTrigger>
                        <TabsTrigger value="rejected" className="gap-2">
                            <XCircle className="w-4 h-4" />
                            Rejected ({rejectedCount})
                        </TabsTrigger>
                        <TabsTrigger value="all">All</TabsTrigger>
                    </TabsList>

                    <TabsContent value="pending" className="space-y-4">
                        {submissions.filter(s => s.status === 'PENDING').map(submission => (
                            <SubmissionCard key={submission.id} submission={submission} />
                        ))}
                        {pendingCount === 0 && (
                            <Card className="text-center py-12">
                                <CardContent>
                                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                                    <h3 className="font-semibold mb-2">All Caught Up!</h3>
                                    <p className="text-muted-foreground">
                                        No pending submissions to review.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="approved" className="space-y-4">
                        {submissions.filter(s => s.status === 'APPROVED').map(submission => (
                            <SubmissionCard key={submission.id} submission={submission} />
                        ))}
                    </TabsContent>

                    <TabsContent value="rejected" className="space-y-4">
                        {submissions.filter(s => s.status === 'REJECTED').map(submission => (
                            <SubmissionCard key={submission.id} submission={submission} />
                        ))}
                    </TabsContent>

                    <TabsContent value="all" className="space-y-4">
                        {submissions.map(submission => (
                            <SubmissionCard key={submission.id} submission={submission} />
                        ))}
                    </TabsContent>
                </Tabs>
            </main>
        </>
    )
}
