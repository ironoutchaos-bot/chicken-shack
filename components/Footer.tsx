import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="footer" aria-label="Site footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div className="footer-brand">
            <Link href="/" className="nav-logo" aria-label="B'LURU FRESH">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <circle cx="14" cy="14" r="13" stroke="#D97706" strokeWidth="1.5"/>
                <path d="M9 10c1-2 3.5-3 5-2s2 3 1 5c-1 2-3 3-5 4-1.5.7-2.5.3-3-1s1-4.5 2-6z" fill="#D97706" opacity="0.9"/>
                <path d="M13 8c2-1 5 0 6 2s0 4-2 5.5c-1.2.9-3 1-4 0s-1.5-4 0-7.5z" fill="#92400E" opacity="0.7"/>
              </svg>
              <span className="nav-brand">B&rsquo;LURU Fresh Chicken</span>
            </Link>
            <p className="footer-tagline">Freshness. Hygiene. Honesty.</p>
          </div>

          {/* Nav */}
          <nav className="footer-nav" aria-label="Footer navigation">
            <h3 className="footer-nav-title">Navigate</h3>
            <a href="#menu" id="footer-menu-link">Shop</a>
            <a href="#story" id="footer-story-link">Quality</a>
            <a href="#catering" id="footer-catering-link">Wholesale</a>
          </nav>

          {/* Contact */}
          <div className="footer-contact">
            <h3 className="footer-nav-title">Get In Touch</h3>
            <a href="tel:+917012488951" id="footer-phone">+91 7012488951</a>
            <div className="footer-social">
              <a href="#" className="social-link" aria-label="B'LURU FRESH on Instagram" id="footer-instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              <a href="#" className="social-link" aria-label="B'LURU FRESH on X" id="footer-twitter">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
                </svg>
              </a>
              <a href="#" className="social-link" aria-label="B'LURU FRESH on TikTok" id="footer-tiktok">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} The Chicken Shack. All rights reserved.</span>
          <div className="footer-legal">
            <Link href="/legal/privacy" id="footer-privacy">Privacy Policy</Link>
            <Link href="/legal/terms"   id="footer-terms">Terms of Service</Link>
            <Link href="/legal/refund"  id="footer-refund">Refund Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
