'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { auth } from '@/lib/firebase'
import { onIdTokenChanged, User as FirebaseUser } from 'firebase/auth'
import { verifyAndSyncUser } from '@/lib/actions/auth'

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
        // Cleanup function for onIdTokenChanged is handled in the other useEffect
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

            if (currentUser) {
                // Fetch user profile from API with ID token
                const idToken = await currentUser.getIdToken(true) // Force refresh to ensure latest claims
                const result = await verifyAndSyncUser(idToken)

                if (result.success && result.user) {
                    setUser(result.user)
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

        const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
            setFirebaseUser(fbUser)
            if (fbUser) {
                try {
                    // This creates a reliable sync: 
                    // 1. Get fresh token
                    // 2. Send to server to update cookie (handles expiration)
                    // 3. Get fresh user data
                    const idToken = await fbUser.getIdToken()
                    const result = await verifyAndSyncUser(idToken)

                    if (result.success && result.user) {
                        setUser(result.user)
                    } else {
                        console.error('Failed to sync user session:', result.error)
                        // Don't clear user immediately to avoid flickering if it's just a transient error?
                        // But if token is invalid, we should probably clear.
                        if (result.error === 'Invalid authentication token') {
                            setUser(null)
                        }
                    }
                } catch (error) {
                    console.error('Error refreshing session:', error)
                }
            } else {
                setUser(null)
                // Optional: Call server to clear cookie? 
                // signOut() handles consistent logout.
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
