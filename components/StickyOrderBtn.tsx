'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export default function StickyOrderBtn() {
  const [visible, setVisible] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <>
      {/* Sentinel placed at bottom of hero — when it leaves viewport the button appears */}
      <div ref={sentinelRef} className="sticky-sentinel" aria-hidden="true" />
      <div className={`sticky-order-wrap${visible ? ' visible' : ''}`} aria-hidden={!visible}>
        <Link href="/order" className="sticky-order-btn" tabIndex={visible ? 0 : -1}>
          <span className="sticky-order-pulse" aria-hidden="true" />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <span>Order Now</span>
          <span className="sticky-order-badge">⚡ Within 1 hour</span>
        </Link>
      </div>
    </>
  )
}
