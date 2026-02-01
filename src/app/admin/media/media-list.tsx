'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    XCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { archiveMedia, restoreMedia, deleteArchivedMedia } from '@/lib/actions/media'
import { useRouter } from 'next/navigation'

interface MediaItem {
    id: string
    imageUrl: string
    imagePath: string
    status: string
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
}

export default function MediaList({ media, stats }: MediaListProps) {
    const router = useRouter()
    const [filter, setFilter] = useState<string>('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [isLoading, setIsLoading] = useState<string | null>(null)
    const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null)
    const [confirmDelete, setConfirmDelete] = useState<MediaItem | null>(null)

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
        } catch (error) {
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
        } catch (error) {
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
        } catch (error) {
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
            </div>

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
                                <img
                                    src={item.imageUrl}
                                    alt={`Submission by ${item.submitterName}`}
                                    className="w-full h-full object-cover hover:scale-105 transition-transform"
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
                                <img
                                    src={selectedImage.imageUrl}
                                    alt="Submission"
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
