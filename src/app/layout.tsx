import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "VSAM ACE - Anh Chị Em Mentorship Program",
    template: "%s | VSAM ACE"
  },
  description: "The Anh Chị Em (ACE) mentorship program connects Vietnamese students at the University of Minnesota through meaningful mentorship relationships.",
  keywords: ["VSAM", "ACE", "Vietnamese", "University of Minnesota", "mentorship", "student organization"],
  authors: [{ name: "Vietnamese Student Association of Minnesota" }],
  openGraph: {
    title: "VSAM ACE - Anh Chị Em Mentorship Program",
    description: "Connect with mentors and mentees in the Vietnamese student community at UMN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}

