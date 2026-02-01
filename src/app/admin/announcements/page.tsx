import { Metadata } from 'next'
import { AdminHeader } from '@/components/admin'
import { getAnnouncements } from '@/lib/actions/announcements'
import AnnouncementList from './announcement-list'

export const metadata: Metadata = {
    title: 'Announcements',
    description: 'Manage program announcements',
}

export default async function AnnouncementsPage() {
    const rawAnnouncements = await getAnnouncements(false) // false = fetch all

    // Convert Timestamps to Dates for Client Component to avoid serialization error
    const announcements = rawAnnouncements.map(a => ({
        ...a,
        createdAt: (a.createdAt as any)?.toDate?.() || a.createdAt,
        updatedAt: (a.updatedAt as any)?.toDate?.() || a.updatedAt,
        publishedAt: (a.publishedAt as any)?.toDate?.() || a.publishedAt,
    }))

    return (
        <>
            <AdminHeader title="Announcements" />
            <AnnouncementList announcements={announcements as any} />
        </>
    )
}
