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
    Loader2,
    Clock,
    FileText
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
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { AnnouncementDoc } from '@/types/firestore'
import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/lib/actions/announcements'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

interface ClientAnnouncement extends Omit<AnnouncementDoc, 'createdAt' | 'updatedAt' | 'publishedAt'> {
    createdAt: Date
    updatedAt: Date
    publishedAt: Date | null
}

interface AnnouncementListProps {
    announcements: ClientAnnouncement[]
}

function formatDate(date: Date | null) {
    if (!date) return 'Not published'
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    })
}

function toLocalISOString(date: Date) {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
}

export default function AnnouncementList({ announcements }: AnnouncementListProps) {
    const { user } = useAuth()
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [editingAnnouncement, setEditingAnnouncement] = useState<ClientAnnouncement | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    // Form states
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [isPublished, setIsPublished] = useState(false)
    const [isPinned, setIsPinned] = useState(false)
    const [isScheduled, setIsScheduled] = useState(false)
    const [scheduledDate, setScheduledDate] = useState('') // ISO string for input

    const filteredAnnouncements = announcements.filter(a =>
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.content.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Categorize
    const now = new Date()
    const scheduled = filteredAnnouncements.filter(a => a.isPublished && a.publishedAt && new Date(a.publishedAt) > now)
    const published = filteredAnnouncements.filter(a => a.isPublished && (!a.publishedAt || new Date(a.publishedAt) <= now))
    const drafts = filteredAnnouncements.filter(a => !a.isPublished)

    const resetForm = () => {
        setTitle('')
        setContent('')
        setIsPublished(false)
        setIsPinned(false)
        setIsScheduled(false)
        setScheduledDate('')
        setEditingAnnouncement(null)
    }

    const openEdit = (announcement: ClientAnnouncement) => {
        setEditingAnnouncement(announcement)
        setTitle(announcement.title)
        setContent(announcement.content)
        setIsPublished(announcement.isPublished)
        setIsPinned(announcement.isPinned)

        if (announcement.publishedAt) {
            const date = new Date(announcement.publishedAt)
            if (date > new Date()) {
                setIsScheduled(true)
                setScheduledDate(toLocalISOString(date))
            } else {
                setIsScheduled(false)
                setScheduledDate('')
            }
        } else {
            setScheduledDate('')
        }

        setIsEditOpen(true)
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        if (isPublished && scheduledDate) {
            const scheduledTime = new Date(scheduledDate)
            if (scheduledTime <= new Date()) {
                toast.error('Scheduled date must be in the future')
                return
            }
        }

        setIsLoading(true)
        try {
            const result = await createAnnouncement({
                title,
                content,
                isPublished,
                isPinned,
                authorId: user.id,
                authorName: user.name || 'Admin',
                publishedAt: isPublished && scheduledDate ? new Date(scheduledDate) : null
            })

            if (result.success) {
                toast.success(scheduledDate ? 'Announcement scheduled' : 'Announcement created')
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

        if (isPublished && scheduledDate) {
            const scheduledTime = new Date(scheduledDate)
            if (scheduledTime <= new Date()) {
                toast.error('Scheduled date must be in the future')
                return
            }
        }

        setIsLoading(true)
        try {
            const result = await updateAnnouncement(editingAnnouncement.id, {
                title,
                content,
                isPublished,
                isPinned,
                publishedAt: isPublished && scheduledDate ? new Date(scheduledDate) : (isPublished ? null : undefined)
                // Logic: 
                // if Published + Date => Scheduled Update
                // if Published + No Date => Keep existing Date (Handled by server if undefined) or Set Now?
                // Actually server updateAnnouncement handles: "If data.publishedAt undefined, and was !published, set Now".
                // If I clear scheduled date I might want "Now".
                // Simplest: pass explicit date if set.
            })

            // Re-refining logic:
            // If User sets Date -> Send Date.
            // If User clears Date -> Send null? No, Server handles null as unpublish IF isPublished=false.
            // If isPublished=true and Date is empty -> User means "Publish Now / Keep Published".
            // We pass date only if present.

            const updatePayload: any = {
                title,
                content,
                isPublished,
                isPinned
            }
            if (scheduledDate) {
                updatePayload.publishedAt = new Date(scheduledDate)
            }
            // If clearing schedule to publish immediately, how to signal?
            // If we send isPublished=true, and no publishedAt, server keeps existing or sets Now.
            // If existing was future, and we want Now... server won't override unless forced.
            // But we can't easily force "Now" if we rely on "undefined = keep".
            // Solution: If scheduledDate is cleared but IS Published, send new Date() to force update?
            // No, user might just edit text.
            // Let's rely on server for now. If user wants to "Unschedule" to "Now", they can pick today's date or we add a "Publish Now" button.
            // Current form: If date cleared, we don't send it.

            await updateAnnouncement(editingAnnouncement.id, updatePayload)

            toast.success('Announcement updated')
            setIsEditOpen(false)
            resetForm()
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    const togglePublish = async (announcement: ClientAnnouncement) => {
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

    const togglePin = async (announcement: ClientAnnouncement) => {
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

    const AnnouncementTable = ({ items, type }: { items: ClientAnnouncement[], type: 'published' | 'scheduled' | 'draft' }) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>{type === 'scheduled' ? 'Scheduled For' : 'Published'}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No {type} announcements found.
                        </TableCell>
                    </TableRow>
                ) : (
                    items.map((announcement) => (
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
                                {type === 'draft' && <Badge variant="secondary">Draft</Badge>}
                                {type === 'scheduled' && <Badge variant="outline" className="border-amber-500 text-amber-500"><Clock className="w-3 h-3 mr-1" /> Scheduled</Badge>}
                                {type === 'published' && <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Published</Badge>}
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
    )

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
                                Post a new announcement or schedule it for later.
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
                                <div className="space-y-4 rounded-lg border p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Schedule for later</Label>
                                            <p className="text-xs text-muted-foreground">Automatically publish at a future date</p>
                                        </div>
                                        <Switch
                                            checked={isScheduled}
                                            onCheckedChange={(checked) => {
                                                setIsScheduled(checked)
                                                if (checked) {
                                                    setIsPublished(true)
                                                } else {
                                                    setIsPublished(false)
                                                    setScheduledDate('')
                                                }
                                            }}
                                        />
                                    </div>

                                    {isScheduled ? (
                                        <div className="space-y-2 animate-in fade-in">
                                            <Label>Date & Time</Label>
                                            <Input
                                                type="datetime-local"
                                                value={scheduledDate}
                                                onChange={e => setScheduledDate(e.target.value)}
                                                required={isScheduled}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 pt-2 border-t">
                                            <Switch
                                                id="published"
                                                checked={isPublished}
                                                onCheckedChange={setIsPublished}
                                            />
                                            <Label htmlFor="published">Publish immediately</Label>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 pt-2 border-t">
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
                                    {scheduledDate ? 'Schedule Announcement' : 'Create Announcement'}
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
                                <div className="space-y-4 rounded-lg border p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Schedule for later</Label>
                                            <p className="text-xs text-muted-foreground">Automatically publish at a future date</p>
                                        </div>
                                        <Switch
                                            checked={isScheduled}
                                            onCheckedChange={(checked) => {
                                                setIsScheduled(checked)
                                                if (checked) {
                                                    setIsPublished(true)
                                                } else {
                                                    setIsPublished(false)
                                                    setScheduledDate('')
                                                }
                                            }}
                                        />
                                    </div>

                                    {isScheduled ? (
                                        <div className="space-y-2 animate-in fade-in">
                                            <Label>Date & Time</Label>
                                            <Input
                                                type="datetime-local"
                                                value={scheduledDate}
                                                onChange={e => setScheduledDate(e.target.value)}
                                                required={isScheduled}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 pt-2 border-t">
                                            <Switch
                                                id="edit-published"
                                                checked={isPublished}
                                                onCheckedChange={setIsPublished}
                                            />
                                            <Label htmlFor="edit-published">Publish immediately</Label>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 pt-2 border-t">
                                        <Switch
                                            id="edit-pinned"
                                            checked={isPinned}
                                            onCheckedChange={setIsPinned}
                                        />
                                        <Label htmlFor="edit-pinned">Pin to top</Label>
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

            {/* Content Tabs */}
            <Tabs defaultValue="published" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-md mb-4 bg-muted/50 p-1">
                    <TabsTrigger value="scheduled" className="gap-2 relative">
                        Pending
                        {scheduled.length > 0 && (
                            <Badge variant="destructive" className="h-5 px-1.5 text-[10px] ml-1 rounded-full">
                                {scheduled.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="published" className="gap-2">
                        Published
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] ml-1 rounded-full bg-slate-200 dark:bg-slate-700">
                            {published.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="drafts" className="gap-2">
                        Drafts
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] ml-1 rounded-full bg-slate-200 dark:bg-slate-700">
                            {drafts.length}
                        </Badge>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="scheduled">
                    <Card>
                        <CardContent className="p-0">
                            <AnnouncementTable items={scheduled} type="scheduled" />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="published">
                    <Card>
                        <CardContent className="p-0">
                            <AnnouncementTable items={published} type="published" />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="drafts">
                    <Card>
                        <CardContent className="p-0">
                            <AnnouncementTable items={drafts} type="draft" />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
