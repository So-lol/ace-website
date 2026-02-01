import { Metadata } from 'next'
import { AdminHeader } from '@/components/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Search,
    Users,
    UserCheck,
    Shield,
} from 'lucide-react'
import { getUsers } from '@/lib/actions/users'
import { getFamilies } from '@/lib/actions/families'
import AddUserForm from './add-user-form'
import UserCard from './user-card'

export const metadata: Metadata = {
    title: 'User Management',
    description: 'Manage users and roles',
}

export default async function UsersPage() {
    const [users, families] = await Promise.all([
        getUsers(),
        getFamilies()
    ])

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
                    <AddUserForm families={families} />
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
