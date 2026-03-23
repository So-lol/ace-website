'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Search,
    Image as ImageIcon,
    Archive,
    RotateCcw,
    Trash2,
    Loader2,
    Calendar,
    User,
    AlertTriangle,
    CheckCircle,
    Clock,
    XCircle,
    ShieldCheck,
    Upload,
    ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import {
    archiveMedia,
    restoreMedia,
    deleteArchivedMedia,
    type MediaDistributionOverview,
    type MediaGoogleDriveSyncResult,
    type MediaStorageAuditReport,
    reconcileMediaStorage,
    syncMediaToGoogleDrive,
} from '@/lib/actions/media'
import {
    MEDIA_SYNC_SCOPE_OPTIONS,
    mediaMatchesSyncScope,
    type MediaSyncScope,
} from '@/lib/media-distribution-utils'
import type { SubmissionStatus } from '@/types/firestore'
import { useRouter } from 'next/navigation'

interface MediaItem {
    id: string
    imageUrl: string
    imagePath: string
    status: SubmissionStatus
    submitterId: string
    submitterName: string
    weekNumber: number
    year: number
    totalPoints: number
    isArchived: boolean
    createdAt: Date
    archivedAt: Date | null
    daysSinceCreated: number
    daysSinceArchived: number | null
    eligibleForDeletion: boolean
}

interface MediaStats {
    total: number
    active: number
    archived: number
    eligibleForDeletion: number
}

interface MediaListProps {
    media: MediaItem[]
    stats: MediaStats
    distribution: MediaDistributionOverview
}

