'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Plus,
    Search,
    MoreHorizontal,
    Megaphone,
    Pencil,
    Eye,
    EyeOff,
    Pin,
    PinOff,
    Trash2,
    Calendar,
    Loader2
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Switch } from '@/components/ui/switch'
import { AnnouncementDoc } from '@/types/firestore'
import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/lib/actions/announcements'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

interface AnnouncementListProps {
    announcements: AnnouncementDoc[]
}

function formatDate(date: any) {
    if (!date) return 'Not published'
    // Handle Firestore Timestamp or Date
    const d = date.toDate ? date.toDate() : new Date(date)
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })
}

export default function AnnouncementList({ announcements }: AnnouncementListProps) {
    const router = useRouter()
    const { user } = useAuth()
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementDoc | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    // Form states
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [isPublished, setIsPublished] = useState(false)
    const [isPinned, setIsPinned] = useState(false)

    const filteredAnnouncements = announcements.filter(a =>
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.content.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const resetForm = () => {
        setTitle('')
        setContent('')
        setIsPublished(false)
        setIsPinned(false)
        setEditingAnnouncement(null)
    }

    const openEdit = (announcement: AnnouncementDoc) => {
        setEditingAnnouncement(announcement)
        setTitle(announcement.title)
        setContent(announcement.content)
        setIsPublished(announcement.isPublished)
        setIsPinned(announcement.isPinned)
        setIsEditOpen(true)
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setIsLoading(true)
        try {
            const result = await createAnnouncement({
                title,
                content,
                isPublished,
                isPinned,
                authorId: user.id,
                authorName: user.name || 'Admin'
            })

            if (result.success) {
                toast.success('Announcement created')
                setIsCreateOpen(false)
                resetForm()
            } else {
                toast.error(result.error || 'Failed to create')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingAnnouncement) return

        setIsLoading(true)
        try {
            const result = await updateAnnouncement(editingAnnouncement.id, {
                title,
                content,
                isPublished,
                isPinned
            })

            if (result.success) {
                toast.success('Announcement updated')
                setIsEditOpen(false)
                resetForm()
            } else {
                toast.error(result.error || 'Failed to update')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    const togglePublish = async (announcement: AnnouncementDoc) => {
        try {
            const result = await updateAnnouncement(announcement.id, { isPublished: !announcement.isPublished })
            if (result.success) {
                toast.success(`Announcement ${announcement.isPublished ? 'unpublished' : 'published'}`)
            } else {
                toast.error('Failed to update status')
            }
        } catch (error) {
            toast.error('An error occurred')
        }
    }

    const togglePin = async (announcement: AnnouncementDoc) => {
        try {
            const result = await updateAnnouncement(announcement.id, { isPinned: !announcement.isPinned })
            if (result.success) {
                toast.success(`Announcement ${announcement.isPinned ? 'unpinned' : 'pinned'}`)
            } else {
                toast.error('Failed to update status')
            }
        } catch (error) {
            toast.error('An error occurred')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this announcement?')) return
        try {
            const result = await deleteAnnouncement(id)
            if (result.success) {
                toast.success('Announcement deleted')
            } else {
                toast.error('Failed to delete')
            }
        } catch (error) {
            toast.error('An error occurred')
        }
    }

    return (
        <div className="p-6">
            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search announcements..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="doraemon-gradient text-white gap-2" onClick={resetForm}>
                            <Plus className="w-4 h-4" />
                            Create Announcement
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Announcement</DialogTitle>
                            <DialogDescription>
                                Post a new announcement for all users to see.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate}>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Title</Label>
                                    <Input
                                        id="title"
                                        placeholder="e.g. Week 5 Bonus Activity"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="content">Content</Label>
                                    <Textarea
                                        id="content"
                                        placeholder="Announcement details..."
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        required
                                        className="min-h-[100px]"
                                    />
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            id="published"
                                            checked={isPublished}
                                            onCheckedChange={setIsPublished}
                                        />
                                        <Label htmlFor="published">Publish immediately</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            id="pinned"
                                            checked={isPinned}
                                            onCheckedChange={setIsPinned}
                                        />
                                        <Label htmlFor="pinned">Pin to top</Label>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Create Announcement
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Announcement</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleUpdate}>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-title">Title</Label>
                                    <Input
                                        id="edit-title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-content">Content</Label>
                                    <Textarea
                                        id="edit-content"
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        required
                                        className="min-h-[100px]"
                                    />
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            id="edit-published"
                                            checked={isPublished}
                                            onCheckedChange={setIsPublished}
                                        />
                                        <Label htmlFor="edit-published">Published</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            id="edit-pinned"
                                            checked={isPinned}
                                            onCheckedChange={setIsPinned}
                                        />
                                        <Label htmlFor="edit-pinned">Pinned</Label>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40px]"></TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Author</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead>Published</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAnnouncements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No announcements found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAnnouncements.map((announcement) => (
                                    <TableRow key={announcement.id}>
                                        <TableCell>
                                            {announcement.isPinned && (
                                                <Pin className="w-4 h-4 text-[#FFD700]" />
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">{announcement.title}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {announcement.authorName}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {announcement.isPublished ? (
                                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                    Published
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">
                                                    Draft
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                {formatDate(announcement.publishedAt)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEdit(announcement)}>
                                                        <Pencil className="w-4 h-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => togglePublish(announcement)}>
                                                        {announcement.isPublished ? (
                                                            <>
                                                                <EyeOff className="w-4 h-4 mr-2" />
                                                                Unpublish
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Eye className="w-4 h-4 mr-2" />
                                                                Publish
                                                            </>
                                                        )}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => togglePin(announcement)}>
                                                        {announcement.isPinned ? (
                                                            <>
                                                                <PinOff className="w-4 h-4 mr-2" />
                                                                Unpin
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Pin className="w-4 h-4 mr-2" />
                                                                Pin
                                                            </>
                                                        )}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => handleDelete(announcement.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
