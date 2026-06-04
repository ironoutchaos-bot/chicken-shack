import type { NextConfig } from 'next'

const securityHeaders = [
  // Prevent clickjacking
  { key: 'X-Frame-Options',        value: 'SAMEORIGIN' },
  // Stop MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Referrer policy
  { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
  // Permissions policy — restrict unused browser APIs
  {
    key:   'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), payment=(self "https://sdk.cashfree.com")',
  },
  // Content Security Policy
  // - self: our own origin
  // - Supabase, Cashfree, MSG91 explicitly whitelisted
  // - unsafe-inline for Next.js inline scripts/styles (required for HMR + styled components)
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Cashfree uses multiple subdomains for payment SDK, 3DS, and checkout flows
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.cashfree.com https://sdk.cashfree.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.cashfree.com",
      "font-src 'self' https://fonts.gstatic.com https://*.cashfree.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co https://*.cashfree.com https://api.msg91.com",
      // Cashfree opens iframes for 3DS authentication and payment forms
      "frame-src 'self' https://*.cashfree.com",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
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
