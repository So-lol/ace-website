import Link from 'next/link'
import { Cat, Heart } from 'lucide-react'

export function Footer() {
    return (
        <footer className="border-t bg-card">
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="md:col-span-2">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <div className="w-10 h-10 rounded-full doraemon-gradient flex items-center justify-center">
                                <Cat className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <span className="font-bold text-lg bg-gradient-to-r from-[#0099D6] to-[#0077B3] bg-clip-text text-transparent">
                                    VSAM ACE
                                </span>
                                <p className="text-xs text-muted-foreground">
                                    Anh Chị Em Program
                                </p>
                            </div>
                        </Link>
                        <p className="text-sm text-muted-foreground max-w-md">
                            The Anh Chị Em (ACE) program connects Vietnamese students at the University of Minnesota
                            through meaningful mentorship relationships, building a stronger community for all.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="font-semibold mb-4 text-foreground">Quick Links</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <Link href="/apply" className="hover:text-primary transition-colors">
                                    ACE Application
                                </Link>
                            </li>
                            <li>
                                <Link href="/leaderboard" className="hover:text-primary transition-colors">
                                    Leaderboard
                                </Link>
                            </li>
                            <li>
                                <Link href="/announcements" className="hover:text-primary transition-colors">
                                    Announcements
                                </Link>
                            </li>
                            <li>
                                <Link href="/about" className="hover:text-primary transition-colors">
                                    About ACE
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h3 className="font-semibold mb-4 text-foreground">Resources</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <Link href="/login" className="hover:text-primary transition-colors">
                                    Member Login
                                </Link>
                            </li>
                            <li>
                                <Link href="/about#contact" className="hover:text-primary transition-colors">
                                    Contact Us
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} Vietnamese Student Association of Minnesota. All rights reserved.
                    </p>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        Made with <Heart className="w-4 h-4 text-[#E60012] fill-current" /> for the VSAM community
                    </p>
                </div>
            </div>
        </footer>
    )
}
