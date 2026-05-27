import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Outfit, Fraunces, Montserrat } from 'next/font/google'
import { AuthProvider } from '@/context/AuthContext'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-outfit',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700', '800'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-montserrat',
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: '#d97706',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/icon.svg',    type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  title: "B'LURU Fresh Chicken | Fresh Chicken Delivery Yelahanka Bangalore",
  description:
    "B'LURU Fresh delivers farm-fresh chicken in Yelahanka, Bangalore. Order boneless, curry cut, drumsticks & more — cut fresh after your order, no preservatives, delivery within 1 hour. FSSAI licensed (11226331000344).",
  keywords: [
    "blurufresh",
    "bluru fresh",
    "bluru fresh chicken",
    "blurufresh.com",
    "chicken yelahanka",
    "fresh chicken yelahanka",
    "fresh chicken bangalore",
    "fresh cut chicken bangalore",
    "chicken delivery yelahanka",
    "chicken delivery bangalore",
    "boneless chicken bangalore",
    "curry cut chicken bangalore",
    "raw chicken delivery",
    "chicken near me yelahanka",
    "fresh chicken near me",
    "bangalore chicken delivery",
    "FSSAI chicken bangalore",
    "no preservative chicken",
    "farm fresh chicken",
    "chicken on demand bangalore",
  ],
  alternates: {
    canonical: 'https://www.blurufresh.com',
  },
  openGraph: {
    title: "B'LURU Fresh Chicken — Yelahanka, Bangalore",
    description:
      "Farm-fresh chicken order to cut, delivery within 1 hour across Yelahanka & Bangalore. No preservatives, FSSAI certified.",
    url: 'https://www.blurufresh.com',
    siteName: "B'LURU Fresh",
    type: 'website',
    locale: 'en_IN',
    images: [
      {
        url: 'https://www.blurufresh.com/assets/raw_chicken_breast.jpg',
        width: 1200,
        height: 630,
        alt: "B'LURU Fresh Chicken — Yelahanka Bangalore",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "B'LURU Fresh Chicken Yelahanka",
    description: 'Fresh chicken order to cut, delivery within 1 hour. No preservatives. Order now!',
    images: ['https://www.blurufresh.com/assets/raw_chicken_breast.jpg'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: "B'LURU Fresh",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${playfair.variable} ${fraunces.variable} ${montserrat.variable}`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="color-scheme" content="only light" />
        {/* iOS splash screens */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" href="/icons/splash-1242x2688.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" href="/icons/splash-1125x2436.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" href="/icons/splash-750x1334.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" href="/icons/splash-2732.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)" href="/icons/splash-1668.png" />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
        {/* JSON-LD: Local Business structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FoodEstablishment",
              "name": "B'LURU Fresh Chicken",
              "alternateName": ["B'LURU FRESH", "Bluru Fresh", "The Chicken Shack"],
              "url": "https://www.blurufresh.com",
              "logo": "https://www.blurufresh.com/bluru_logo.png",
              "image": "https://www.blurufresh.com/assets/raw_chicken_breast.jpg",
              "description": "Farm-fresh chicken order to cut and delivery within 1 hour across Yelahanka, Bangalore. No preservatives, FSSAI certified.",
              "telephone": "+917012488951",
              "email": "contact@blurufresh.com",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "No. 951, Thirumenahalli Main Road, Agrahara Layout",
                "addressLocality": "Yelahanka",
                "addressRegion": "Karnataka",
                "postalCode": "560064",
                "addressCountry": "IN"
              },
              "geo": {
                "@type": "GeoCoordinates",
                "latitude": 13.1007,
                "longitude": 77.5963
              },
              "openingHoursSpecification": [
                {
                  "@type": "OpeningHoursSpecification",
                  "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
                  "opens": "07:00",
                  "closes": "21:00"
                }
              ],
              "servesCuisine": "Fresh Chicken",
              "priceRange": "₹₹",
              "hasMap": "https://maps.google.com/?q=Yelahanka,Bangalore,Karnataka",
              "sameAs": [],
              "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+917012488951",
                "contactType": "customer service",
                "availableLanguage": ["English", "Kannada", "Hindi"]
              },
              "areaServed": {
                "@type": "GeoCircle",
                "geoMidpoint": {
                  "@type": "GeoCoordinates",
                  "latitude": 13.1007,
                  "longitude": 77.5963
                },
                "geoRadius": "10000"
              },
              "additionalProperty": [
                { "@type": "PropertyValue", "name": "FSSAI License", "value": "11226331000344" },
                { "@type": "PropertyValue", "name": "Delivery Time", "value": "Delivery within 1 hour" },
                { "@type": "PropertyValue", "name": "Preservatives", "value": "None" }
              ]
            })
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