export default function MediaList({ media, stats, distribution }: MediaListProps) {
    const router = useRouter()
    const [filter, setFilter] = useState<string>('all')
    const [syncScope, setSyncScope] = useState<MediaSyncScope>('approved-active')
    const [searchTerm, setSearchTerm] = useState('')
    const [isLoading, setIsLoading] = useState<string | null>(null)
    const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null)
    const [confirmDelete, setConfirmDelete] = useState<MediaItem | null>(null)
    const [reconciliationReport, setReconciliationReport] = useState<MediaStorageAuditReport | null>(null)
    const [syncResult, setSyncResult] = useState<MediaGoogleDriveSyncResult | null>(null)
    const driveDestination = distribution.googleDrive

    const filteredMedia = media.filter(item => {
        // Apply filter
        if (filter === 'active' && item.isArchived) return false
        if (filter === 'archived' && !item.isArchived) return false
        if (filter === 'deletable' && !item.eligibleForDeletion) return false

        // Apply search
        if (searchTerm) {
            return item.submitterName.toLowerCase().includes(searchTerm.toLowerCase())
        }
        return true
    })

    const syncScopeCount = media.filter((item) => mediaMatchesSyncScope(item, syncScope)).length

    const handleArchive = async (item: MediaItem) => {
        setIsLoading(item.id)
        try {
            const result = await archiveMedia(item.id)
            if (result.success) {
                toast.success('Media archived')
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to archive')
            }
        } catch {
            toast.error('An error occurred')
        } finally {
            setIsLoading(null)
        }
    }

    const handleRestore = async (item: MediaItem) => {
        setIsLoading(item.id)
        try {
            const result = await restoreMedia(item.id)
            if (result.success) {
                toast.success('Media restored')
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to restore')
            }
        } catch {
            toast.error('An error occurred')
        } finally {
            setIsLoading(null)
        }
    }

    const handleDelete = async () => {
        if (!confirmDelete) return
        setIsLoading(confirmDelete.id)
        try {
            const result = await deleteArchivedMedia(confirmDelete.id)
            if (result.success) {
                toast.success('Media permanently deleted')
                setConfirmDelete(null)
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to delete')
            }
        } catch {
            toast.error('An error occurred')
        } finally {
            setIsLoading(null)
        }
    }

    const handleGoogleDriveSync = async () => {
        setIsLoading('drive-sync')
        setSyncResult(null)

        try {
            const result = await syncMediaToGoogleDrive(syncScope)
            setSyncResult(result)

            if (!result.success) {
                toast.error(result.error || 'Failed to sync media to Google Drive')
                return
            }

            if (result.partialFailure) {
                toast.error(`Synced ${result.summary?.created || 0} new and ${result.summary?.updated || 0} existing files. ${result.summary?.failed || 0} failed.`)
            } else {
                toast.success(`Google Drive sync complete for ${result.summary?.totalCandidates || 0} submissions`)
            }

            router.refresh()
        } catch {
            toast.error('An error occurred')
        } finally {
            setIsLoading(null)
        }
    }

    const handleRunIntegrityCheck = async () => {
        setIsLoading('reconcile')
        try {
            const result = await reconcileMediaStorage()
            if (!result.success) {
                toast.error(result.error || 'Failed to run integrity check')
                return
            }

            setReconciliationReport(result.report)

            if (result.report.issueCount === 0) {
                toast.success(`Integrity check passed for ${result.report.scannedSubmissions} submissions`)
                return
            }

            toast.error(`Integrity check found ${result.report.issueCount} issues`)
        } catch {
            toast.error('An error occurred')
        } finally {
            setIsLoading(null)
        }
    }

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>
            case 'REJECTED':
                return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
            default:
                return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
        }
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <div className="text-sm text-muted-foreground">Total Media</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                        <div className="text-sm text-muted-foreground">Active</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-amber-600">{stats.archived}</div>
                        <div className="text-sm text-muted-foreground">Archived</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-red-600">{stats.eligibleForDeletion}</div>
                        <div className="text-sm text-muted-foreground">Eligible for Deletion</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-dashed">
                <CardHeader className="gap-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <CardTitle>Google Drive Distribution</CardTitle>
                                {driveDestination.configured ? (
                                    <Badge className="bg-green-600">Configured</Badge>
                                ) : (
                                    <Badge variant="destructive">Needs Setup</Badge>
                                )}
                                {driveDestination.credentialSource && (
                                    <Badge variant="outline">
                                        {driveDestination.credentialSource === 'google-drive'
                                            ? 'Dedicated Drive credentials'
                                            : 'Using Firebase Admin credentials'}
                                    </Badge>
                                )}
                            </div>
                            <CardDescription>
                                Push submitted photos into the shared Google Drive folder your multimedia team uses.
                                The recommended scope is approved active submissions only.
                            </CardDescription>
                        </div>

                        {driveDestination.folderUrl && (
                            <Button asChild variant="outline" className="gap-2 self-start">
                                <a href={driveDestination.folderUrl} target="_blank" rel="noreferrer">
                                    <ExternalLink className="w-4 h-4" />
                                    Open Drive Folder
                                </a>
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
                        {driveDestination.configured ? (
                            <>
                                <div>
                                    Share the destination Drive folder with{' '}
                                    <span className="font-medium">{driveDestination.serviceAccountEmail || 'the configured service account'}</span>{' '}
                                    as an Editor or Content manager so uploads can succeed.
                                </div>
                                <div className="text-muted-foreground break-all">
                                    Folder ID: {driveDestination.folderId}
                                </div>
                                <div className="text-muted-foreground">
                                    If the first sync fails immediately, confirm the Google Drive API is enabled for the service account&apos;s project.
                                </div>
                            </>
                        ) : (
                            <div className="text-red-600">
                                {driveDestination.configurationError}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                        <div className="space-y-2">
                            <div className="text-sm font-medium">Sync scope</div>
                            <Select value={syncScope} onValueChange={(value) => setSyncScope(value as MediaSyncScope)}>
                                <SelectTrigger className="w-full min-w-72">
                                    <SelectValue placeholder="Choose what to sync" />
                                </SelectTrigger>
                                <SelectContent>
                                    {MEDIA_SYNC_SCOPE_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="text-xs text-muted-foreground">
                                {MEDIA_SYNC_SCOPE_OPTIONS.find((option) => option.value === syncScope)?.description} {syncScopeCount} matching submission{syncScopeCount === 1 ? '' : 's'}.
                            </div>
                        </div>

                        <Button
                            type="button"
                            className="gap-2"
                            onClick={handleGoogleDriveSync}
                            disabled={!driveDestination.configured || isLoading === 'drive-sync'}
                        >
                            {isLoading === 'drive-sync' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            Sync To Google Drive
                        </Button>
                    </div>

                    {syncResult?.summary && (
                        <div className={`rounded-lg border p-4 space-y-3 ${syncResult.partialFailure ? 'border-amber-300 bg-amber-50/50' : 'border-green-200 bg-green-50/40'}`}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <div className="font-semibold">
                                        {syncResult.partialFailure ? 'Sync completed with issues' : 'Sync completed'}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {syncResult.folderName ? `${syncResult.folderName} • ` : ''}
                                        {syncResult.summary.totalCandidates} submission{syncResult.summary.totalCandidates === 1 ? '' : 's'} considered
                                    </div>
                                </div>
                                <Badge variant={syncResult.partialFailure ? 'secondary' : 'default'}>
                                    {syncResult.partialFailure ? `${syncResult.summary.failed} failed` : 'Healthy'}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 text-sm">
                                <div>
                                    <div className="font-semibold">{syncResult.summary.created}</div>
                                    <div className="text-muted-foreground">Created</div>
                                </div>
                                <div>
                                    <div className="font-semibold">{syncResult.summary.updated}</div>
                                    <div className="text-muted-foreground">Updated</div>
                                </div>
                                <div>
                                    <div className="font-semibold">{syncResult.summary.skipped}</div>
                                    <div className="text-muted-foreground">Skipped</div>
                                </div>
                                <div>
                                    <div className="font-semibold">{syncResult.summary.failed}</div>
                                    <div className="text-muted-foreground">Failed</div>
                                </div>
                            </div>

                            {syncResult.failures && syncResult.failures.length > 0 && (
                                <div className="space-y-2">
                                    <div className="text-sm font-medium">Failures</div>
                                    <div className="space-y-2">
                                        {syncResult.failures.slice(0, 5).map((failure) => (
                                            <div key={`${failure.submissionId}-${failure.fileName}`} className="rounded-md border bg-background p-2 text-sm">
                                                <div className="font-medium">{failure.fileName}</div>
                                                <div className="text-muted-foreground">Submission: {failure.submissionId}</div>
                                                <div className="text-red-600">{failure.error}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by submitter..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Media</SelectItem>
                        <SelectItem value="active">Active Only</SelectItem>
                        <SelectItem value="archived">Archived Only</SelectItem>
                        <SelectItem value="deletable">Eligible for Deletion</SelectItem>
                    </SelectContent>
                </Select>
                <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={handleRunIntegrityCheck}
                    disabled={isLoading === 'reconcile'}
                >
                    {isLoading === 'reconcile' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Run Integrity Check
                </Button>
            </div>

            {reconciliationReport && (
                <Card className={reconciliationReport.issueCount === 0 ? 'border-green-200' : 'border-red-200'}>
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="font-semibold">Latest Integrity Check</div>
                                <div className="text-sm text-muted-foreground">
                                    {new Date(reconciliationReport.auditedAt).toLocaleString('en-US')}
                                </div>
                            </div>
                            <Badge variant={reconciliationReport.issueCount === 0 ? 'default' : 'destructive'}>
                                {reconciliationReport.issueCount === 0 ? 'Healthy' : `${reconciliationReport.issueCount} issue${reconciliationReport.issueCount === 1 ? '' : 's'}`}
                            </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                                <div className="font-semibold">{reconciliationReport.scannedSubmissions}</div>
                                <div className="text-muted-foreground">Submissions scanned</div>
                            </div>
                            <div>
                                <div className="font-semibold">{reconciliationReport.healthySubmissions}</div>
                                <div className="text-muted-foreground">Healthy uploads</div>
                            </div>
                            <div>
                                <div className="font-semibold text-red-600">{reconciliationReport.missingFiles}</div>
                                <div className="text-muted-foreground">Missing files</div>
                            </div>
                            <div>
                                <div className="font-semibold text-amber-600">{reconciliationReport.orphanedFiles}</div>
                                <div className="text-muted-foreground">Orphaned files</div>
                            </div>
                        </div>
                        {reconciliationReport.issueCount > 0 && (
                            <div className="space-y-2">
                                <div className="text-sm font-medium">Issues</div>
                                <div className="space-y-2">
                                    {reconciliationReport.issues.slice(0, 8).map((issue, index) => (
                                        <div key={`${issue.code}-${issue.submissionId || issue.imagePath || index}`} className="rounded-md border p-2 text-sm">
                                            <div className="font-medium">{issue.code}</div>
                                            {issue.submissionId && <div className="text-muted-foreground">Submission: {issue.submissionId}</div>}
                                            {issue.imagePath && <div className="text-muted-foreground break-all">Path: {issue.imagePath}</div>}
                                            {typeof issue.ageMinutes === 'number' && (
                                                <div className="text-muted-foreground">Age: {issue.ageMinutes} minutes</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Media Grid */}
            {filteredMedia.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                        <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        No media found
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredMedia.map((item) => (
                        <Card key={item.id} className={item.isArchived ? 'opacity-75' : ''}>
                            <div
                                className="aspect-video relative bg-muted cursor-pointer overflow-hidden"
                                onClick={() => setSelectedImage(item)}
                            >
                                <Image
                                    src={item.imageUrl}
                                    alt={`Submission by ${item.submitterName}`}
                                    fill
                                    unoptimized
                                    className="object-cover hover:scale-105 transition-transform"
                                />
                                {item.isArchived && (
                                    <div className="absolute top-2 right-2">
                                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                                            <Archive className="w-3 h-3 mr-1" />
                                            Archived
                                        </Badge>
                                    </div>
                                )}
                                {item.eligibleForDeletion && (
                                    <div className="absolute top-2 left-2">
                                        <Badge variant="destructive">
                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                            30+ days
                                        </Badge>
                                    </div>
                                )}
                            </div>
                            <CardContent className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                    {getStatusBadge(item.status)}
                                    <span className="text-xs text-muted-foreground">
                                        Week {item.weekNumber}, {item.year}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 text-sm mb-2">
                                    <User className="w-3 h-3" />
                                    <span className="truncate">{item.submitterName}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(item.createdAt)}
                                </div>

                                <div className="flex gap-2">
                                    {item.isArchived ? (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex-1"
                                                onClick={() => handleRestore(item)}
                                                disabled={isLoading === item.id}
                                            >
                                                {isLoading === item.id ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <><RotateCcw className="w-3 h-3 mr-1" />Restore</>
                                                )}
                                            </Button>
                                            {item.eligibleForDeletion && (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => setConfirmDelete(item)}
                                                    disabled={isLoading === item.id}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            )}
                                        </>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => handleArchive(item)}
                                            disabled={isLoading === item.id}
                                        >
                                            {isLoading === item.id ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <><Archive className="w-3 h-3 mr-1" />Archive</>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Image Preview Dialog */}
            <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
                <DialogContent className="max-w-3xl">
                    {selectedImage && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Submission Preview</DialogTitle>
                                <DialogDescription>
                                    By {selectedImage.submitterName} • Week {selectedImage.weekNumber}, {selectedImage.year}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                                <Image
                                    src={selectedImage.imageUrl}
                                    alt="Submission"
                                    width={1200}
                                    height={900}
                                    unoptimized
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                {getStatusBadge(selectedImage.status)}
                                <span className="text-sm text-muted-foreground">
                                    {selectedImage.totalPoints} points
                                </span>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-5 h-5" />
                            Permanent Deletion
                        </DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. The image file and all associated data will be permanently removed.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isLoading === confirmDelete?.id}
                        >
                            {isLoading === confirmDelete?.id ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4 mr-2" />
                            )}
                            Delete Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
