import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!authUser?.email) {
            return NextResponse.json(null, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: authUser.email },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            }
        })

        if (!user) {
            return NextResponse.json(null, { status: 404 })
        }

        return NextResponse.json(user)
    } catch (error) {
        console.error('Error fetching user:', error)
        return NextResponse.json(null, { status: 500 })
    }
}
