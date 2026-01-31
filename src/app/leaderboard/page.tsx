import { Metadata } from 'next'
import { NavbarWithAuthClient, Footer } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Trophy, Users, Medal, Crown, Award } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Leaderboard',
    description: 'See the top performing families and pairings in the ACE program',
}

// Mock data - will be replaced with real data from database
const topFamilies = [
    { id: '1', name: 'Pho Family', totalPoints: 850, memberCount: 8, rank: 1 },
    { id: '2', name: 'Banh Mi Squad', totalPoints: 720, memberCount: 6, rank: 2 },
    { id: '3', name: 'Spring Roll Crew', totalPoints: 680, memberCount: 8, rank: 3 },
    { id: '4', name: 'Boba Gang', totalPoints: 590, memberCount: 6, rank: 4 },
    { id: '5', name: 'Nem Nuong Nation', totalPoints: 520, memberCount: 6, rank: 5 },
]

const topPairings = [
    { id: '1', mentorName: 'Linh Nguyen', menteeNames: ['Minh Tran', 'An Le'], familyName: 'Pho Family', totalPoints: 280, rank: 1 },
    { id: '2', mentorName: 'Hai Pham', menteeNames: ['Tuan Vo'], familyName: 'Banh Mi Squad', totalPoints: 260, rank: 2 },
    { id: '3', mentorName: 'Mai Hoang', menteeNames: ['Duc Bui', 'Hoa Dang'], familyName: 'Spring Roll Crew', totalPoints: 245, rank: 3 },
    { id: '4', mentorName: 'Khoa Do', menteeNames: ['Vy Lam'], familyName: 'Pho Family', totalPoints: 230, rank: 4 },
    { id: '5', mentorName: 'Thao Le', menteeNames: ['Nam Trinh', 'Quynh Dinh'], familyName: 'Boba Gang', totalPoints: 215, rank: 5 },
]

function getRankIcon(rank: number) {
    switch (rank) {
        case 1:
            return <Crown className="w-6 h-6 text-yellow-500" />
        case 2:
            return <Medal className="w-6 h-6 text-gray-400" />
        case 3:
            return <Award className="w-6 h-6 text-amber-600" />
        default:
            return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>
    }
}

function getRankBg(rank: number) {
    switch (rank) {
        case 1:
            return 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-200 dark:border-yellow-800'
        case 2:
            return 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20 border-gray-200 dark:border-gray-800'
        case 3:
            return 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800'
        default:
            return ''
    }
}

export default function LeaderboardPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <NavbarWithAuthClient />

            <main className="flex-1 py-12">
                <div className="container mx-auto px-4">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl doraemon-gradient mb-4">
                            <Trophy className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-4xl font-bold mb-4">Leaderboard</h1>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            See which families and pairings are leading the competition!
                            Points are earned through weekly photo submissions and bonus activities.
                        </p>
                    </div>

                    {/* Leaderboard Tabs */}
                    <Tabs defaultValue="families" className="max-w-4xl mx-auto">
                        <TabsList className="grid w-full grid-cols-2 mb-8">
                            <TabsTrigger value="families" className="gap-2">
                                <Users className="w-4 h-4" />
                                Top Families
                            </TabsTrigger>
                            <TabsTrigger value="pairings" className="gap-2">
                                <Trophy className="w-4 h-4" />
                                Top Pairings
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="families" className="space-y-4">
                            {topFamilies.map((family) => (
                                <Card
                                    key={family.id}
                                    className={`card-hover transition-all ${getRankBg(family.rank)}`}
                                >
                                    <CardContent className="flex items-center gap-4 py-4">
                                        <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center border">
                                            {getRankIcon(family.rank)}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg">{family.name}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {family.memberCount} members
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-primary">{family.totalPoints}</div>
                                            <div className="text-xs text-muted-foreground">points</div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </TabsContent>

                        <TabsContent value="pairings" className="space-y-4">
                            {topPairings.map((pairing) => (
                                <Card
                                    key={pairing.id}
                                    className={`card-hover transition-all ${getRankBg(pairing.rank)}`}
                                >
                                    <CardContent className="flex items-center gap-4 py-4">
                                        <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center border">
                                            {getRankIcon(pairing.rank)}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg">
                                                {pairing.mentorName} &amp; {pairing.menteeNames.join(', ')}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="secondary" className="text-xs">
                                                    {pairing.familyName}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-primary">{pairing.totalPoints}</div>
                                            <div className="text-xs text-muted-foreground">points</div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </TabsContent>
                    </Tabs>

                    {/* Points Explanation */}
                    <Card className="max-w-4xl mx-auto mt-12">
                        <CardHeader>
                            <CardTitle className="text-center">How Points Work</CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-3 gap-6 text-center">
                            <div>
                                <div className="w-12 h-12 rounded-full doraemon-gradient flex items-center justify-center mx-auto mb-3">
                                    <span className="text-white font-bold">10</span>
                                </div>
                                <h4 className="font-semibold mb-1">Weekly Photo</h4>
                                <p className="text-sm text-muted-foreground">
                                    Base points for submitting a weekly photo
                                </p>
                            </div>
                            <div>
                                <div className="w-12 h-12 rounded-full bg-[#FFD700] flex items-center justify-center mx-auto mb-3">
                                    <span className="text-amber-900 font-bold">+5</span>
                                </div>
                                <h4 className="font-semibold mb-1">Bonus Activity</h4>
                                <p className="text-sm text-muted-foreground">
                                    Extra points for completing bonus challenges
                                </p>
                            </div>
                            <div>
                                <div className="w-12 h-12 rounded-full bg-[#E60012] flex items-center justify-center mx-auto mb-3">
                                    <span className="text-white font-bold">Σ</span>
                                </div>
                                <h4 className="font-semibold mb-1">Family Total</h4>
                                <p className="text-sm text-muted-foreground">
                                    Sum of all pairing points in your family
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>

            <Footer />
        </div>
    )
}
