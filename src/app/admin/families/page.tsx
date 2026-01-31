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
    Users,
    Trophy,
    Pencil,
    Archive,
    Trash2
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export const metadata: Metadata = {
    title: 'Manage Families',
    description: 'Manage ACE family groups',
}

// Mock data
const families = [
    { id: '1', name: 'Pho Family', memberCount: 8, pairingCount: 3, totalPoints: 850, isArchived: false },
    { id: '2', name: 'Banh Mi Squad', memberCount: 6, pairingCount: 2, totalPoints: 720, isArchived: false },
    { id: '3', name: 'Spring Roll Crew', memberCount: 8, pairingCount: 3, totalPoints: 680, isArchived: false },
    { id: '4', name: 'Boba Gang', memberCount: 6, pairingCount: 2, totalPoints: 590, isArchived: false },
    { id: '5', name: 'Nem Nuong Nation', memberCount: 6, pairingCount: 2, totalPoints: 520, isArchived: false },
    { id: '6', name: 'Sticky Rice Team', memberCount: 4, pairingCount: 1, totalPoints: 280, isArchived: false },
    { id: '7', name: 'Old Family 2024', memberCount: 6, pairingCount: 2, totalPoints: 1200, isArchived: true },
]

export default function FamiliesPage() {
    const activeFamilies = families.filter(f => !f.isArchived)
    const archivedFamilies = families.filter(f => f.isArchived)

    return (
        <>
            <AdminHeader title="Families" />

            <main className="p-6">
                {/* Actions Bar */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search families..."
                            className="pl-10"
                        />
                    </div>
                    <Button className="doraemon-gradient text-white gap-2">
                        <Plus className="w-4 h-4" />
                        Create Family
                    </Button>
                </div>

                {/* Families Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Family Name</TableHead>
                                    <TableHead className="text-center">Members</TableHead>
                                    <TableHead className="text-center">Pairings</TableHead>
                                    <TableHead className="text-center">Points</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activeFamilies.map((family) => (
                                    <TableRow key={family.id}>
                                        <TableCell className="font-medium">{family.name}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Users className="w-4 h-4 text-muted-foreground" />
                                                {family.memberCount}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">{family.pairingCount}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Trophy className="w-4 h-4 text-[#FFD700]" />
                                                {family.totalPoints}
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
                                                    <DropdownMenuItem>
                                                        <Pencil className="w-4 h-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <Users className="w-4 h-4 mr-2" />
                                                        View Members
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-amber-600">
                                                        <Archive className="w-4 h-4 mr-2" />
                                                        Archive
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
                                            <TableHead className="text-center">Pairings</TableHead>
                                            <TableHead className="text-center">Final Points</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {archivedFamilies.map((family) => (
                                            <TableRow key={family.id} className="opacity-60">
                                                <TableCell className="font-medium">{family.name}</TableCell>
                                                <TableCell className="text-center">{family.memberCount}</TableCell>
                                                <TableCell className="text-center">{family.pairingCount}</TableCell>
                                                <TableCell className="text-center">{family.totalPoints}</TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem>
                                                                <Archive className="w-4 h-4 mr-2" />
                                                                Restore
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-destructive">
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
            </main>
        </>
    )
}
