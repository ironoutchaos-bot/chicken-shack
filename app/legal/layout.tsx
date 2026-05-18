import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Legal | B'LURU Fresh",
}

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#fafaf9', fontFamily: 'Outfit, system-ui, sans-serif' }}>
      {/* Nav */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0.875rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🐔</div>
          <span style={{ fontWeight: 800, color: '#1a1109', fontSize: '0.9375rem' }}>B&apos;LURU Fresh</span>
        </Link>
        <div style={{ display: 'flex', gap: 16, fontSize: '0.8125rem', fontWeight: 500 }}>
          <Link href="/legal/privacy" style={{ color: '#6b7280', textDecoration: 'none' }}>Privacy</Link>
          <Link href="/legal/terms"   style={{ color: '#6b7280', textDecoration: 'none' }}>Terms</Link>
          <Link href="/legal/refund"  style={{ color: '#6b7280', textDecoration: 'none' }}>Refunds</Link>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 780, margin: '0 auto', padding: 'clamp(1.5rem, 5vw, 3rem) clamp(1rem, 4vw, 2rem)' }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #e5e7eb', padding: '1.5rem', textAlign: 'center', fontSize: '0.8125rem', color: '#9ca3af' }}>
        © {new Date().getFullYear()} The Chicken Shack · B&apos;LURU Fresh ·{' '}
        <a href="mailto:contact@blurufresh.com" style={{ color: '#d97706', textDecoration: 'none' }}>contact@blurufresh.com</a>
      </footer>
    </div>
  )
}
