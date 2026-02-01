import { Metadata } from 'next'
import { NavbarWithAuthClient, Footer } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, Calendar, Pin, User } from 'lucide-react'
import { getAnnouncements } from '@/lib/actions/announcements'
import { AnnouncementDoc } from '@/types/firestore'

export const metadata: Metadata = {
    title: 'Announcements',
    description: 'Latest updates and news from ACE',
}

export default async function AnnouncementsPage() {
    const announcements = await getAnnouncements(true) // true = published only

    return (
        <div className="min-h-screen flex flex-col">
            <NavbarWithAuthClient />

            <main className="flex-1 py-12">
                <div className="container mx-auto px-4 max-w-3xl">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl doraemon-gradient mb-4">
                            <Bell className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-4xl font-bold mb-4">Announcements</h1>
                        <p className="text-muted-foreground">
                            Stay up to date with the latest news and events
                        </p>
                    </div>

                    <div className="space-y-6">
                        {announcements.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                No announcements yet.
                            </div>
                        ) : (
                            announcements.map((announcement) => (
                                <Card key={announcement.id} className="overflow-hidden">
                                    <div className={`h-2 ${announcement.isPinned ? 'doraemon-gradient' : 'bg-muted'}`} />
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-1">
                                                {announcement.isPinned && (
                                                    <Badge variant="secondary" className="mb-2 gap-1 w-fit">
                                                        <Pin className="w-3 h-3" /> Pinned
                                                    </Badge>
                                                )}
                                                <CardTitle className="text-xl">
                                                    {announcement.title}
                                                </CardTitle>
                                            </div>
                                            {announcement.publishedAt && (
                                                <div className="flex items-center text-sm text-muted-foreground whitespace-nowrap">
                                                    <Calendar className="w-4 h-4 mr-1" />
                                                    {new Date(announcement.publishedAt.toDate()).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="prose dark:prose-invert max-w-none text-muted-foreground mb-4">
                                            <p className="whitespace-pre-wrap">{announcement.content}</p>
                                        </div>
                                        <div className="flex items-center text-sm text-muted-foreground pt-4 border-t">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <span>Posted by <span className="font-medium text-foreground">{announcement.authorName}</span></span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
