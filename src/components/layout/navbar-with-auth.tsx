import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { Navbar } from './navbar'

export async function NavbarWithAuth() {
    // getAuthenticatedUser now returns data from Firestore (via helpers)
    const authUser = await getAuthenticatedUser()

    // Navbar expects { name, email, role }
    // authUser matches this shape (AuthenticatedUser interface)
    // We map it to handle potential nulls for specific fields

    let user = null

    if (authUser) {
        user = {
            name: authUser.name,
            email: authUser.email,
            role: authUser.role,
        }
    }

    return <Navbar user={user} />
}
