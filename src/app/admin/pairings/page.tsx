import { Metadata } from 'next'
import { AdminHeader } from '@/components/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Search,
    Users,
    UserCheck,
    Plus,
    MoreHorizontal,
    ArrowRight,
    Trophy
} from 'lucide-react'
import { getPairings } from '@/lib/actions/pairings'

export const metadata: Metadata = {
    title: 'Pairing Management',
    description: 'Manage mentor-mentee pairings',
}

type PairingWithRelations = Awaited<ReturnType<typeof getPairings>>[0]

function PairingCard({ pairing }: { pairing: PairingWithRelations }) {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        {/* Family Badge */}
                        <div className="flex items-center gap-2 mb-3">
                            <Badge variant="outline" className="text-xs">
                                {pairing.family.name}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                                {pairing.totalPoints} total pts
                            </span>
                        </div>

                        {/* Pairing Members */}
                        <div className="flex items-center gap-4">
                            {/* Mentor */}
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                    <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm">{pairing.mentor.name}</p>
                                    <p className="text-xs text-muted-foreground">Mentor</p>
                                </div>
                            </div>

                            <ArrowRight className="w-4 h-4 text-muted-foreground" />

                            {/* Mentees */}
                            <div className="flex items-center gap-2">
                                {pairing.mentees.map((pm, i) => (
                                    <div key={pm.mentee.id} className="flex items-center gap-2">
                                        {i > 0 && <span className="text-muted-foreground">&</span>}
                                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                            <Users className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{pm.mentee.name}</p>
                                            <p className="text-xs text-muted-foreground">Mentee</p>
                                        </div>
                                    </div>
                                ))}
                                {pairing.mentees.length === 0 && (
                                    <span className="text-sm text-muted-foreground italic">
                                        No mentees assigned
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Trophy className="w-3 h-3" />
                                {pairing.weeklyPoints} pts this week
                            </span>
                            <span>
                                {pairing.submissions.length} submission{pairing.submissions.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>

                    <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

export default async function PairingsPage() {
    const pairings = await getPairings()

    // Group by family
    const familyGroups = pairings.reduce((acc, pairing) => {
        const familyName = pairing.family.name
        if (!acc[familyName]) {
            acc[familyName] = []
        }
        acc[familyName].push(pairing)
        return acc
    }, {} as Record<string, PairingWithRelations[]>)

    return (
        <>
            <AdminHeader title="Pairings" />

            <main className="p-6">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Pairings
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{pairings.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Families
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{Object.keys(familyGroups).length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Points (All)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-primary">
                                {pairings.reduce((sum, p) => sum + p.totalPoints, 0)}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search & Add */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search pairings..."
                            className="pl-10"
                        />
                    </div>
                    <Button className="gap-2">
                        <Plus className="w-4 h-4" />
                        Create Pairing
                    </Button>
                </div>

                {/* Pairings by Family */}
                <div className="space-y-8">
                    {Object.entries(familyGroups).map(([familyName, familyPairings]) => (
                        <div key={familyName}>
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                {familyName}
                                <Badge variant="secondary" className="ml-2">
                                    {familyPairings.length} pairing{familyPairings.length !== 1 ? 's' : ''}
                                </Badge>
                            </h2>
                            <div className="space-y-4">
                                {familyPairings.map(pairing => (
                                    <PairingCard key={pairing.id} pairing={pairing} />
                                ))}
                            </div>
                        </div>
                    ))}

                    {pairings.length === 0 && (
                        <Card className="text-center py-12">
                            <CardContent>
                                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="font-semibold mb-2">No Pairings</h3>
                                <p className="text-muted-foreground mb-4">
                                    Create your first mentor-mentee pairing to get started.
                                </p>
                                <Button className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Create Pairing
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
        </>
    )
}
