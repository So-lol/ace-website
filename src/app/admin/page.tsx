import { Metadata } from 'next'
import { AdminHeader } from '@/components/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
    FileImage,
    Calculator,
    Gift,
    Megaphone,
    Users,
    UsersRound,
    ArrowRight,
    TrendingUp,
    Clock,
    CheckCircle2,
    AlertCircle
} from 'lucide-react'

export const metadata: Metadata = {
    title: 'Admin Dashboard',
    description: 'ACE program administration dashboard',
}

// Mock data
const stats = {
    pendingSubmissions: 12,
    pointsThisWeek: 340,
    activeBonuses: 2,
    totalFamilies: 8,
    totalUsers: 48,
    approvedThisWeek: 28
}

const recentSubmissions = [
    { id: '1', pairing: 'Linh N. & Minh T.', family: 'Pho Family', status: 'PENDING', time: '2 hours ago' },
    { id: '2', pairing: 'Hai P. & Tuan V.', family: 'Banh Mi Squad', status: 'PENDING', time: '3 hours ago' },
    { id: '3', pairing: 'Mai H. & Duc B.', family: 'Spring Roll Crew', status: 'APPROVED', time: '5 hours ago' },
]

const recentAnnouncements = [
    { id: '1', title: 'Week 5 Bonus Activity', published: true, date: '2 days ago' },
    { id: '2', title: 'Family Mixer Event', published: true, date: '4 days ago' },
]

export default function AdminDashboardPage() {
    return (
        <>
            <AdminHeader title="Dashboard" />

            <main className="p-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    <Card className="card-hover">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center mb-2">
                                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div className="text-2xl font-bold">{stats.pendingSubmissions}</div>
                                <div className="text-xs text-muted-foreground">Pending Review</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="card-hover">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center mb-2">
                                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="text-2xl font-bold">{stats.approvedThisWeek}</div>
                                <div className="text-xs text-muted-foreground">Approved This Week</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="card-hover">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-10 h-10 rounded-lg doraemon-gradient flex items-center justify-center mb-2">
                                    <TrendingUp className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-2xl font-bold">{stats.pointsThisWeek}</div>
                                <div className="text-xs text-muted-foreground">Points This Week</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="card-hover">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-2">
                                    <Gift className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div className="text-2xl font-bold">{stats.activeBonuses}</div>
                                <div className="text-xs text-muted-foreground">Active Bonuses</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="card-hover">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-2">
                                    <UsersRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="text-2xl font-bold">{stats.totalFamilies}</div>
                                <div className="text-xs text-muted-foreground">Families</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="card-hover">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mb-2">
                                    <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                                <div className="text-xs text-muted-foreground">Total Users</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Pending Submissions */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <FileImage className="w-5 h-5 text-primary" />
                                Recent Submissions
                            </CardTitle>
                            <Link href="/admin/submissions">
                                <Button variant="ghost" size="sm" className="gap-1">
                                    View All
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentSubmissions.map((submission) => (
                                    <div
                                        key={submission.id}
                                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                    >
                                        <div>
                                            <div className="font-medium text-sm">{submission.pairing}</div>
                                            <div className="text-xs text-muted-foreground">{submission.family}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-muted-foreground">{submission.time}</span>
                                            <Badge
                                                variant={submission.status === 'PENDING' ? 'secondary' : 'default'}
                                                className={submission.status === 'APPROVED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}
                                            >
                                                {submission.status === 'PENDING' && <Clock className="w-3 h-3 mr-1" />}
                                                {submission.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                                {submission.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {stats.pendingSubmissions > 0 && (
                                <Link href="/admin/submissions?status=pending">
                                    <Button className="w-full mt-4 doraemon-gradient text-white gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        Review {stats.pendingSubmissions} Pending Submissions
                                    </Button>
                                </Link>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Actions & Announcements */}
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-3">
                                <Link href="/admin/bonuses">
                                    <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                                        <Gift className="w-5 h-5" />
                                        <span className="text-xs">Manage Bonuses</span>
                                    </Button>
                                </Link>
                                <Link href="/admin/announcements">
                                    <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                                        <Megaphone className="w-5 h-5" />
                                        <span className="text-xs">Announcements</span>
                                    </Button>
                                </Link>
                                <Link href="/admin/import">
                                    <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                                        <Users className="w-5 h-5" />
                                        <span className="text-xs">Import Users</span>
                                    </Button>
                                </Link>
                                <Link href="/admin/points">
                                    <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                                        <Calculator className="w-5 h-5" />
                                        <span className="text-xs">Point Adjustments</span>
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* Recent Announcements */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Megaphone className="w-5 h-5 text-[#FFD700]" />
                                    Recent Announcements
                                </CardTitle>
                                <Link href="/admin/announcements">
                                    <Button variant="ghost" size="sm" className="gap-1">
                                        Manage
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </Link>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {recentAnnouncements.map((announcement) => (
                                        <div
                                            key={announcement.id}
                                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                        >
                                            <div>
                                                <div className="font-medium text-sm">{announcement.title}</div>
                                                <div className="text-xs text-muted-foreground">{announcement.date}</div>
                                            </div>
                                            <Badge variant={announcement.published ? 'default' : 'secondary'}>
                                                {announcement.published ? 'Published' : 'Draft'}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </>
    )
}
