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
    Gift,
    Calendar,
    Pencil,
    Eye,
    EyeOff,
    Trash2,
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
import { BonusActivityDoc } from '@/types/firestore'
import { createBonusActivity, updateBonusActivity, deleteBonusActivity } from '@/lib/actions/bonuses'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface BonusListProps {
    bonuses: BonusActivityDoc[]
}

export default function BonusList({ bonuses }: BonusListProps) {
    const router = useRouter()
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [editingBonus, setEditingBonus] = useState<BonusActivityDoc | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    // Form states
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [points, setPoints] = useState(5)
    // const [isActive, setIsActive] = useState(true) // Default to true on create

    const activeCount = bonuses.filter(b => b.isActive).length
    const filteredBonuses = bonuses.filter(b =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.description.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const resetForm = () => {
        setName('')
        setDescription('')
        setPoints(5)
        setEditingBonus(null)
    }

    const openEdit = (bonus: BonusActivityDoc) => {
        setEditingBonus(bonus)
        setName(bonus.name)
        setDescription(bonus.description)
        setPoints(bonus.points)
        setIsEditOpen(true)
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            const result = await createBonusActivity({ name, description, points })
            if (result.success) {
                toast.success('Bonus activity created')
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
        if (!editingBonus) return
        setIsLoading(true)
        try {
            const result = await updateBonusActivity(editingBonus.id, { name, description, points })
            if (result.success) {
                toast.success('Bonus activity updated')
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

    const toggleStatus = async (bonus: BonusActivityDoc) => {
        try {
            const result = await updateBonusActivity(bonus.id, { isActive: !bonus.isActive })
            if (result.success) {
                toast.success(`Bonus activity ${bonus.isActive ? 'deactivated' : 'activated'}`)
            } else {
                toast.error('Failed to update status')
            }
        } catch (error) {
            toast.error('An error occurred')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this activity?')) return
        try {
            const result = await deleteBonusActivity(id)
            if (result.success) {
                toast.success('Bonus activity deleted')
            } else {
                toast.error('Failed to delete')
            }
        } catch (error) {
            toast.error('An error occurred')
        }
    }

    return (
        <div className="p-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <Card>
                    <CardContent className="flex items-center gap-4 py-4">
                        <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                            <Gift className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{activeCount}</div>
                            <div className="text-sm text-muted-foreground">Active This Week</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-4 py-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{bonuses.length}</div>
                            <div className="text-sm text-muted-foreground">Total Created</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search activities..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="doraemon-gradient text-white gap-2" onClick={resetForm}>
                            <Plus className="w-4 h-4" />
                            Create Bonus Activity
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Bonus Activity</DialogTitle>
                            <DialogDescription>
                                Add a new bonus activity for users to complete.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate}>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g. Study Session"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Brief description of the activity"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="points">Points</Label>
                                    <Input
                                        id="points"
                                        type="number"
                                        min="1"
                                        value={points}
                                        onChange={(e) => setPoints(parseInt(e.target.value))}
                                        required
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Create Activity
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Bonus Activity</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleUpdate}>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-name">Name</Label>
                                    <Input
                                        id="edit-name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-description">Description</Label>
                                    <Textarea
                                        id="edit-description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-points">Points</Label>
                                    <Input
                                        id="edit-points"
                                        type="number"
                                        min="1"
                                        value={points}
                                        onChange={(e) => setPoints(parseInt(e.target.value))}
                                        required
                                    />
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
                                <TableHead>Activity Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-center">Points</TableHead>
                                <TableHead className="text-center">Created</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBonuses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No bonus activities found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredBonuses.map((activity) => (
                                    <TableRow key={activity.id}>
                                        <TableCell className="font-medium">{activity.name}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                                            {activity.description}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="font-mono">
                                                +{activity.points}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {new Date(activity.createdAt.toDate()).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {activity.isActive ? (
                                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                    Active
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline">
                                                    Inactive
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEdit(activity)}>
                                                        <Pencil className="w-4 h-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => toggleStatus(activity)}>
                                                        {activity.isActive ? (
                                                            <>
                                                                <EyeOff className="w-4 h-4 mr-2" />
                                                                Deactivate
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Eye className="w-4 h-4 mr-2" />
                                                                Activate
                                                            </>
                                                        )}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => handleDelete(activity.id)}
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
