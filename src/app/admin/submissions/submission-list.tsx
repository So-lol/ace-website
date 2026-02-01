'use client'

import { useState } from 'react'
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
    Filter,
    Loader2
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { approveSubmission, rejectSubmission } from '@/lib/actions/submissions'
import { toast } from 'sonner'
import Image from 'next/image'

interface SubmissionListProps {
    submissions: any[] // Using any for now due to complex joined type
}

function formatDateTime(date: Date) {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    })
}

export default function SubmissionList({ submissions }: SubmissionListProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
    const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [viewImageOpen, setViewImageOpen] = useState(false)
    const [viewedSubmission, setViewedSubmission] = useState<any | null>(null)

    const filteredSubmissions = submissions.filter(s => {
        const pairingName = s.pairing ? `${s.pairing.mentor?.name} & ${s.pairing.menteeIds?.length} Mentees` : ''
        const familyName = s.pairing?.family?.name || ''
        const searchLower = searchTerm.toLowerCase()
        return pairingName.toLowerCase().includes(searchLower) || familyName.toLowerCase().includes(searchLower)
    })

    const pendingCount = submissions.filter(s => s.status === 'PENDING').length
    const approvedCount = submissions.filter(s => s.status === 'APPROVED').length
    const rejectedCount = submissions.filter(s => s.status === 'REJECTED').length

    const handleApprove = async (id: string) => {
        setIsProcessing(true)
        try {
            const result = await approveSubmission(id)
            if (result.success) {
                toast.success('Submission approved')
            } else {
                toast.error(result.error || 'Failed to approve')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsProcessing(false)
        }
    }

    const openRejectDialog = (id: string) => {
        setSelectedSubmissionId(id)
        setRejectReason('')
        setRejectDialogOpen(true)
    }

    const handleReject = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedSubmissionId) return

        setIsProcessing(true)
        try {
            const result = await rejectSubmission(selectedSubmissionId, rejectReason)
            if (result.success) {
                toast.success('Submission rejected')
                setRejectDialogOpen(false)
            } else {
                toast.error(result.error || 'Failed to reject')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsProcessing(false)
        }
    }

    const openViewImage = (submission: any) => {
        setViewedSubmission(submission)
        setViewImageOpen(true)
    }

    const SubmissionCard = ({ submission }: { submission: any }) => (
        <Card className="overflow-hidden">
            <div className="flex flex-col sm:flex-row">
                {/* Image Preview */}
                <div
                    className="w-full sm:w-48 h-48 sm:h-auto bg-muted shrink-0 relative cursor-pointer hover:opacity-90 transition-opacity group"
                    onClick={() => openViewImage(submission)}
                >
                    {submission.imageUrl ? (
                        <Image
                            src={submission.imageUrl}
                            alt="Submission"
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <FileImage className="w-8 h-8 text-muted-foreground" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="w-8 h-8 text-white" />
                    </div>
                </div>

                {/* Content */}
                <CardContent className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-semibold text-lg">
                                    {submission.pairing ?
                                        `${submission.pairing.mentor?.name?.split(' ').pop()} & ...`
                                        : 'Unknown Pairing'}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {submission.pairing?.family?.name || 'Unknown Family'} • Week {submission.weekNumber}
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
                            {submission.bonusActivities && submission.bonusActivities.length > 0 ? (
                                submission.bonusActivities.map((b: any, i: number) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                        {b.bonusActivity?.name || 'Bonus'}
                                    </Badge>
                                ))
                            ) : (
                                <span className="text-xs text-muted-foreground">No bonus activities</span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 sm:mt-0">
                        <div className="text-xs text-muted-foreground">
                            <div>Submitted {formatDateTime(submission.createdAt)}</div>
                            {submission.reviewedAt && (
                                <div>Reviewed {formatDateTime(submission.reviewedAt)}</div>
                            )}
                        </div>

                        {submission.status === 'PENDING' && (
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    className="gap-1"
                                    onClick={() => openRejectDialog(submission.id)}
                                    disabled={isProcessing}
                                >
                                    <XCircle className="w-4 h-4" />
                                    Reject
                                </Button>
                                <Button
                                    size="sm"
                                    className="gap-1 bg-green-600 hover:bg-green-700"
                                    onClick={() => handleApprove(submission.id)}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    Approve
                                </Button>
                            </div>
                        )}

                        {submission.status === 'APPROVED' && (
                            <div className="text-right">
                                <div className="font-semibold text-primary">+{submission.totalPoints} pts</div>
                                <div className="text-xs text-muted-foreground">
                                    Base: {submission.basePoints} | Bonus: {submission.bonusPoints}
                                </div>
                            </div>
                        )}

                        {submission.status === 'REJECTED' && submission.reviewReason && (
                            <span className="text-xs text-destructive max-w-xs truncate" title={submission.reviewReason}>
                                Reason: {submission.reviewReason}
                            </span>
                        )}
                    </div>
                </CardContent>
            </div>
        </Card>
    )

    return (
        <div className="p-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by pairing or family..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {/* 
                <Button variant="outline" className="gap-2">
                    <Filter className="w-4 h-4" />
                    Filter by Week
                </Button> 
                */}
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
                    {filteredSubmissions.filter(s => s.status === 'PENDING').map(submission => (
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
                    {filteredSubmissions.filter(s => s.status === 'APPROVED').map(submission => (
                        <SubmissionCard key={submission.id} submission={submission} />
                    ))}
                </TabsContent>

                <TabsContent value="rejected" className="space-y-4">
                    {filteredSubmissions.filter(s => s.status === 'REJECTED').map(submission => (
                        <SubmissionCard key={submission.id} submission={submission} />
                    ))}
                </TabsContent>

                <TabsContent value="all" className="space-y-4">
                    {filteredSubmissions.map(submission => (
                        <SubmissionCard key={submission.id} submission={submission} />
                    ))}
                </TabsContent>
            </Tabs>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Submission</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this submission.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleReject}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="reason">Reason</Label>
                                <Textarea
                                    id="reason"
                                    placeholder="e.g. Photo is blurry, missing members..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setRejectDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="destructive" disabled={isProcessing}>
                                {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Reject Submission
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View Image Modal */}
            <Dialog open={viewImageOpen} onOpenChange={setViewImageOpen}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/90 border-none">
                    <div className="relative w-full h-[80vh]">
                        {viewedSubmission?.imageUrl && (
                            <Image
                                src={viewedSubmission.imageUrl}
                                alt="Submission Full"
                                fill
                                className="object-contain"
                            />
                        )}
                        <Button
                            className="absolute top-4 right-4 rounded-full"
                            size="icon"
                            variant="secondary"
                            onClick={() => setViewImageOpen(false)}
                        >
                            <XCircle className="w-5 h-5" />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
