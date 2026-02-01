'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    MoreHorizontal,
    Mail,
    Calendar,
    Shield,
    UserCheck,
    Users,
    Pencil,
    Trash2,
    UserCog,
    Loader2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { updateUserRole, deleteUser } from '@/lib/actions/users'
import { toast } from 'sonner'

interface Family {
    id: string
    name: string
}

interface User {
    id: string
    name: string
    email: string
    role: string
    family: Family | null
    createdAt: Date
}

interface UserCardProps {
    user: User
}

function getRoleBadge(role: string) {
    switch (role) {
        case 'ADMIN':
            return (
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 gap-1">
                    <Shield className="w-3 h-3" />
                    Admin
                </Badge>
            )
        case 'MENTOR':
            return (
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 gap-1">
                    <UserCheck className="w-3 h-3" />
                    Mentor
                </Badge>
            )
        case 'MENTEE':
            return (
                <Badge variant="secondary" className="gap-1">
                    <Users className="w-3 h-3" />
                    Mentee
                </Badge>
            )
        default:
            return <Badge variant="outline">{role}</Badge>
    }
}

export default function UserCard({ user }: UserCardProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)

    const handleRoleChange = async (newRole: 'ADMIN' | 'MENTOR' | 'MENTEE') => {
        if (newRole === user.role) return
        setIsLoading(true)
        try {
            const result = await updateUserRole(user.id, newRole)
            if (result.success) {
                toast.success(`Role updated to ${newRole}`)
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to update role')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async () => {
        setIsLoading(true)
        try {
            const result = await deleteUser(user.id)
            if (result.success) {
                toast.success('User deleted')
                setIsDeleteOpen(false)
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to delete user')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-semibold text-lg">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-semibold">{user.name}</h3>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                                    <Mail className="w-3 h-3" />
                                    {user.email}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {getRoleBadge(user.role)}
                                    {user.family && (
                                        <Badge variant="outline">{user.family.name}</Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="text-right text-xs text-muted-foreground mr-2">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                                </div>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled={isLoading}>
                                        {isLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <MoreHorizontal className="w-4 h-4" />
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            <UserCog className="w-4 h-4 mr-2" />
                                            Change Role
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                            <DropdownMenuItem
                                                onClick={() => handleRoleChange('ADMIN')}
                                                className={user.role === 'ADMIN' ? 'bg-accent' : ''}
                                            >
                                                <Shield className="w-4 h-4 mr-2 text-purple-600" />
                                                Admin
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleRoleChange('MENTOR')}
                                                className={user.role === 'MENTOR' ? 'bg-accent' : ''}
                                            >
                                                <UserCheck className="w-4 h-4 mr-2 text-blue-600" />
                                                Mentor
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleRoleChange('MENTEE')}
                                                className={user.role === 'MENTEE' ? 'bg-accent' : ''}
                                            >
                                                <Users className="w-4 h-4 mr-2" />
                                                Mentee
                                            </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => setIsDeleteOpen(true)}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete User
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{user.name}</strong>? This will remove their account from Firebase Auth and Firestore. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Delete User
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
