import { Metadata } from 'next'
import { AdminHeader } from '@/components/admin'
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
    Calendar
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export const metadata: Metadata = {
    title: 'Announcements',
    description: 'Manage program announcements',
}

// Mock data
const announcements = [
    {
        id: '1',
        title: 'Week 5 Bonus Activity: Study Session!',
        isPublished: true,
        isPinned: true,
        publishedAt: '2026-01-29',
        author: 'ACE Coordinators'
    },
    {
        id: '2',
        title: 'ACE Family Mixer Event - Save the Date!',
        isPublished: true,
        isPinned: true,
        publishedAt: '2026-01-27',
        author: 'VSAM Events'
    },
    {
        id: '3',
        title: 'Photo Submission Reminder',
        isPublished: true,
        isPinned: false,
        publishedAt: '2026-01-25',
        author: 'ACE Admin'
    },
    {
        id: '4',
        title: 'Week 6 Preview (Draft)',
        isPublished: false,
        isPinned: false,
        publishedAt: null,
        author: 'ACE Coordinators'
    },
    {
        id: '5',
        title: 'Welcome to ACE Spring 2026!',
        isPublished: true,
        isPinned: false,
        publishedAt: '2026-01-15',
        author: 'ACE Coordinators'
    },
]

function formatDate(dateString: string | null) {
    if (!dateString) return 'Not published'
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })
}

export default function AnnouncementsPage() {
    return (
        <>
            <AdminHeader title="Announcements" />

            <main className="p-6">
                {/* Actions Bar */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search announcements..."
                            className="pl-10"
                        />
                    </div>
                    <Button className="doraemon-gradient text-white gap-2">
                        <Plus className="w-4 h-4" />
                        Create Announcement
                    </Button>
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
                                {announcements.map((announcement) => (
                                    <TableRow key={announcement.id}>
                                        <TableCell>
                                            {announcement.isPinned && (
                                                <Pin className="w-4 h-4 text-[#FFD700]" />
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">{announcement.title}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {announcement.author}
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
                                                    <DropdownMenuItem>
                                                        <Pencil className="w-4 h-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    {announcement.isPublished ? (
                                                        <DropdownMenuItem>
                                                            <EyeOff className="w-4 h-4 mr-2" />
                                                            Unpublish
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem>
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            Publish
                                                        </DropdownMenuItem>
                                                    )}
                                                    {announcement.isPinned ? (
                                                        <DropdownMenuItem>
                                                            <PinOff className="w-4 h-4 mr-2" />
                                                            Unpin
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem>
                                                            <Pin className="w-4 h-4 mr-2" />
                                                            Pin
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive">
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </>
    )
}
