'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
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
    skipNextSync: () => void
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    firebaseUser: null,
    isLoading: true,
    refreshUser: async () => { },
    getIdToken: async () => null,
    skipNextSync: () => { },
})

export function useAuth() {
    return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [mounted, setMounted] = useState(false)
    // Timestamp-based skip: ignore onIdTokenChanged calls within 5s of login
    const skipUntilRef = useRef<number>(0)

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

    // Call this before login to prevent onIdTokenChanged from racing
    // Uses a timestamp so multiple re-renders can't consume the flag
    const skipNextSync = () => {
        skipUntilRef.current = Date.now() + 5000 // Skip for 5 seconds
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
                const idToken = await currentUser.getIdToken(true)
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

            // If login form is handling the sync, skip this callback.
            // The timestamp approach is more robust than a boolean flag
            // because React re-renders can't accidentally consume it.
            if (Date.now() < skipUntilRef.current) {
                if (!fbUser) setUser(null)
                setIsLoading(false)
                return
            }

            if (fbUser) {
                try {
                    // Only sync user state — do NOT create a new session cookie
                    // on every token change. Cookie creation belongs to the login form.
                    const idToken = await fbUser.getIdToken()
                    const result = await verifyAndSyncUser(idToken)

                    if (result.success && result.user) {
                        setUser(result.user)
                    } else {
                        console.error('Failed to sync user session:', result.error)
                        if (result.error === 'Invalid authentication token') {
                            setUser(null)
                        }
                    }
                } catch (error) {
                    console.error('Error refreshing session:', error)
                }
            } else {
                setUser(null)
            }
            setIsLoading(false)
        })

        return () => unsubscribe()
    }, [mounted])

    return (
        <AuthContext.Provider value={{ user, firebaseUser, isLoading, refreshUser, getIdToken, skipNextSync }}>
            {children}
        </AuthContext.Provider>
    )
}
