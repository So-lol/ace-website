import { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { NavbarWithAuthClient, Footer } from '@/components/layout'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { getUserProfile } from '@/lib/actions/users'
import { UserProfileForm } from '@/components/dashboard/user-profile-form'

export const metadata: Metadata = {
    title: 'Profile',
    description: 'Edit your ACE profile',
}

export default async function ProfilePage() {
    const user = await getAuthenticatedUser()

    if (!user) {
        redirect('/login')
    }

    const profile = await getUserProfile(user.id)

    if (!profile) {
        redirect('/dashboard')
    }

    return (
        <div className="min-h-screen flex flex-col">
            <NavbarWithAuthClient />

            <main className="flex-1 py-8">
                <div className="container mx-auto px-4 max-w-2xl">
                    <div className="mb-6">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
                                <ArrowLeft className="w-4 h-4" />
                                Back to Dashboard
                            </Button>
                        </Link>
                    </div>

                    <UserProfileForm
                        user={{
                            ...profile,
                            createdAt: profile.createdAt?.toMillis() || 0,
                            updatedAt: profile.updatedAt?.toMillis() || 0,
                        }}
                    />
                </div>
            </main>

            <Footer />
        </div>
    )
}
