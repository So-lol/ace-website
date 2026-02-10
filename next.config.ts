import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack configuration is now top-level in Next.js 16
  // This explicitly sets the project root to avoid confusion with parent directory lockfiles
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://firebasestorage.googleapis.com; font-src 'self';"
          }
        ]
      }
    ]
  },
  turbopack: {
    root: process.cwd(),
  }
};

export default nextConfig;
