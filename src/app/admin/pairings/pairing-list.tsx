'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Search,
    Users,
    UserCheck,
    Plus,
    MoreHorizontal,
    ArrowRight,
    Trophy,
    Trash2,
    Loader2,
    X
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { createPairing, deletePairing } from '@/lib/actions/pairings'
import { useRouter } from 'next/navigation'

interface PairingListProps {
    pairings: any[] // Using any for joined type simplicity, or stricter type if defined
    families: any[]
    users: any[]
}

export default function PairingList({ pairings, families, users }: PairingListProps) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Form State
    const [selectedFamilyId, setSelectedFamilyId] = useState<string>('')
    const [selectedMentorId, setSelectedMentorId] = useState<string>('')
    const [selectedMenteeIds, setSelectedMenteeIds] = useState<string[]>([])

    const filteredPairings = pairings.filter(p =>
        p.mentor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.family?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Group by family for display
    const familyGroups = filteredPairings.reduce((acc, pairing) => {
        const familyName = pairing.family?.name || 'Unknown Family'
        if (!acc[familyName]) {
            acc[familyName] = []
        }
        acc[familyName].push(pairing)
        return acc
    }, {} as Record<string, any[]>)

    const resetForm = () => {
        setSelectedFamilyId('')
        setSelectedMentorId('')
        setSelectedMenteeIds([])
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedFamilyId || !selectedMentorId || selectedMenteeIds.length === 0) {
            toast.error('Please select family, mentor, and at least one mentee')
            return
        }

        setIsLoading(true)
        try {
            const result = await createPairing(selectedFamilyId, selectedMentorId, selectedMenteeIds)
            if (result.success) {
                toast.success('Pairing created')
                setIsCreateOpen(false)
                resetForm()
            } else {
                toast.error(result.error || 'Failed to create pairing')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this pairing? This will impact historical points.')) return
        try {
            const result = await deletePairing(id)
            if (result.success) {
                toast.success('Pairing deleted')
            } else {
                toast.error('Failed to delete')
            }
        } catch (error) {
            toast.error('An error occurred')
        }
    }

    const toggleMenteeSelection = (userId: string) => {
        if (selectedMenteeIds.includes(userId)) {
            setSelectedMenteeIds(prev => prev.filter(id => id !== userId))
        } else {
            setSelectedMenteeIds(prev => [...prev, userId])
        }
    }

    // Filter available mentors/mentees based on existing assignments could be added here
    // For now, list all users to allow re-assignment flexibility
    const sortedUsers = [...users].sort((a, b) => a.name.localeCompare(b.name))

    return (
        <div className="p-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-sm font-medium text-muted-foreground mb-2">Total Pairings</div>
                        <div className="text-2xl font-bold">{pairings.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-sm font-medium text-muted-foreground mb-2">Families</div>
                        <div className="text-2xl font-bold">{Object.keys(familyGroups).length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-sm font-medium text-muted-foreground mb-2">Total Points</div>
                        <div className="text-2xl font-bold text-primary">
                            {pairings.reduce((sum, p) => sum + (p.totalPoints || 0), 0)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search pairings..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2" onClick={resetForm}>
                            <Plus className="w-4 h-4" />
                            Create Pairing
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Create New Pairing</DialogTitle>
                            <DialogDescription>
                                Assign a mentor and mentees to a family group.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate}>
                            <div className="space-y-4 py-4">
                                {/* Family Selection */}
                                <div className="space-y-2">
                                    <Label>Family</Label>
                                    <Select value={selectedFamilyId} onValueChange={setSelectedFamilyId} required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a family" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {families.map(f => (
                                                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Mentor Selection */}
                                <div className="space-y-2">
                                    <Label>Mentor</Label>
                                    <Select value={selectedMentorId} onValueChange={setSelectedMentorId} required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a mentor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sortedUsers.map(u => (
                                                <SelectItem key={u.id} value={u.id}>
                                                    {u.name} ({u.email})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Mentees Selection (Custom Multi-select) */}
                                <div className="space-y-2">
                                    <Label>Mentees</Label>
                                    <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                                        {sortedUsers.filter(u => u.id !== selectedMentorId).map(u => (
                                            <div key={u.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`mentee-${u.id}`}
                                                    checked={selectedMenteeIds.includes(u.id)}
                                                    onCheckedChange={() => toggleMenteeSelection(u.id)}
                                                />
                                                <label
                                                    htmlFor={`mentee-${u.id}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                >
                                                    {u.name} <span className="text-muted-foreground text-xs">({u.email})</span>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Selected: {selectedMenteeIds.length} users
                                    </p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Create Pairing
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Pairings List */}
            <div className="space-y-8">
                {(Object.entries(familyGroups) as [string, any[]][]).map(([familyName, familyPairings]) => (
                    <div key={familyName}>
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-muted-foreground" />
                            {familyName}
                            <Badge variant="secondary" className="ml-2">
                                {familyPairings.length} pairing{familyPairings.length !== 1 ? 's' : ''}
                            </Badge>
                        </h2>
                        <div className="grid gap-4">
                            {(familyPairings as any[]).map((pairing: any) => (
                                <Card key={pairing.id}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                {/* Pairing Info */}
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                                    {/* Mentor */}
                                                    <div className="flex items-center gap-2 min-w-[200px]">
                                                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                                                            <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm">{pairing.mentor?.name || 'Unknown'}</p>
                                                            <p className="text-xs text-muted-foreground">Mentor</p>
                                                        </div>
                                                    </div>

                                                    <ArrowRight className="hidden sm:block w-4 h-4 text-muted-foreground" />

                                                    {/* Mentees */}
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {pairing.mentees && pairing.mentees.length > 0 ? (
                                                            pairing.mentees.map((mentee: any, i: number) => (
                                                                <div key={mentee.id || i} className="flex items-center gap-2 bg-muted/50 px-2 py-1 rounded-full">
                                                                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 border border-background">
                                                                        <Users className="w-3 h-3 text-muted-foreground" />
                                                                    </div>
                                                                    <span className="text-sm">{mentee.name}</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <span className="text-sm text-muted-foreground italic">No mentees</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Stats Footer */}
                                                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground border-t pt-2">
                                                    <span className="flex items-center gap-1">
                                                        <Trophy className="w-3 h-3 text-amber-500" />
                                                        <span className="font-medium text-foreground">{pairing.totalPoints || 0}</span> total pts
                                                    </span>
                                                    <span>
                                                        {pairing.submissions?.length || 0} submissions
                                                    </span>
                                                    <span>
                                                        Created {pairing.createdAt ? new Date(pairing.createdAt).toLocaleDateString() : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDelete(pairing.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                ))}

                {pairings.length === 0 && (
                    <Card className="text-center py-12">
                        <CardContent>
                            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="font-semibold mb-2">No Pairings Found</h3>
                            <p className="text-muted-foreground">
                                Get started by creating a new mentor-mentee pairing.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
