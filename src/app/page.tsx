import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { NavbarWithAuthClient, Footer } from '@/components/layout'
import {
  Trophy,
  Megaphone,
  Users,
  Heart,
  Camera,
  Star,
  ArrowRight,
  Sparkles
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <NavbarWithAuthClient />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-20 left-10 w-72 h-72 bg-[#0099D6]/10 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#FFD700]/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0099D6]/5 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 py-20 md:py-32">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6 text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                University of Minnesota • Vietnamese Student Association
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                <span className="bg-gradient-to-r from-[#0099D6] via-[#33ADDE] to-[#0077B3] bg-clip-text text-transparent">
                  Anh Chị Em
                </span>
                <br />
                <span className="text-foreground">Mentorship Program</span>
              </h1>

              {/* Subtitle */}
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Building bridges between generations of Vietnamese students through meaningful mentorship,
                creating a supportive family for everyone in our community.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/apply">
                  <Button size="lg" className="doraemon-gradient text-white px-8 h-12 text-lg gap-2 hover:opacity-90 transition-opacity">
                    Apply Now
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/about">
                  <Button size="lg" variant="outline" className="px-8 h-12 text-lg gap-2">
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How ACE Works</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Our program pairs experienced students (Anh/Chi) with newcomers (Em)
                to help them navigate university life and build lasting connections.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="card-hover border-2 border-transparent hover:border-primary/20">
                <CardContent className="pt-6">
                  <div className="w-14 h-14 rounded-2xl doraemon-gradient flex items-center justify-center mb-4">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Family System</h3>
                  <p className="text-muted-foreground">
                    Each mentor-mentee pairing belongs to a larger family, creating a network of support and connection.
                  </p>
                </CardContent>
              </Card>

              <Card className="card-hover border-2 border-transparent hover:border-primary/20">
                <CardContent className="pt-6">
                  <div className="w-14 h-14 rounded-2xl bg-[#FFD700] flex items-center justify-center mb-4">
                    <Camera className="w-7 h-7 text-amber-900" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Weekly Photos</h3>
                  <p className="text-muted-foreground">
                    Capture your bonding moments! Submit weekly photos to earn points and climb the leaderboard.
                  </p>
                </CardContent>
              </Card>

              <Card className="card-hover border-2 border-transparent hover:border-primary/20">
                <CardContent className="pt-6">
                  <div className="w-14 h-14 rounded-2xl bg-[#E60012] flex items-center justify-center mb-4">
                    <Star className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Bonus Activities</h3>
                  <p className="text-muted-foreground">
                    Complete fun bonus challenges each week for extra points and discover new ways to bond.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Quick Links Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-8">
              <Link href="/leaderboard" className="group">
                <Card className="h-full card-hover overflow-hidden">
                  <CardContent className="p-8 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl doraemon-gradient flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Trophy className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                        Leaderboard
                      </h3>
                      <p className="text-muted-foreground">
                        See which families and pairings are leading the competition this semester!
                      </p>
                    </div>
                    <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </CardContent>
                </Card>
              </Link>

              <Link href="/announcements" className="group">
                <Card className="h-full card-hover overflow-hidden">
                  <CardContent className="p-8 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-[#FFD700] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Megaphone className="w-8 h-8 text-amber-900" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                        Announcements
                      </h3>
                      <p className="text-muted-foreground">
                        Stay updated with the latest news, events, and bonus activities!
                      </p>
                    </div>
                    <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </section>

        {/* Community Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="w-20 h-20 rounded-full doraemon-gradient flex items-center justify-center mx-auto mb-6">
                <Heart className="w-10 h-10 text-white fill-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                More Than Just a Program
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                ACE is about building lifelong friendships and creating a home away from home.
                Whether you&apos;re a new student finding your way or an experienced mentor giving back,
                there&apos;s a place for you in our community.
              </p>
              <Link href="/about">
                <Button variant="outline" size="lg" className="gap-2">
                  Learn About Our Story
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
