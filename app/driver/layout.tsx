import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: "BF Driver — B'luru Fresh",
  description: "B'luru Fresh delivery driver portal",
  // Override the root manifest so Chrome picks up the driver-specific PWA
  // manifest from <head> (body-injected link tags are ignored by browsers).
  manifest: '/manifest-driver.json',
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
  return <>{children}</>
}
