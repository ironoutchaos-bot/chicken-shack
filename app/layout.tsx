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
  themeColor: '#16140f',
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
  verification: {
    google: 'ueYtArKHbSCI-blL8xPqF80paQGHAUKZYVN0JYuVzgQ',
  },

  // ── Primary SEO title — keyword-rich, under 60 chars for SERP display
  title: "Fresh Chicken Bengaluru | B'LURU Fresh — Cut After Your Order",

  // ── Meta description — under 160 chars, primary keywords in first 120
  description:
    "Bengaluru's freshest chicken delivery. Cut fresh after every order — no stored meat, no preservatives. Delivery in 1 hour across Yelahanka, Bangalore. FSSAI 11226331000344.",

  // ── Comprehensive keyword set targeting Bengaluru + fresh chicken searches
  keywords: [
    // Primary target keywords
    "fresh chicken bengaluru",
    "bengaluru fresh chicken",
    "fresh chicken bangalore",
    "fresh chicken delivery bangalore",
    "fresh chicken delivery bengaluru",
    // Local area keywords
    "fresh chicken yelahanka",
    "chicken yelahanka",
    "chicken delivery yelahanka",
    "yelahanka fresh chicken",
    "fresh chicken near me bangalore",
    "chicken near me bengaluru",
    // Product keywords
    "boneless chicken bangalore",
    "curry cut chicken bangalore",
    "fresh cut chicken bangalore",
    "chicken on demand bangalore",
    "raw chicken delivery bangalore",
    "farm fresh chicken bangalore",
    // Brand keywords
    "blurufresh",
    "bluru fresh",
    "bluru fresh chicken",
    "blurufresh.com",
    // Trust/quality keywords
    "no preservative chicken bangalore",
    "FSSAI licensed chicken bangalore",
    "fresh chicken same day delivery",
    "cut to order chicken bangalore",
    "ultra fresh chicken bengaluru",
  ],

  // ── Canonical URL
  alternates: {
    canonical: 'https://www.blurufresh.com',
  },

  // ── Open Graph — for social sharing and Google rich results
  openGraph: {
    title: "Fresh Chicken Bengaluru | B'LURU Fresh — Delivered in 1 Hour",
    description:
      "Bengaluru's first ultra-fresh chicken delivery. Cut fresh after every order, zero preservatives, delivered in under 1 hour. Order now across Yelahanka & Bangalore.",
    url: 'https://www.blurufresh.com',
    siteName: "B'LURU Fresh",
    type: 'website',
    locale: 'en_IN',
    images: [
      {
        url: 'https://www.blurufresh.com/assets/raw_chicken_breast.jpg',
        width: 1200,
        height: 630,
        alt: "B'LURU Fresh — Fresh Chicken Delivery Bengaluru Bangalore",
      },
    ],
  },

  // ── Twitter card
  twitter: {
    card: 'summary_large_image',
    title: "Fresh Chicken Bengaluru — B'LURU Fresh",
    description: "Cut fresh after your order. No stored meat. Delivery in 1 hour across Yelahanka, Bangalore.",
    images: ['https://www.blurufresh.com/assets/raw_chicken_breast.jpg'],
  },

  // ── Additional SEO signals
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
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
    <html lang="en" className={`${outfit.variable} ${playfair.variable} ${fraunces.variable} ${montserrat.variable}`} style={{ background: '#ffffff' }}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="color-scheme" content="only light" />
        {/* iOS splash screens */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" href="/icons/splash-1242x2688.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" href="/icons/splash-1125x2436.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" href="/icons/splash-750x1334.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" href="/icons/splash-2732.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)" href="/icons/splash-1668.png" />
        {/* Order page editorial fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Unbounded:wght@400;700;900&family=DM+Mono:wght@400;500;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
      </head>
      <body style={{ background: '#ffffff' }}>
        <AuthProvider>
          {children}
        </AuthProvider>
        {/* JSON-LD: Rich structured data for Google Local + Food delivery */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": ["FoodEstablishment", "LocalBusiness"],
              "name": "B'LURU Fresh Chicken",
              "alternateName": ["B'LURU FRESH", "Bluru Fresh Chicken", "BLuru Fresh"],
              "url": "https://www.blurufresh.com",
              "logo": "https://www.blurufresh.com/bluru_logo.png",
              "image": [
                "https://www.blurufresh.com/assets/raw_chicken_breast.jpg",
                "https://www.blurufresh.com/bluru_logo.png"
              ],
              "description": "Bengaluru's first ultra-fresh chicken delivery service. We only start cutting after your order is placed — no stored meat, no preservatives. Farm-fresh chicken delivered in under 1 hour across Yelahanka and Bangalore.",
              "telephone": "+917012488951",
              "email": "admin@blurufresh.com",
              "foundingDate": "2024",
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
                  "opens": "07:30",
                  "closes": "18:30"
                }
              ],
              "servesCuisine": ["Fresh Chicken", "Raw Chicken", "Farm Fresh Chicken"],
              "priceRange": "₹₹",
              "currenciesAccepted": "INR",
              "paymentAccepted": "Cash, Credit Card, Debit Card, UPI",
              "hasMap": "https://maps.google.com/?q=13.1007,77.5963",
              "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+917012488951",
                "contactType": "customer service",
                "areaServed": "Bangalore",
                "availableLanguage": ["English", "Kannada", "Hindi"]
              },
              "areaServed": [
                { "@type": "City", "name": "Bangalore" },
                { "@type": "City", "name": "Bengaluru" },
                { "@type": "Neighborhood", "name": "Yelahanka" },
                { "@type": "Neighborhood", "name": "Agrahara Layout" }
              ],
              "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": "Fresh Chicken Cuts",
                "itemListElement": [
                  { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Curry Cut Chicken", "description": "Fresh curry cut chicken, cut after order" }},
                  { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Boneless Chicken", "description": "Fresh boneless chicken breast" }},
                  { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Biriyani Cut Chicken", "description": "Fresh biriyani cut chicken" }},
                  { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Drumsticks", "description": "Fresh chicken drumsticks" }}
                ]
              },
              "additionalProperty": [
                { "@type": "PropertyValue", "name": "FSSAI License", "value": "11226331000344" },
                { "@type": "PropertyValue", "name": "Delivery Time", "value": "Under 1 hour" },
                { "@type": "PropertyValue", "name": "Preservatives", "value": "None — Zero preservatives" },
                { "@type": "PropertyValue", "name": "Cutting Policy", "value": "Cut only after order is placed" }
              ]
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "B'LURU Fresh Chicken",
              "url": "https://www.blurufresh.com",
              "potentialAction": {
                "@type": "OrderAction",
                "target": "https://www.blurufresh.com/order",
                "name": "Order Fresh Chicken"
              }
            }
            ])
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
