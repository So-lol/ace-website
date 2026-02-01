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
    Users,
    Trophy,
    Pencil,
    Archive,
    Trash2,
    RotateCcw,
    Loader2,
    Crown,
    UserPlus,
    X
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { FamilyDoc } from '@/types/firestore'
import { createFamily, updateFamily, deleteFamily } from '@/lib/actions/families'
import { toast } from 'sonner'

interface User {
    id: string
    name: string
    email: string
    role: string
}

interface Family {
    id: string
    name: string
    isArchived: boolean
    memberIds: string[]
    memberCount: number
    familyHeadIds: string[]
    familyHeadNames: string[]
    auntUncleIds: string[]
    auntUncleNames: string[]
    createdAt: Date
    updatedAt: Date
}

interface FamilyListProps {
    families: Family[]
    users: User[]
}

export default function FamilyList({ families, users }: FamilyListProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isRolesOpen, setIsRolesOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [editingFamily, setEditingFamily] = useState<Family | null>(null)
    const [name, setName] = useState('')
    const [selectedFamilyHeadIds, setSelectedFamilyHeadIds] = useState<string[]>([])
    const [selectedAuntUncleIds, setSelectedAuntUncleIds] = useState<string[]>([])

    const filteredFamilies = families.filter(f =>
        f.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const activeFamilies = filteredFamilies.filter(f => !f.isArchived)
    const archivedFamilies = filteredFamilies.filter(f => f.isArchived)

    const resetForm = () => {
        setName('')
        setEditingFamily(null)
        setSelectedFamilyHeadIds([])
        setSelectedAuntUncleIds([])
    }

    const openEdit = (family: Family) => {
        setEditingFamily(family)
        setName(family.name)
        setIsEditOpen(true)
    }

    const openRolesDialog = (family: Family) => {
        setEditingFamily(family)
        setSelectedFamilyHeadIds(family.familyHeadIds || [])
        setSelectedAuntUncleIds(family.auntUncleIds || [])
        setIsRolesOpen(true)
    }

    const addFamilyHead = (userId: string) => {
        if (userId && !selectedFamilyHeadIds.includes(userId)) {
            setSelectedFamilyHeadIds([...selectedFamilyHeadIds, userId])
        }
    }

    const removeFamilyHead = (userId: string) => {
        setSelectedFamilyHeadIds(selectedFamilyHeadIds.filter(id => id !== userId))
    }

    const addAuntUncle = (userId: string) => {
        if (userId && !selectedAuntUncleIds.includes(userId)) {
            setSelectedAuntUncleIds([...selectedAuntUncleIds, userId])
        }
    }

    const removeAuntUncle = (userId: string) => {
        setSelectedAuntUncleIds(selectedAuntUncleIds.filter(id => id !== userId))
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            const result = await createFamily({ name })
            if (result.success) {
                toast.success('Family created')
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
        if (!editingFamily) return
        setIsLoading(true)
        try {
            const result = await updateFamily(editingFamily.id, { name })
            if (result.success) {
                toast.success('Family updated')
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

    const handleSaveRoles = async () => {
        if (!editingFamily) return
        setIsLoading(true)
        try {
            const result = await updateFamily(editingFamily.id, {
                familyHeadIds: selectedFamilyHeadIds,
                auntUncleIds: selectedAuntUncleIds
            })
            if (result.success) {
                toast.success('Family roles updated')
                setIsRolesOpen(false)
                resetForm()
            } else {
                toast.error(result.error || 'Failed to update roles')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    const toggleArchive = async (family: Family) => {
        try {
            const result = await updateFamily(family.id, { isArchived: !family.isArchived })
            if (result.success) {
                toast.success(`Family ${family.isArchived ? 'restored' : 'archived'}`)
            } else {
                toast.error('Failed to update status')
            }
        } catch (error) {
            toast.error('An error occurred')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this family? This cannot be undone.')) return
        try {
            const result = await deleteFamily(id)
            if (result.success) {
                toast.success('Family deleted')
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
                        placeholder="Search families..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="doraemon-gradient text-white gap-2" onClick={resetForm}>
                            <Plus className="w-4 h-4" />
                            Create Family
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Family</DialogTitle>
                            <DialogDescription>
                                Add a new family group to the program.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate}>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Family Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g. Pho Family"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
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
                                    Create Family
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Family</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleUpdate}>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-name">Family Name</Label>
                                    <Input
                                        id="edit-name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
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

                {/* Roles Dialog (UPDATED) */}
                <Dialog open={isRolesOpen} onOpenChange={setIsRolesOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Crown className="w-5 h-5 text-amber-500" />
                                Manage Family Roles
                            </DialogTitle>
                            <DialogDescription>
                                Assign family heads and aunts/uncles to {editingFamily?.name}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                            {/* Family Heads */}
                            <div className="space-y-2">
                                <Label>Family Heads</Label>
                                <div className="flex gap-2">
                                    <Select onValueChange={addFamilyHead}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Add family head" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users
                                                .filter(u => !selectedFamilyHeadIds.includes(u.id) && !selectedAuntUncleIds.includes(u.id))
                                                .map((user) => (
                                                    <SelectItem key={user.id} value={user.id}>
                                                        {user.name} ({user.email})
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {selectedFamilyHeadIds.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {selectedFamilyHeadIds.map(id => {
                                            const user = users.find(u => u.id === id)
                                            return (
                                                <Badge key={id} className="gap-1 pr-1 bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
                                                    <Crown className="w-3 h-3 mr-1" />
                                                    {user?.name || 'Unknown'}
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-4 w-4 ml-1 hover:bg-amber-200/50 rounded-full"
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            removeFamilyHead(id)
                                                        }}
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </Button>
                                                </Badge>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Aunts/Uncles */}
                            <div className="space-y-2">
                                <Label>Aunts/Uncles</Label>
                                <div className="flex gap-2">
                                    <Select onValueChange={addAuntUncle}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Add aunt/uncle" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users
                                                .filter(u => !selectedAuntUncleIds.includes(u.id) && !selectedFamilyHeadIds.includes(u.id))
                                                .map((user) => (
                                                    <SelectItem key={user.id} value={user.id}>
                                                        {user.name} ({user.email})
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {selectedAuntUncleIds.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {selectedAuntUncleIds.map(id => {
                                            const user = users.find(u => u.id === id)
                                            return (
                                                <Badge key={id} variant="secondary" className="gap-1 pr-1">
                                                    {user?.name || 'Unknown'}
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-4 w-4 ml-1 hover:bg-destructive/20 rounded-full"
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            removeAuntUncle(id)
                                                        }}
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </Button>
                                                </Badge>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsRolesOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveRoles} disabled={isLoading}>
                                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Roles
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Families Table (UPDATED) */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Family Name</TableHead>
                                <TableHead>Leadership</TableHead>
                                <TableHead className="text-center">Members</TableHead>
                                <TableHead className="text-center">Points</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeFamilies.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No active families found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                activeFamilies.map((family) => (
                                    <TableRow key={family.id}>
                                        <TableCell className="font-medium">{family.name}</TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                {family.familyHeadNames && family.familyHeadNames.length > 0 ? (
                                                    family.familyHeadNames.map((name, i) => (
                                                        <div key={i} className="flex items-center gap-1 text-sm font-medium text-amber-700 dark:text-amber-500">
                                                            <Crown className="w-3 h-3" />
                                                            <span>{name}</span>
                                                        </div>
                                                    ))
                                                ) : null}

                                                {family.auntUncleNames && family.auntUncleNames.length > 0 && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {family.auntUncleNames.length} aunt/uncle{family.auntUncleNames.length > 1 ? 's' : ''}
                                                    </div>
                                                )}

                                                {(!family.familyHeadNames || family.familyHeadNames.length === 0) &&
                                                    (!family.auntUncleNames || family.auntUncleNames.length === 0) && (
                                                        <span className="text-xs text-muted-foreground">Not assigned</span>
                                                    )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Users className="w-4 h-4 text-muted-foreground" />
                                                {family.memberCount}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Trophy className="w-4 h-4 text-[#FFD700]" />
                                                {/* TODO: Fetch real total points if not synced */}
                                                --
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                                                Active
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEdit(family)}>
                                                        <Pencil className="w-4 h-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openRolesDialog(family)}>
                                                        <Crown className="w-4 h-4 mr-2" />
                                                        Manage Roles
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-amber-600" onClick={() => toggleArchive(family)}>
                                                        <Archive className="w-4 h-4 mr-2" />
                                                        Archive
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

            {/* Archived Families */}
            {archivedFamilies.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
                        Archived Families ({archivedFamilies.length})
                    </h2>
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Family Name</TableHead>
                                        <TableHead className="text-center">Members</TableHead>
                                        <TableHead className="text-center">Points</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {archivedFamilies.map((family) => (
                                        <TableRow key={family.id} className="opacity-60">
                                            <TableCell className="font-medium">{family.name}</TableCell>
                                            <TableCell className="text-center">{family.memberCount}</TableCell>
                                            <TableCell className="text-center">--</TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => toggleArchive(family)}>
                                                            <RotateCcw className="w-4 h-4 mr-2" />
                                                            Restore
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(family.id)}>
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Delete Permanently
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
                </div>
            )}
        </div>
    )
}
