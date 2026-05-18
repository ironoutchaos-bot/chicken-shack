import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Order Fresh Chicken | B'LURU Fresh",
  description: 'Order fresh chicken online. Cut fresh, delivered same day.',
}

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
