import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack configuration is now top-level in Next.js 16
  // This explicitly sets the project root to avoid confusion with parent directory lockfiles
  turbopack: {
    root: process.cwd(),
  }
};

export default nextConfig;
