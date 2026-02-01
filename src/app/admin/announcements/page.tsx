import { Metadata } from 'next'
import { AdminHeader } from '@/components/admin'
import { getAnnouncements } from '@/lib/actions/announcements'
import AnnouncementList from './announcement-list'

export const metadata: Metadata = {
    title: 'Announcements',
    description: 'Manage program announcements',
}

export default async function AnnouncementsPage() {
    const announcements = await getAnnouncements(false) // false = fetch all

    return (
        <>
            <AdminHeader title="Announcements" />
            <AnnouncementList announcements={announcements} />
        </>
    )
}
