'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const navLinks = [
  { href: '/order', label: 'Shop' },
  { href: '#story', label: 'About Us' },
  { href: '#catering', label: 'Our Process' },
]

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith('#')) return // let normal navigation happen for page routes
    e.preventDefault()
    setMenuOpen(false)
    const target = document.querySelector(href)
    if (target) {
      const offset = window.matchMedia('(max-width: 768px)').matches ? 84 : 96
      const top = target.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  return (
    <>
      <nav className={`nav-island${scrolled ? ' scrolled' : ''}`} id="nav">
        <div className="nav-inner">
          {/* Logo */}
          <Link href="/" className="nav-logo" aria-label="B'LURU FRESH home">
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
              <defs>
                <linearGradient id="nav-lg" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#F59E0B"/>
                  <stop offset="100%" stopColor="#B45309"/>
                </linearGradient>
              </defs>
              <rect width="28" height="28" rx="7" fill="url(#nav-lg)"/>
              <circle cx="14" cy="11" r="6.5" fill="white"/>
              <rect x="12.5" y="15" width="3" height="9" rx="1.5" fill="white"/>
            </svg>
            <span className="nav-brand">B&apos;LURU FRESH</span>
          </Link>

          {/* Desktop links */}
          <div className="nav-links">
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="nav-link"
                onClick={(e) => handleSmoothScroll(e, link.href)}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Actions */}
          <div className="nav-actions">
            <Link
              href="/order"
              className="btn-primary btn-sm"
              id="nav-order-btn"
            >
              <span>Order Now</span>
              <span className="btn-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7"/><path d="M7 7h10v10"/>
                </svg>
              </span>
            </Link>

            <button
              className={`hamburger${menuOpen ? ' open' : ''}`}
              id="hamburger"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span className="ham-line ham-l1" />
              <span className="ham-line ham-l2" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Overlay */}
      <div
        className={`mobile-overlay${menuOpen ? ' open' : ''}`}
        id="mobile-overlay"
        aria-hidden={!menuOpen}
      >
        <div className="mobile-menu-inner">
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="mobile-nav-link"
                onClick={(e) => handleSmoothScroll(e, link.href)}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <Link
            href="/order"
            className="btn-primary btn-lg mobile-cta"
            id="mob-order"
            onClick={() => setMenuOpen(false)}
          >
            <span>Order Now</span>
            <span className="btn-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7"/><path d="M7 7h10v10"/>
              </svg>
            </span>
          </Link>
        </div>
      </div>
    </>
  )
}
