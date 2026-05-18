'use client'

import { useEffect, useRef, useState } from 'react'

/* ── Walking chicken SVG ──────────────────────────────────────── */
function Chicken() {
  return (
    <svg
      className="plc-svg"
      viewBox="0 0 64 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Tail feathers */}
      <ellipse cx="8" cy="33" rx="9" ry="5" fill="#E8B020"
        transform="rotate(-30 8 33)" />

      {/* Body */}
      <ellipse cx="28" cy="36" rx="19" ry="13" fill="#F5C518" />

      {/* Wing */}
      <ellipse cx="24" cy="35" rx="11" ry="6.5" fill="#E8B020"
        transform="rotate(-10 24 35)" />

      {/* Neck */}
      <ellipse cx="43" cy="29" rx="7" ry="9" fill="#F5C518" />

      {/* Head */}
      <circle cx="47" cy="19" r="12" fill="#F5C518" />

      {/* Comb */}
      <ellipse cx="41" cy="9"  rx="3"   ry="5"   fill="#DC2626" />
      <ellipse cx="46" cy="7"  rx="3.5" ry="5.5" fill="#DC2626" />
      <ellipse cx="51" cy="9"  rx="2.5" ry="4.5" fill="#DC2626" />

      {/* Wattle */}
      <ellipse cx="55" cy="26" rx="3.5" ry="4.5" fill="#DC2626" />

      {/* Beak */}
      <path d="M58 17 L65 20 L58 23 Z" fill="#F97316" />

      {/* Eye */}
      <circle cx="53" cy="16" r="3.5" fill="white" />
      <circle cx="54" cy="16" r="2"   fill="#1A1109" />
      <circle cx="55" cy="15" r="0.7" fill="white" />

      {/* Leg A — front */}
      <g className="plc-leg-a">
        <line x1="32" y1="48" x2="30" y2="57" stroke="#F97316" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="30" y1="57" x2="23" y2="60" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="23" y1="60" x2="17" y2="59" stroke="#F97316" strokeWidth="2"   strokeLinecap="round" />
      </g>

      {/* Leg B — back */}
      <g className="plc-leg-b">
        <line x1="22" y1="48" x2="24" y2="57" stroke="#E06010" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="24" y1="57" x2="31" y2="60" stroke="#E06010" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="31" y1="60" x2="37" y2="59" stroke="#E06010" strokeWidth="2"   strokeLinecap="round" />
      </g>
    </svg>
  )
}

/* ── Loader ───────────────────────────────────────────────────── */
export default function PageLoader() {
  const [phase,    setPhase]    = useState<'visible' | 'fading' | 'gone'>('visible')
  const [progress, setProgress] = useState(0)
  const rafRef = useRef<number>(-1)

  useEffect(() => {
    const MIN_MS  = 2000
    const MAX_MS  = 9000
    const start   = Date.now()
    let dismissed = false

    /* Smoothly fill bar to ~82 % while we wait for the video */
    const simTick = () => {
      const t     = Math.min(1, (Date.now() - start) / 5000)
      const eased = 1 - Math.pow(1 - t, 2.2)
      setProgress(Math.min(0.82, eased))
      if (eased < 0.82) rafRef.current = requestAnimationFrame(simTick)
    }
    rafRef.current = requestAnimationFrame(simTick)

    const dismiss = () => {
      if (dismissed) return
      dismissed = true
      cancelAnimationFrame(rafRef.current)
      setProgress(1)                            // jump to 100 %
      const elapsed   = Date.now() - start
      const remaining = Math.max(500, MIN_MS - elapsed)
      setTimeout(() => {
        setPhase('fading')
        setTimeout(() => setPhase('gone'), 700)
      }, remaining)
    }

    const tryVideo = () => {
      const v = document.querySelector<HTMLVideoElement>('.hs-video')
      if (!v || v.readyState >= 3) { dismiss(); return }
      v.addEventListener('canplaythrough', dismiss, { once: true })
      v.addEventListener('canplay',        dismiss, { once: true })
    }

    const fallback = setTimeout(dismiss, MAX_MS)
    if (document.readyState === 'complete') tryVideo()
    else window.addEventListener('DOMContentLoaded', tryVideo, { once: true })

    return () => {
      clearTimeout(fallback)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  if (phase === 'gone') return null

  const pct = progress * 100

  return (
    <div
      className={`pl-overlay${phase === 'fading' ? ' pl-overlay--out' : ''}`}
      aria-label="Loading"
      role="status"
    >
      <div className="pl-box">
        {/* Brand mark */}
        <div className="pl-brand">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <circle cx="14" cy="14" r="13" stroke="#D97706" strokeWidth="1.5" />
            <path d="M9 10c1-2 3.5-3 5-2s2 3 1 5c-1 2-3 3-5 4-1.5.7-2.5.3-3-1s1-4.5 2-6z"
              fill="#D97706" opacity="0.9" />
            <path d="M13 8c2-1 5 0 6 2s0 4-2 5.5c-1.2.9-3 1-4 0s-1.5-4 0-7.5z"
              fill="#92400E" opacity="0.7" />
          </svg>
          <span>B&apos;LURU FRESH</span>
        </div>

        {/* Track + walking chicken */}
        <div className="pl-track-outer" aria-hidden="true">
          {/* Amber fill */}
          <div className="pl-track-bg">
            <div className="pl-track-fill" style={{ width: `${pct}%` }} />
          </div>

          {/* Chicken rides the fill edge */}
          <div className="pl-chick-wrap" style={{ left: `${pct}%` }}>
            <Chicken />
          </div>
        </div>

        <span className="pl-tagline">Pure Process · Pure Protein</span>
      </div>
    </div>
  )
}
