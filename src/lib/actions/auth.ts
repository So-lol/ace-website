'use server'

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export type AuthResult = {
    success: boolean
    error?: string
    redirectTo?: string
}

export async function signUp(formData: FormData): Promise<AuthResult> {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    const name = formData.get('name') as string

    // Validation
    if (!email || !password || !name) {
        return { success: false, error: 'All fields are required' }
    }

    if (password !== confirmPassword) {
        return { success: false, error: 'Passwords do not match' }
    }

    if (password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters' }
    }

    // Check if user already exists in our database
    const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
    })

    if (existingUser) {
        return { success: false, error: 'An account with this email already exists' }
    }

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password,
        options: {
            data: {
                name,
            },
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
    })

    if (error) {
        console.error('Supabase signup error:', error)
        return { success: false, error: error.message }
    }

    if (!data.user) {
        return { success: false, error: 'Failed to create account' }
    }

    // Create user in our database
    try {
        await prisma.user.create({
            data: {
                id: data.user.id,
                email: email.toLowerCase(),
                name,
                role: 'MENTEE', // Default role, admin can change later
            },
        })
    } catch (dbError) {
        console.error('Database user creation error:', dbError)
        // If database creation fails, we should ideally clean up the Supabase user
        // For now, we'll just return an error
        return { success: false, error: 'Failed to create user profile' }
    }

    // Check if email confirmation is required
    if (data.user.identities?.length === 0) {
        return {
            success: true,
            redirectTo: '/login?message=check-email'
        }
    }

    revalidatePath('/', 'layout')
    return { success: true, redirectTo: '/dashboard' }
}

export async function signIn(formData: FormData): Promise<AuthResult> {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const redirectPath = formData.get('redirect') as string | null

    // Validation
    if (!email || !password) {
        return { success: false, error: 'Email and password are required' }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
    })

    if (error) {
        console.error('Supabase signin error:', error)
        if (error.message.includes('Invalid login credentials')) {
            return { success: false, error: 'Invalid email or password' }
        }
        return { success: false, error: error.message }
    }

    if (!data.user) {
        return { success: false, error: 'Failed to sign in' }
    }

    // Ensure user exists in our database
    const dbUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
    })

    if (!dbUser) {
        // Create user in database if they exist in Supabase but not in our DB
        // This handles cases where users were created directly in Supabase
        await prisma.user.create({
            data: {
                id: data.user.id,
                email: email.toLowerCase(),
                name: data.user.user_metadata?.name || email.split('@')[0],
                role: 'MENTEE',
            },
        })
    }

    revalidatePath('/', 'layout')
    return { success: true, redirectTo: redirectPath || '/dashboard' }
}

export async function signOut(): Promise<void> {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/')
}

export async function resetPassword(formData: FormData): Promise<AuthResult> {
    const supabase = await createClient()

    const email = formData.get('email') as string

    if (!email) {
        return { success: false, error: 'Email is required' }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    })

    if (error) {
        console.error('Password reset error:', error)
        return { success: false, error: error.message }
    }

    return {
        success: true,
        redirectTo: '/login?message=reset-email-sent'
    }
}

export async function updatePassword(formData: FormData): Promise<AuthResult> {
    const supabase = await createClient()

    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!password || !confirmPassword) {
        return { success: false, error: 'All fields are required' }
    }

    if (password !== confirmPassword) {
        return { success: false, error: 'Passwords do not match' }
    }

    if (password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters' }
    }

    const { error } = await supabase.auth.updateUser({
        password,
    })

    if (error) {
        console.error('Password update error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/', 'layout')
    return { success: true, redirectTo: '/dashboard?message=password-updated' }
}
