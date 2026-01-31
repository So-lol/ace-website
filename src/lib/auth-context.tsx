'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'

interface AuthUser {
    id: string
    name: string
    email: string
    role: string
}

interface AuthContextType {
    user: AuthUser | null
    firebaseUser: FirebaseUser | null
    isLoading: boolean
    refreshUser: () => Promise<void>
    getIdToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    firebaseUser: null,
    isLoading: true,
    refreshUser: async () => { },
    getIdToken: async () => null,
})

export function useAuth() {
    return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const getIdToken = async (): Promise<string | null> => {
        if (!firebaseUser) return null
        try {
            return await firebaseUser.getIdToken()
        } catch (error) {
            console.error('Error getting ID token:', error)
            return null
        }
    }

    const refreshUser = async () => {
        if (typeof window === 'undefined' || !auth) {
            setIsLoading(false)
            return
        }

        try {
            const currentUser = auth.currentUser
            setFirebaseUser(currentUser)

            if (currentUser?.email) {
                // Fetch user profile from API with ID token
                const idToken = await currentUser.getIdToken()
                const response = await fetch('/api/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${idToken}`
                    }
                })
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
            setFirebaseUser(null)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (!mounted || !auth) return

        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            setFirebaseUser(fbUser)
            if (fbUser?.email) {
                // Fetch user profile from database
                try {
                    const idToken = await fbUser.getIdToken()
                    const response = await fetch('/api/auth/me', {
                        headers: {
                            'Authorization': `Bearer ${idToken}`
                        }
                    })
                    if (response.ok) {
                        const userData = await response.json()
                        setUser(userData)
                    } else {
                        setUser(null)
                    }
                } catch (error) {
                    console.error('Error fetching user profile:', error)
                    setUser(null)
                }
            } else {
                setUser(null)
            }
            setIsLoading(false)
        })

        return () => unsubscribe()
    }, [mounted])

    return (
        <AuthContext.Provider value={{ user, firebaseUser, isLoading, refreshUser, getIdToken }}>
            {children}
        </AuthContext.Provider>
    )
}
