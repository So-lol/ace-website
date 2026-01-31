import { Metadata } from 'next'
import Link from 'next/link'
import { NavbarWithAuthClient, Footer } from '@/components/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Camera,
    FileText,
    Trophy,
    Users,
    ArrowRight,
    Clock,
    CheckCircle2,
    XCircle,
    CalendarDays
} from 'lucide-react'

export const metadata: Metadata = {
    title: 'Dashboard',
    description: 'Your ACE dashboard',
}

// Mock data - will be replaced with real data
const mockUser = {
    name: 'Linh Nguyen',
    role: 'MENTOR',
    family: {
        name: 'Pho Family',
        rank: 1
    },
    pairing: {
        mentees: ['Minh Tran', 'An Le']
    }
}

const mockStats = {
    weekNumber: 5,
    year: 2026,
    totalPoints: 280,
    submissionsCount: 4,
    hasSubmittedThisWeek: false
}

const recentSubmissions = [
    { id: '1', weekNumber: 4, status: 'APPROVED', points: 15, date: '2026-01-22' },
    { id: '2', weekNumber: 3, status: 'APPROVED', points: 10, date: '2026-01-15' },
    { id: '3', weekNumber: 2, status: 'APPROVED', points: 15, date: '2026-01-08' },
]

function getStatusBadge(status: string) {
    switch (status) {
        case 'APPROVED':
            return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>
        case 'REJECTED':
            return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
        case 'PENDING':
        default:
            return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
    }
}

export default function DashboardPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <NavbarWithAuthClient />

            <main className="flex-1 py-8">
                <div className="container mx-auto px-4">
                    {/* Welcome Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold mb-2">
                            Welcome back, {mockUser.name.split(' ')[0]}! 👋
                        </h1>
                        <p className="text-muted-foreground">
                            {mockUser.role === 'MENTOR' ? 'Anh/Chị' : 'Em'} • {mockUser.family.name}
                        </p>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <CalendarDays className="w-8 h-8 mx-auto mb-2 text-primary" />
                                    <div className="text-2xl font-bold">Week {mockStats.weekNumber}</div>
                                    <div className="text-xs text-muted-foreground">Current Week</div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <Trophy className="w-8 h-8 mx-auto mb-2 text-[#FFD700]" />
                                    <div className="text-2xl font-bold">{mockStats.totalPoints}</div>
                                    <div className="text-xs text-muted-foreground">Total Points</div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <Camera className="w-8 h-8 mx-auto mb-2 text-primary" />
                                    <div className="text-2xl font-bold">{mockStats.submissionsCount}</div>
                                    <div className="text-xs text-muted-foreground">Submissions</div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <Users className="w-8 h-8 mx-auto mb-2 text-[#E60012]" />
                                    <div className="text-2xl font-bold">#{mockUser.family.rank}</div>
                                    <div className="text-xs text-muted-foreground">Family Rank</div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Weekly Submission Card */}
                        <Card className="md:row-span-2 border-2 border-primary/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Camera className="w-5 h-5 text-primary" />
                                    Weekly Submission
                                </CardTitle>
                                <CardDescription>
                                    Week {mockStats.weekNumber} • Ends Sunday 11:59 PM
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {mockStats.hasSubmittedThisWeek ? (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                                        </div>
                                        <h3 className="font-semibold mb-2">All Done!</h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            You&apos;ve already submitted your photo for this week.
                                        </p>
                                        <Link href="/dashboard/submissions">
                                            <Button variant="outline" className="gap-2">
                                                View Submission
                                                <ArrowRight className="w-4 h-4" />
                                            </Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 rounded-full doraemon-gradient flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                                            <Camera className="w-8 h-8 text-white" />
                                        </div>
                                        <h3 className="font-semibold mb-2">Time to Submit!</h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Don&apos;t forget to submit your weekly photo with your Em(s).
                                        </p>
                                        <Link href="/dashboard/submit">
                                            <Button className="gap-2 doraemon-gradient text-white">
                                                Submit Photo
                                                <ArrowRight className="w-4 h-4" />
                                            </Button>
                                        </Link>
                                    </div>
                                )}

                                <div className="border-t pt-4 mt-4">
                                    <h4 className="font-semibold text-sm mb-3">This Week&apos;s Bonus Activities</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                            <span className="text-sm">📚 Study Session Together</span>
                                            <Badge variant="secondary">+5 pts</Badge>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                            <span className="text-sm">🎮 Game Night</span>
                                            <Badge variant="secondary">+5 pts</Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Pairing Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-primary" />
                                    Your Pairing
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-sm text-muted-foreground mb-1">Mentor (You)</div>
                                        <div className="font-medium">{mockUser.name}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground mb-1">
                                            {mockUser.pairing.mentees.length > 1 ? 'Mentees' : 'Mentee'}
                                        </div>
                                        <div className="font-medium">
                                            {mockUser.pairing.mentees.join(' & ')}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground mb-1">Family</div>
                                        <div className="font-medium flex items-center gap-2">
                                            {mockUser.family.name}
                                            <Badge variant="outline" className="text-xs">
                                                Rank #{mockUser.family.rank}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Submissions */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-primary" />
                                    Recent Submissions
                                </CardTitle>
                                <Link href="/dashboard/submissions">
                                    <Button variant="ghost" size="sm" className="gap-1">
                                        View All
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </Link>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {recentSubmissions.map((submission) => (
                                        <div
                                            key={submission.id}
                                            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                                        >
                                            <div>
                                                <div className="font-medium text-sm">Week {submission.weekNumber}</div>
                                                <div className="text-xs text-muted-foreground">{submission.date}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getStatusBadge(submission.status)}
                                                {submission.status === 'APPROVED' && (
                                                    <span className="text-sm font-semibold text-primary">
                                                        +{submission.points}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
