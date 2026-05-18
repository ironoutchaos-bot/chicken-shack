import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: "BF Driver — B'luru Fresh",
  description: "B'luru Fresh delivery driver portal",
  // NOTE: We intentionally do NOT set `manifest` here via Next.js metadata.
  // Setting it here can bleed into the browser session for the main app
  // (client-side navigation shares the same origin) and break the main
  // PWA install prompt, because the driver manifest has scope "/driver"
  // which excludes "/order". The manifest link is injected directly below.
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black',
    title: 'BF Driver',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0a0b',
}

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Inject driver manifest directly — scoped to this layout only */}
      <link rel="manifest" href="/manifest-driver.json" />
      {children}
    </>
  )
}
