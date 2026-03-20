'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { auth, isFirebaseClientConfigured } from '@/lib/firebase'
import { signOut as clearServerSession } from '@/lib/actions/auth'
import { reportClientAuthFailure } from '@/lib/actions/auth-observability'
import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    signOut as firebaseSignOut,
    updatePassword,
    verifyBeforeUpdateEmail,
} from 'firebase/auth'
import { toast } from 'sonner'
import { KeyRound, Mail } from 'lucide-react'
import { getAuthActionCodeSettings, normalizeEmail } from '@/lib/auth-utils'
import { FirebaseError } from 'firebase/app'

interface AccountSecurityFormProps {
    email: string
}

function getCurrentUserOrThrow() {
    if (!auth || !isFirebaseClientConfigured) {
        throw new Error('Firebase Authentication is not configured for this environment.')
    }

    const currentUser = auth.currentUser
    if (!currentUser?.email) {
        throw new Error('Please sign in again before changing sensitive account settings.')
    }

    return currentUser
}

export function AccountSecurityForm({ email }: AccountSecurityFormProps) {
    const router = useRouter()
    const [isChangingEmail, setIsChangingEmail] = useState(false)
    const [isChangingPassword, setIsChangingPassword] = useState(false)

    async function handleEmailChange(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        const nextEmail = normalizeEmail(String(formData.get('newEmail') || ''))
        const currentPassword = String(formData.get('emailCurrentPassword') || '')

        if (!nextEmail || !currentPassword) {
            toast.error('New email and current password are required.')
            return
        }

        if (nextEmail === normalizeEmail(email)) {
            toast.error('Enter a different email address.')
            return
        }

        setIsChangingEmail(true)

        try {
            const currentUser = getCurrentUserOrThrow()
            const credential = EmailAuthProvider.credential(currentUser.email!, currentPassword)

            await reauthenticateWithCredential(currentUser, credential)
            const actionCodeSettings = getAuthActionCodeSettings(window.location.origin) || undefined
            await verifyBeforeUpdateEmail(currentUser, nextEmail, actionCodeSettings)

            toast.success('Verification sent to your new email address. The change will not take effect until that link is used.')
        } catch (error: unknown) {
            const authError = error as FirebaseError
            await reportClientAuthFailure({
                type: 'email_change_failure',
                route: '/profile',
                email,
                uid: auth?.currentUser?.uid || null,
                errorCode: authError.code || 'auth/unknown',
                errorMessage: authError.message || 'Email change flow failed.',
            })
            if (authError.code === 'auth/invalid-email') {
                toast.error('Enter a valid email address.')
            } else if (authError.code === 'auth/email-already-in-use') {
                toast.error('That email address is already in use.')
            } else if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/wrong-password') {
                toast.error('Current password is incorrect.')
            } else if (authError.code === 'auth/too-many-requests') {
                toast.error('Too many attempts. Please wait before trying again.')
            } else {
                console.error('Email change failed:', error)
                toast.error('Failed to start the email change flow.')
            }
        } finally {
            setIsChangingEmail(false)
        }
    }

    async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        const currentPassword = String(formData.get('passwordCurrentPassword') || '')
        const newPassword = String(formData.get('newPassword') || '')
        const confirmPassword = String(formData.get('confirmPassword') || '')

        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error('All password fields are required.')
            return
        }

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match.')
            return
        }

        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters.')
            return
        }

        setIsChangingPassword(true)

        try {
            const currentUser = getCurrentUserOrThrow()
            const credential = EmailAuthProvider.credential(currentUser.email!, currentPassword)

            await reauthenticateWithCredential(currentUser, credential)
            await updatePassword(currentUser, newPassword)
            await clearServerSession()
            if (auth) {
                await firebaseSignOut(auth)
            }

            router.push('/login?message=password-reset-success')
        } catch (error: unknown) {
            const authError = error as FirebaseError
            await reportClientAuthFailure({
                type: 'password_change_failure',
                route: '/profile',
                email,
                uid: auth?.currentUser?.uid || null,
                errorCode: authError.code || 'auth/unknown',
                errorMessage: authError.message || 'Password change flow failed.',
            })
            if (authError.code === 'auth/weak-password') {
                toast.error('Password is too weak.')
            } else if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/wrong-password') {
                toast.error('Current password is incorrect.')
            } else if (authError.code === 'auth/too-many-requests') {
                toast.error('Too many attempts. Please wait before trying again.')
            } else {
                console.error('Password change failed:', error)
                toast.error('Failed to change password.')
            }
        } finally {
            setIsChangingPassword(false)
        }
    }

    return (
        <div className="space-y-6">
            <Card className="doraemon-shadow border-none">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-primary" />
                        Change Email
                    </CardTitle>
                    <CardDescription>
                        Sensitive changes require your current password and a verification step on the new email address.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleEmailChange} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="currentEmail">Current Email</Label>
                            <Input id="currentEmail" value={email} readOnly className="h-11 bg-muted" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newEmail">New Email</Label>
                            <Input id="newEmail" name="newEmail" type="email" className="h-11" placeholder="new.email@example.com" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="emailCurrentPassword">Current Password</Label>
                            <Input id="emailCurrentPassword" name="emailCurrentPassword" type="password" className="h-11" />
                        </div>
                        <Button type="submit" disabled={isChangingEmail}>
                            {isChangingEmail ? 'Sending verification...' : 'Send Email Change Verification'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="doraemon-shadow border-none">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <KeyRound className="w-5 h-5 text-primary" />
                        Change Password
                    </CardTitle>
                    <CardDescription>
                        Password changes reauthenticate the account and revoke the current server session.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="passwordCurrentPassword">Current Password</Label>
                            <Input id="passwordCurrentPassword" name="passwordCurrentPassword" type="password" className="h-11" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input id="newPassword" name="newPassword" type="password" minLength={8} className="h-11" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input id="confirmPassword" name="confirmPassword" type="password" minLength={8} className="h-11" />
                        </div>
                        <Button type="submit" disabled={isChangingPassword}>
                            {isChangingPassword ? 'Updating password...' : 'Update Password'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
