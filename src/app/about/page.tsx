import { Metadata } from 'next'
import { NavbarWithAuthClient, Footer } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Info,
    Users,
    Heart,
    Camera,
    Star,
    Trophy,
    ArrowRight,
    Mail,
    MessageCircle
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
    title: 'About ACE',
    description: 'Learn about the Anh Chị Em mentorship program and how it works',
}

export default function AboutPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <NavbarWithAuthClient />

            <main className="flex-1 py-12">
                <div className="container mx-auto px-4">
                    {/* Header */}
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl doraemon-gradient mb-4">
                            <Info className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-4xl font-bold mb-4">About ACE</h1>
                        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                            Anh Chị Em (ACE) is VSAM&apos;s flagship mentorship program,
                            connecting Vietnamese students at the University of Minnesota.
                        </p>
                    </div>

                    {/* What is ACE */}
                    <section className="max-w-4xl mx-auto mb-16">
                        <Card className="overflow-hidden">
                            <div className="grid md:grid-cols-2">
                                <div className="p-8 flex flex-col justify-center">
                                    <h2 className="text-2xl font-bold mb-4">What is Anh Chị Em?</h2>
                                    <p className="text-muted-foreground mb-4">
                                        &quot;Anh Chị Em&quot; translates to &quot;Older Brother/Sister, Younger Sibling&quot;
                                        in Vietnamese. This program embodies the cultural value of family bonds
                                        and mentorship within our student community.
                                    </p>
                                    <p className="text-muted-foreground">
                                        The program pairs experienced students (<strong>Anh</strong> for older brother,
                                        <strong> Chị</strong> for older sister) with newcomers (<strong>Em</strong>)
                                        to help them navigate university life, build friendships, and stay connected
                                        to their Vietnamese heritage.
                                    </p>
                                </div>
                                <div className="doraemon-gradient p-8 flex items-center justify-center">
                                    <div className="text-center text-white">
                                        <div className="text-6xl font-bold mb-2">ACE</div>
                                        <div className="text-lg opacity-90">Anh Chị Em</div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </section>

                    {/* How It Works */}
                    <section className="max-w-4xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>

                        <div className="space-y-6">
                            {/* Step 1 */}
                            <div className="flex gap-6 items-start">
                                <div className="w-12 h-12 rounded-full doraemon-gradient flex items-center justify-center shrink-0 text-white font-bold">
                                    1
                                </div>
                                <Card className="flex-1">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex items-center gap-2">
                                            <Users className="w-5 h-5 text-primary" />
                                            Family Formation
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground">
                                            Participants are organized into &quot;families&quot; - groups of mentor-mentee pairings
                                            that bond together throughout the semester. Each family has a unique name and
                                            competes together on the leaderboard.
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Step 2 */}
                            <div className="flex gap-6 items-start">
                                <div className="w-12 h-12 rounded-full doraemon-gradient flex items-center justify-center shrink-0 text-white font-bold">
                                    2
                                </div>
                                <Card className="flex-1">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex items-center gap-2">
                                            <Heart className="w-5 h-5 text-[#E60012]" />
                                            Mentor-Mentee Pairing
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground">
                                            Each mentor (Anh/Chị) is paired with one or two mentees (Em).
                                            Mentors guide their mentees through their university experience,
                                            sharing advice, resources, and building a genuine friendship.
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Step 3 */}
                            <div className="flex gap-6 items-start">
                                <div className="w-12 h-12 rounded-full doraemon-gradient flex items-center justify-center shrink-0 text-white font-bold">
                                    3
                                </div>
                                <Card className="flex-1">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex items-center gap-2">
                                            <Camera className="w-5 h-5 text-primary" />
                                            Weekly Photo Submissions
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground">
                                            Each week, pairings submit a photo of themselves spending time together.
                                            This ensures regular meetings and creates lasting memories.
                                            Each approved submission earns points for your pairing and family!
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Step 4 */}
                            <div className="flex gap-6 items-start">
                                <div className="w-12 h-12 rounded-full doraemon-gradient flex items-center justify-center shrink-0 text-white font-bold">
                                    4
                                </div>
                                <Card className="flex-1">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex items-center gap-2">
                                            <Star className="w-5 h-5 text-[#FFD700]" />
                                            Bonus Activities
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground">
                                            Each week features special bonus activities - fun challenges like
                                            &quot;coffee date,&quot; &quot;study session,&quot; or &quot;cook together.&quot;
                                            Complete these for extra points and creative bonding experiences!
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Step 5 */}
                            <div className="flex gap-6 items-start">
                                <div className="w-12 h-12 rounded-full doraemon-gradient flex items-center justify-center shrink-0 text-white font-bold">
                                    5
                                </div>
                                <Card className="flex-1">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex items-center gap-2">
                                            <Trophy className="w-5 h-5 text-primary" />
                                            Leaderboard Competition
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground">
                                            Accumulated points determine rankings on the leaderboard.
                                            Top families and pairings are celebrated at the end of the semester
                                            with prizes and recognition at VSAM events!
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </section>

                    {/* Roles */}
                    <section className="max-w-4xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold text-center mb-8">Roles in ACE</h2>

                        <div className="grid md:grid-cols-3 gap-6">
                            <Card className="text-center card-hover">
                                <CardContent className="pt-6">
                                    <div className="w-16 h-16 rounded-full doraemon-gradient flex items-center justify-center mx-auto mb-4">
                                        <span className="text-white font-bold text-xl">A/C</span>
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Anh / Chị</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Mentors who guide and support 1-2 mentees. They share experiences,
                                        offer advice, and help their Em navigate university life.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="text-center card-hover">
                                <CardContent className="pt-6">
                                    <div className="w-16 h-16 rounded-full bg-[#FFD700] flex items-center justify-center mx-auto mb-4">
                                        <span className="text-amber-900 font-bold text-xl">Em</span>
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Em</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Mentees who are newer to campus. They receive guidance,
                                        build friendships, and eventually become mentors themselves!
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="text-center card-hover">
                                <CardContent className="pt-6">
                                    <div className="w-16 h-16 rounded-full bg-[#E60012] flex items-center justify-center mx-auto mb-4">
                                        <Users className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Family</h3>
                                    <p className="text-sm text-muted-foreground">
                                        A group of mentor-mentee pairings that bond together.
                                        Families compete for points and create a larger support network.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </section>

                    {/* Contact */}
                    <section id="contact" className="max-w-4xl mx-auto">
                        <Card className="bg-muted/30">
                            <CardContent className="py-8 text-center">
                                <h2 className="text-2xl font-bold mb-4">Questions?</h2>
                                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                    Interested in joining ACE or have questions about the program?
                                    Reach out to us!
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <a href="mailto:vsa@umn.edu">
                                        <Button className="gap-2 doraemon-gradient text-white">
                                            <Mail className="w-4 h-4" />
                                            Email ACE Team
                                        </Button>
                                    </a>
                                    <a href="https://instagram.com/vsam.ace/" target="_blank" rel="noopener noreferrer">
                                        <Button variant="outline" className="gap-2">
                                            <MessageCircle className="w-4 h-4" />
                                            DM on Instagram
                                        </Button>
                                    </a>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    {/* CTA */}
                    <div className="text-center mt-16">
                        <h2 className="text-2xl font-bold mb-4">Ready to Join?</h2>
                        <p className="text-muted-foreground mb-6">
                            If you&apos;re already registered, sign in to start submitting photos!
                        </p>
                        <Link href="/login">
                            <Button size="lg" className="gap-2 doraemon-gradient text-white">
                                Sign In to ACE
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
