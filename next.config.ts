import type { NextConfig } from 'next'

const securityHeaders = [
  // Stop MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Referrer policy
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // NOTE: X-Frame-Options and Content-Security-Policy are intentionally omitted.
  // Cashfree's payment SDK dynamically loads resources from many subdomains and
  // opens iframes for 3DS authentication. A CSP strict enough to block attacks
  // would also break the payment flow. We rely on HTTPS + SRI for script safety.
]

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  transpilePackages: ['@heroui/react', '@heroui/theme', '@heroui/system', '@heroui/shared-utils'],
  async headers() {
    return [
      {
        // Serve assetlinks.json with correct content-type (required for TWA verification)
        source: '/.well-known/assetlinks.json',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      {
        // Apply security headers to all other routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
