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
    AlertCircle,
    Image
} from 'lucide-react'
import { getAdminStats } from '@/lib/actions/stats'
import { getSubmissions } from '@/lib/actions/submissions'
import { getAnnouncements } from '@/lib/actions/announcements'

export const metadata: Metadata = {
    title: 'Admin Dashboard',
    description: 'ACE program administration dashboard',
}

function formatTimeAgo(date: Date) {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
}

export default async function AdminDashboardPage() {
    const [stats, submissions, announcements] = await Promise.all([
        getAdminStats(),
        getSubmissions(),
        getAnnouncements(false)
    ])

    const recentSubmissions = submissions.slice(0, 5)
    // Filter out pinned announcements for "Recent" list if desired, but just showing latest 5 is fine
    const recentAnnouncements = announcements.slice(0, 5)

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
                    {/* Recent Submissions */}
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
                                {recentSubmissions.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-4">No recent submissions.</p>
                                ) : (
                                    recentSubmissions.map((submission) => (
                                        <div
                                            key={submission.id}
                                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                        >
                                            <div>
                                                <div className="font-medium text-sm">
                                                    {submission.pairing ?
                                                        `${submission.pairing.mentor?.name?.split(' ').pop()} & ${submission.pairing.menteeIds?.length} Mentees`
                                                        : 'Unknown Pairing'}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {submission.pairing?.family?.name || 'Unknown Family'} • Week {submission.weekNumber}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-muted-foreground">
                                                    {formatTimeAgo(submission.createdAt)}
                                                </span>
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
                                    ))
                                )}
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

                    {/* Quick Actions & Recent Announcements */}
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
                                <Link href="/admin/media">
                                    <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                                        <Image className="w-5 h-5" />
                                        <span className="text-xs">Media Management</span>
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
                                    {recentAnnouncements.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-4">No recent announcements.</p>
                                    ) : (
                                        recentAnnouncements.map((announcement) => (
                                            <div
                                                key={announcement.id}
                                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                            >
                                                <div>
                                                    <div className="font-medium text-sm">{announcement.title}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {formatTimeAgo(announcement.publishedAt ? announcement.publishedAt.toDate() : announcement.createdAt.toDate())}
                                                    </div>
                                                </div>
                                                <Badge variant={announcement.isPublished ? 'default' : 'secondary'}>
                                                    {announcement.isPublished ? 'Published' : 'Draft'}
                                                </Badge>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </>
    )
}
