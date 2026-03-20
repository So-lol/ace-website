import { Metadata } from 'next'
import { AdminHeader } from '@/components/admin'
import { getAnnouncements } from '@/lib/actions/announcements'
import AnnouncementList, { ClientAnnouncement } from './announcement-list'
import { Timestamp } from 'firebase-admin/firestore'

export const metadata: Metadata = {
    title: 'Announcements',
    description: 'Manage program announcements',
}

function toClientDate(value: Timestamp | Date | null | undefined) {
    if (value instanceof Timestamp) {
        return value.toDate()
    }

    return value instanceof Date ? value : null
}

export default async function AnnouncementsPage() {
    const rawAnnouncements = await getAnnouncements(false) // false = fetch all

    const announcements: ClientAnnouncement[] = rawAnnouncements.map((announcement) => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        authorId: announcement.authorId,
        authorName: announcement.authorName,
        isPublished: announcement.isPublished,
        isPinned: announcement.isPinned,
        publishedAt: toClientDate(announcement.publishedAt),
        createdAt: toClientDate(announcement.createdAt) ?? new Date(),
        updatedAt: toClientDate(announcement.updatedAt) ?? new Date(),
    }))

    return (
        <>
            <AdminHeader title="Announcements" />
            <AnnouncementList announcements={announcements} />
        </>
    )
}
