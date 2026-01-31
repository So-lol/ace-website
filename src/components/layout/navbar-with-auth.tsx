import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Navbar } from './navbar'

export async function NavbarWithAuth() {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    let user = null

    if (authUser?.email) {
        const dbUser = await prisma.user.findUnique({
            where: { email: authUser.email },
            select: {
                name: true,
                email: true,
                role: true,
            }
        })

        if (dbUser) {
            user = {
                name: dbUser.name,
                email: dbUser.email,
                role: dbUser.role,
            }
        }
    }

    return <Navbar user={user} />
}
