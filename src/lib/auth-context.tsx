'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthUser {
    id: string
    name: string
    email: string
    role: string
}

interface AuthContextType {
    user: AuthUser | null
    authUser: User | null
    isLoading: boolean
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    authUser: null,
    isLoading: true,
    refreshUser: async () => { },
})

export function useAuth() {
    return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [authUser, setAuthUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const refreshUser = async () => {
        if (typeof window === 'undefined') {
            setIsLoading(false)
            return
        }

        try {
            const supabase = createClient()
            const { data: { user: authUserData } } = await supabase.auth.getUser()

            setAuthUser(authUserData)

            if (authUserData?.email) {
                // Fetch user profile from API
                const response = await fetch('/api/auth/me')
                if (response.ok) {
                    const userData = await response.json()
                    setUser(userData)
                } else {
                    setUser(null)
                }
            } else {
                setUser(null)
            }
        } catch (error) {
            console.error('Error refreshing user:', error)
            setUser(null)
            setAuthUser(null)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (!mounted) return

        refreshUser()

        const supabase = createClient()
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                refreshUser()
            } else {
                setUser(null)
                setAuthUser(null)
                setIsLoading(false)
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [mounted])

    return (
        <AuthContext.Provider value={{ user, authUser, isLoading, refreshUser }}>
            {children}
        </AuthContext.Provider>
    )
}
