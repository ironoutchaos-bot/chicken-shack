import type { Metadata } from 'next'

export const metadata: Metadata = {
  // ── Keyword-rich title for the ordering page
  title: "Order Fresh Chicken Online Bengaluru | B'LURU Fresh — Delivered in 60 Min",

  description:
    "Order fresh chicken online in Bengaluru. Curry cut, boneless, drumstick & wings — cut fresh after your order, zero preservatives, delivered in 60 minutes across Yelahanka & Bangalore. FSSAI 11226331000344.",

  keywords: [
    "order fresh chicken bengaluru",
    "order chicken online bangalore",
    "fresh chicken delivery bengaluru",
    "buy chicken online bangalore",
    "curry cut chicken bangalore",
    "boneless chicken bengaluru",
    "chicken delivery yelahanka",
    "fresh chicken near me bangalore",
    "online chicken order bangalore",
    "bluru fresh chicken order",
  ],

  alternates: {
    canonical: 'https://www.blurufresh.com/order',
  },

  openGraph: {
    title: "Order Fresh Chicken Online | B'LURU Fresh Bengaluru",
    description:
      "Curry cut, boneless, drumstick & wings — cut fresh after your order, delivered in 60 minutes across Yelahanka & Bangalore. Zero preservatives.",
    url: 'https://www.blurufresh.com/order',
    siteName: "B'LURU Fresh",
    type: 'website',
    locale: 'en_IN',
    images: [
      {
        url: 'https://www.blurufresh.com/assets/raw_chicken_breast.jpg',
        width: 1200,
        height: 630,
        alt: "Order Fresh Chicken Online — B'LURU Fresh Bengaluru",
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: "Order Fresh Chicken Online | B'LURU Fresh Bengaluru",
    description: "Cut fresh after your order. Delivered in 60 minutes across Yelahanka, Bangalore.",
    images: ['https://www.blurufresh.com/assets/raw_chicken_breast.jpg'],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
}

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
