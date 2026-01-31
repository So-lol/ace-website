import { Metadata } from 'next'
import { AdminHeader } from '@/components/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    title: 'Bonus Activities',
    description: 'Manage weekly bonus activities',
}

// Mock data
const bonusActivities = [
    { id: '1', name: 'Study Session Together', description: 'Take a photo at a library or study space', points: 5, weekNumber: 5, year: 2026, isActive: true, usageCount: 8 },
    { id: '2', name: 'Game Night', description: 'Play video games or board games together', points: 5, weekNumber: 5, year: 2026, isActive: true, usageCount: 5 },
    { id: '3', name: 'Coffee Date', description: 'Get coffee or boba together', points: 5, weekNumber: 4, year: 2026, isActive: false, usageCount: 12 },
    { id: '4', name: 'Cook Together', description: 'Prepare a meal together', points: 5, weekNumber: 3, year: 2026, isActive: false, usageCount: 6 },
    { id: '5', name: 'Outdoor Activity', description: 'Do something outdoors (walk, sports, etc.)', points: 5, weekNumber: 2, year: 2026, isActive: false, usageCount: 9 },
]

export default function BonusesPage() {
    const activeCount = bonusActivities.filter(b => b.isActive).length

    return (
        <>
            <AdminHeader title="Bonus Activities" />

            <main className="p-6">
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
                                <div className="text-2xl font-bold">{bonusActivities.length}</div>
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
                        />
                    </div>
                    <Button className="doraemon-gradient text-white gap-2">
                        <Plus className="w-4 h-4" />
                        Create Bonus Activity
                    </Button>
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
                                    <TableHead className="text-center">Week</TableHead>
                                    <TableHead className="text-center">Usage</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bonusActivities.map((activity) => (
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
                                            Week {activity.weekNumber}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {activity.usageCount} submissions
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
                                                    <DropdownMenuItem>
                                                        <Pencil className="w-4 h-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    {activity.isActive ? (
                                                        <DropdownMenuItem>
                                                            <EyeOff className="w-4 h-4 mr-2" />
                                                            Deactivate
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem>
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            Activate
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
