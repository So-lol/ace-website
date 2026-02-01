import { Metadata } from 'next'
import { AdminHeader } from '@/components/admin'
import { getSubmissions } from '@/lib/actions/submissions'
import SubmissionList from './submission-list'

export const metadata: Metadata = {
    title: 'Review Submissions',
    description: 'Review and approve photo submissions',
}

export default async function SubmissionsPage() {
    const submissions = await getSubmissions()

    return (
        <>
            <AdminHeader title="Review Submissions" />
            <SubmissionList submissions={submissions} />
        </>
    )
}
