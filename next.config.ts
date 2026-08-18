import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ESLint warnings/errors won't fail the build on Vercel
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type errors won't fail the build either
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
