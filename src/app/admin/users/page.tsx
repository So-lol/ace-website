import { Metadata } from 'next'
import { AdminHeader } from '@/components/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Search,
    Users,
    UserCheck,
    UserCog,
    Shield,
    MoreHorizontal,
    Mail,
    Calendar
} from 'lucide-react'
import { getUsers } from '@/lib/actions/users'
import { formatDistanceToNow } from 'date-fns'

export const metadata: Metadata = {
    title: 'User Management',
    description: 'Manage users and roles',
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

type UserWithRelations = Awaited<ReturnType<typeof getUsers>>[0]

function UserCard({ user }: { user: UserWithRelations }) {
    return (
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
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default async function UsersPage() {
    const users = await getUsers()

    const admins = users.filter(u => u.role === 'ADMIN')
    const mentors = users.filter(u => u.role === 'MENTOR')
    const mentees = users.filter(u => u.role === 'MENTEE')

    return (
        <>
            <AdminHeader title="Users" />

            <main className="p-6">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Users
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{users.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Admins
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-600">{admins.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Mentors
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{mentors.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Mentees
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{mentees.length}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or email..."
                            className="pl-10"
                        />
                    </div>
                    <Button className="gap-2">
                        <UserCog className="w-4 h-4" />
                        Add User
                    </Button>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="all" className="w-full">
                    <TabsList className="mb-6">
                        <TabsTrigger value="all">All ({users.length})</TabsTrigger>
                        <TabsTrigger value="admins" className="gap-2">
                            <Shield className="w-4 h-4" />
                            Admins ({admins.length})
                        </TabsTrigger>
                        <TabsTrigger value="mentors" className="gap-2">
                            <UserCheck className="w-4 h-4" />
                            Mentors ({mentors.length})
                        </TabsTrigger>
                        <TabsTrigger value="mentees" className="gap-2">
                            <Users className="w-4 h-4" />
                            Mentees ({mentees.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="space-y-4">
                        {users.map(user => (
                            <UserCard key={user.id} user={user} />
                        ))}
                        {users.length === 0 && (
                            <Card className="text-center py-12">
                                <CardContent>
                                    <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                    <h3 className="font-semibold mb-2">No Users</h3>
                                    <p className="text-muted-foreground">
                                        No users have signed up yet.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="admins" className="space-y-4">
                        {admins.map(user => (
                            <UserCard key={user.id} user={user} />
                        ))}
                    </TabsContent>

                    <TabsContent value="mentors" className="space-y-4">
                        {mentors.map(user => (
                            <UserCard key={user.id} user={user} />
                        ))}
                    </TabsContent>

                    <TabsContent value="mentees" className="space-y-4">
                        {mentees.map(user => (
                            <UserCard key={user.id} user={user} />
                        ))}
                    </TabsContent>
                </Tabs>
            </main>
        </>
    )
}
