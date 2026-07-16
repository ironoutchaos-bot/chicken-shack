import type { Metadata } from 'next'
import { Anton, Poppins } from 'next/font/google'

/* Display font — the heavy condensed face used for the big headings
   ("TASTE THE DIFFERENCE", "SAVOR THE JOURNEY", section titles). */
const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-anton',
  display: 'swap',
})

/* Body / UI font — nav, buttons, paragraphs, prices. */
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Taste the Difference — American Kitchen',
  description:
    'Savor the journey, discover the delight. A world of flavors in every bite.',
}

export default function TasteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${anton.variable} ${poppins.variable}`}>{children}</div>
  )
}
