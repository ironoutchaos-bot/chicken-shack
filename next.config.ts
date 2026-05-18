import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // API routes (Razorpay, Supabase) require server-side rendering — no static export
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  transpilePackages: ['@heroui/react', '@heroui/theme', '@heroui/system', '@heroui/shared-utils'],
}

export default nextConfig
