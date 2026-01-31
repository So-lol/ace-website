import { Metadata } from 'next'
import { NavbarWithAuthClient, Footer } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Megaphone, Pin, Calendar, Clock } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Announcements',
    description: 'Stay updated with the latest ACE program news and events',
}

// Mock data - will be replaced with real data from database
const announcements = [
    {
        id: '1',
        title: 'Week 5 Bonus Activity: Study Session!',
        content: 'This week\'s bonus activity is to have a study session with your pairing! Take a photo together at a library or study space. Remember to tag your submission with the "Study Buddy" bonus when you submit your weekly photo. 📚✨',
        isPinned: true,
        publishedAt: new Date('2026-01-29'),
        author: 'ACE Coordinators'
    },
    {
        id: '2',
        title: 'ACE Family Mixer Event - Save the Date!',
        content: 'Mark your calendars! We\'re hosting a family mixer on February 15th at Coffman Union. This is a great opportunity to meet other ACE families and earn bonus points! More details coming soon.',
        isPinned: true,
        publishedAt: new Date('2026-01-27'),
        author: 'VSAM Events'
    },
    {
        id: '3',
        title: 'Photo Submission Reminder',
        content: 'Don\'t forget to submit your weekly photos by Sunday 11:59 PM! Make sure to select any bonus activities you completed. Late submissions cannot be accepted.',
        isPinned: false,
        publishedAt: new Date('2026-01-25'),
        author: 'ACE Admin'
    },
    {
        id: '4',
        title: 'Week 4 Bonus: Coffee Date ☕',
        content: 'Last week\'s bonus was a coffee date! Great job to everyone who participated. We loved seeing all the creative coffee shop photos!',
        isPinned: false,
        publishedAt: new Date('2026-01-22'),
        author: 'ACE Coordinators'
    },
    {
        id: '5',
        title: 'Welcome to ACE Spring 2026!',
        content: 'Welcome to the Anh Chi Em mentorship program! We\'re so excited to have you all. Get to know your mentor/mentee and family this week. Remember, you can start submitting photos now!',
        isPinned: false,
        publishedAt: new Date('2026-01-15'),
        author: 'ACE Coordinators'
    },
]

function formatDate(date: Date) {
    return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    })
}

function getRelativeTime(date: Date) {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 14) return '1 week ago'
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return formatDate(date)
}

export default function AnnouncementsPage() {
    const pinnedAnnouncements = announcements.filter(a => a.isPinned)
    const regularAnnouncements = announcements.filter(a => !a.isPinned)

    return (
        <div className="min-h-screen flex flex-col">
            <NavbarWithAuthClient />

            <main className="flex-1 py-12">
                <div className="container mx-auto px-4">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FFD700] mb-4">
                            <Megaphone className="w-8 h-8 text-amber-900" />
                        </div>
                        <h1 className="text-4xl font-bold mb-4">Announcements</h1>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            Stay updated with the latest news, events, and bonus activities from the ACE program.
                        </p>
                    </div>

                    <div className="max-w-3xl mx-auto">
                        {/* Pinned Announcements */}
                        {pinnedAnnouncements.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-lg font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                                    <Pin className="w-4 h-4" />
                                    Pinned
                                </h2>
                                <div className="space-y-4">
                                    {pinnedAnnouncements.map((announcement) => (
                                        <Card
                                            key={announcement.id}
                                            className="border-2 border-primary/20 bg-primary/5 card-hover"
                                        >
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Badge className="bg-[#FFD700] text-amber-900 hover:bg-[#FFD700]/90">
                                                                <Pin className="w-3 h-3 mr-1" />
                                                                Pinned
                                                            </Badge>
                                                        </div>
                                                        <CardTitle className="text-xl">{announcement.title}</CardTitle>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-muted-foreground mb-4 whitespace-pre-line">
                                                    {announcement.content}
                                                </p>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        {formatDate(announcement.publishedAt)}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{announcement.author}</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Regular Announcements */}
                        <div>
                            <h2 className="text-lg font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Recent
                            </h2>
                            <div className="space-y-4">
                                {regularAnnouncements.map((announcement) => (
                                    <Card key={announcement.id} className="card-hover">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-xl">{announcement.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-muted-foreground mb-4 whitespace-pre-line">
                                                {announcement.content}
                                            </p>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {getRelativeTime(announcement.publishedAt)}
                                                </span>
                                                <span>•</span>
                                                <span>{announcement.author}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
