import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import HelpForm from './help-form'

export const metadata: Metadata = {
    title: 'Help',
    description: 'Report an issue to the ACE admin team',
}

export default async function HelpPage() {
    const user = await getAuthenticatedUser()

    if (!user) {
        redirect('/login')
    }

    return <HelpForm />
}
