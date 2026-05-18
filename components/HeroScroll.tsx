'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

export default function HeroScroll() {
  const sectionRef      = useRef<HTMLElement>(null)
  const videoRef        = useRef<HTMLVideoElement>(null)
  const progressFillRef = useRef<HTMLDivElement>(null)
  const panel0Ref       = useRef<HTMLDivElement>(null)
  const panel1Ref       = useRef<HTMLDivElement>(null)
  const panel2Ref       = useRef<HTMLDivElement>(null)
  const panel3Ref       = useRef<HTMLDivElement>(null)

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    const target = document.querySelector(href)
    if (target) {
      const top = target.getBoundingClientRect().top + window.scrollY - 96
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    const video   = videoRef.current
    const section = sectionRef.current
    if (!video || !section) return

    // MOBILE: simple autoplay, no scroll scrub.
    const isMobile = window.matchMedia('(max-width: 767px)').matches
    if (isMobile) {
      video.muted = true
      video.loop  = true
      video.play().catch(() => {})
      return
    }

    // ── DESKTOP: scroll-scrubbed video ───────────────────────
    let mounted = true
    let rafId   = -1
    let prog    = 0

    const metaReady = new Promise<void>((resolve) => {
      if (video.readyState >= 1) { resolve(); return }
      video.addEventListener('loadedmetadata', () => resolve(), { once: true })
      setTimeout(resolve, 8_000)
      video.load()
    })

    const fadeRange = (p: number, inS: number, inE: number, outS: number, outE: number) => {
      if (p < inS)  return Math.max(0, (p - inS)  / (inE  - inS))
      if (p < outS) return 1
      return Math.max(0, 1 - (p - outS) / (outE - outS))
    }

    let lastTarget  = -1
    let lastProg    = -1
    let lastOp0     = -1
    let paused      = false

    // Pause RAF when tab is hidden — saves CPU/battery
    const onVisibility = () => { paused = document.hidden }
    document.addEventListener('visibilitychange', onVisibility)

    const startRaf = (duration: number) => {
      const tick = () => {
        rafId = requestAnimationFrame(tick)
        if (paused) return

        // Seek video — only when progress moved meaningfully
        const target = prog * duration
        if (Math.abs(target - lastTarget) > 0.003) {
          video.currentTime = target
          lastTarget = target
        }

        // Skip all DOM writes if progress unchanged (sub-pixel threshold)
        if (Math.abs(prog - lastProg) < 0.0005) return
        lastProg = prog

        // Progress bar
        if (progressFillRef.current) {
          progressFillRef.current.style.transform = `scaleY(${prog})`
        }

        // Vertical pan: start at 12% so head is visible at scroll=0,
        // pan to 100% (feet) by end. Horizontal fixed at 28% (left of centre).
        const vPct = Math.round(12 + prog * 88)
        video.style.objectPosition = `42% ${vPct}%`

        // Panel 0: hero intro
        const op0 = prog < 0.05 ? 1 : Math.max(0, 1 - (prog - 0.05) / 0.10)
        if (Math.abs(op0 - lastOp0) > 0.004) {
          lastOp0 = op0
          if (panel0Ref.current) {
            panel0Ref.current.style.opacity   = String(op0)
            panel0Ref.current.style.transform = `translateY(${(1 - op0) * -24}px)`
          }
        }

        // Panels 1–3
        const ops = [
          fadeRange(prog, 0.10, 0.20, 0.32, 0.42),
          fadeRange(prog, 0.38, 0.48, 0.63, 0.72),
          fadeRange(prog, 0.68, 0.78, 0.94, 1.00),
        ]
        const refs = [panel1Ref, panel2Ref, panel3Ref]
        refs.forEach((r, i) => {
          if (r.current) {
            r.current.style.opacity   = String(ops[i])
            r.current.style.transform = `translateY(${(1 - ops[i]) * 24}px)`
          }
        })
      }
      rafId = requestAnimationFrame(tick)
    }

    let cleanup: (() => void) | undefined

    const run = async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ])
      if (!mounted) return
      gsap.registerPlugin(ScrollTrigger)

      await metaReady
      if (!mounted) return
      const duration = video.duration
      if (!duration || !isFinite(duration)) return
      video.currentTime = 0

      const trigger = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: '+=300%',
        pin: true,
        pinSpacing: true,
        onUpdate: (self: { progress: number }) => { prog = self.progress },
      })

      startRaf(duration)
      cleanup = () => { trigger.kill() }
    }

    run()

    return () => {
      mounted = false
      document.removeEventListener('visibilitychange', onVisibility)
      if (rafId !== -1) cancelAnimationFrame(rafId)
      cleanup?.()
    }
  }, [])

  return (
    <section ref={sectionRef} className="hs-section" id="hero" aria-label="Hero">
      {/* ── Left: content panels ─────────────────────────── */}
      <div className="hs-content">
        {/* Panel 0 — hero intro */}
        <div ref={panel0Ref} className="hs-panel hs-panel-0">
          <span className="hs-eyebrow">B&apos;LURU FRESH Chicken &middot; Pure Process Pure Protein</span>
          <h1 className="hs-h1">
            Fresh Chicken.<br /><em>Cut Fresh.</em><br />Delivered Fresh.
          </h1>
          <p className="hs-body-lg">
            Clean, hygienically handled chicken processed after your order&mdash;so you get real freshness, not stored meat.
          </p>
          <p className="hs-supporting">
            From careful sourcing to clean cutting and packing, every step is done with precision and speed.
          </p>
          <div className="hs-actions">
            <Link href="/order" className="btn-order-hero">
              <span className="btn-order-pulse" aria-hidden="true" />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              <span>Order Now</span>
              <span className="btn-order-badge">⚡ ~45 min</span>
            </Link>
            <a href="#story" className="btn-ghost btn-lg" onClick={(e) => handleSmoothScroll(e, '#story')}>
              Our Story
            </a>
          </div>
          <div className="hs-trust-strip">
            <span className="hs-trust-pill"><span className="hs-trust-dot" />Cut Fresh Daily</span>
            <span className="hs-trust-sep" aria-hidden="true" />
            <span className="hs-trust-pill"><span className="hs-trust-dot" />No Preservatives</span>
            <span className="hs-trust-sep" aria-hidden="true" />
            <span className="hs-trust-pill"><span className="hs-trust-dot" />FSSAI Licensed</span>
          </div>
        </div>

        {/* Panel 1 — Freshness */}
        <div ref={panel1Ref} className="hs-panel hs-panel-1">
          <span className="hs-eyebrow">01 &mdash; Freshness</span>
          <h2 className="hs-h2">Cut today.<br />Delivered today.</h2>
          <p className="hs-body">
            Every bird processed and vacuum-sealed<br />
            the same morning it reaches your door.<br />
            Never frozen. Never held overnight.
          </p>
        </div>

        {/* Panel 2 — Purity */}
        <div ref={panel2Ref} className="hs-panel hs-panel-2">
          <span className="hs-eyebrow">02 &mdash; Purity</span>
          <h2 className="hs-h2">Pure process.<br />Pure protein.</h2>
          <p className="hs-body">
            Antibiotic-controlled, high-protein chicken.<br />
            Hygienically processed to advanced<br />
            sanitation standards. Every batch.
          </p>
        </div>

        {/* Panel 3 — Certification */}
        <div ref={panel3Ref} className="hs-panel hs-panel-3">
          <span className="hs-eyebrow">03 &mdash; Certified</span>
          <h2 className="hs-h2">FSSAI licensed.<br />Freshly packed.</h2>
          <p className="hs-body">
            FSSAI Lic No. 11226331000344.<br />
            No added preservatives.<br />
            No added chemicals.
          </p>
        </div>
      </div>

      {/* ── Right: video ─────────────────────────────────── */}
      <div className="hs-video-col">
        <div className="hs-video-wrap">
          <video
            ref={videoRef}
            className="hs-video"
            muted
            playsInline
            preload="auto"
          >
            <source src="/assets/hero_character.webm" type="video/webm" />
            <source src="/assets/hero_character.mp4"  type="video/mp4"  />
          </video>
        </div>
      </div>

      {/* Progress bar */}
      <div className="hs-progress-track" aria-hidden="true">
        <div ref={progressFillRef} className="hs-progress-fill" />
      </div>

      {/* Scroll cue */}
      <div className="hs-scroll-cue" aria-hidden="true">
        <span className="hs-scroll-label">scroll</span>
        <svg className="hs-scroll-arrow" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 0v13M1 9l4 5 4-5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </section>
  )
}
