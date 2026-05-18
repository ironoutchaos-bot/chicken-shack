'use client'

import { useEffect, useRef } from 'react'

export default function ScrollVideo() {
  const sectionRef      = useRef<HTMLElement>(null)
  const videoRef        = useRef<HTMLVideoElement>(null)
  const progressFillRef = useRef<HTMLDivElement>(null)
  const panel1Ref       = useRef<HTMLDivElement>(null)
  const panel2Ref       = useRef<HTMLDivElement>(null)
  const panel3Ref       = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const video   = videoRef.current
    const section = sectionRef.current
    if (!video || !section) return

    // ── MOBILE: simple autoplay, no scroll scrub ───────────────
    const isMobile = window.matchMedia('(max-width: 767px)').matches
    if (isMobile) {
      video.muted = true
      video.loop  = true
      video.play().catch(() => {})
      return
    }

    // ── DESKTOP: scroll-scrubbed video ─────────────────────────
    let mounted = true
    let rafId   = -1
    let prog    = 0

    const metaReady = new Promise<void>((resolve) => {
      if (video.readyState >= 1) { resolve(); return }
      video.addEventListener('loadedmetadata', () => resolve(), { once: true })
      setTimeout(resolve, 8_000)
      video.load()
    })

    // Panel fade curve helper
    const fadeRange = (p: number, inS: number, inE: number, outS: number, outE: number) => {
      if (p < inS)  return Math.max(0, (p - inS)  / (inE  - inS))
      if (p < outS) return 1
      return Math.max(0, 1 - (p - outS) / (outE - outS))
    }

    let lastTarget = -1
    const startRaf = (duration: number) => {
      const tick = () => {
        const target = prog * duration
        if (Math.abs(target - lastTarget) > 0.004) {
          video.currentTime = target
          lastTarget = target
        }
        if (progressFillRef.current) {
          progressFillRef.current.style.transform = `scaleY(${prog})`
        }
        const ops = [
          fadeRange(prog, 0.04, 0.14, 0.29, 0.36),
          fadeRange(prog, 0.40, 0.50, 0.61, 0.68),
          fadeRange(prog, 0.72, 0.82, 0.93, 1.00),
        ]
        const refs = [panel1Ref, panel2Ref, panel3Ref]
        refs.forEach((r, i) => {
          if (r.current) {
            r.current.style.opacity   = String(ops[i])
            r.current.style.transform = `translateY(${(1 - ops[i]) * 20}px)`
          }
        })
        rafId = requestAnimationFrame(tick)
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
      if (rafId !== -1) cancelAnimationFrame(rafId)
      cleanup?.()
    }
  }, [])

  return (
    <section ref={sectionRef} className="sv-section" aria-label="Farm freshness showcase">
      <div className="sv-video-wrap">
        <video
          ref={videoRef}
          className="sv-video"
          src="/assets/extraction_video.mp4"
          muted
          playsInline
          preload="auto"
        />
        <div className="sv-vignette" aria-hidden="true" />
      </div>

      <div className="sv-panels">
        <div ref={panel1Ref} className="sv-panel sv-panel-1">
          <span className="sv-eyebrow">01 &mdash; Freshness</span>
          <h2 className="sv-heading">Cut today.<br />Delivered today.</h2>
          <p className="sv-body">
            Every bird processed and vacuum-sealed<br />
            the same morning it reaches your door.<br />
            Never frozen. Never held overnight.
          </p>
        </div>

        <div ref={panel2Ref} className="sv-panel sv-panel-2">
          <span className="sv-eyebrow">02 &mdash; Purity</span>
          <h2 className="sv-heading">Pure process.<br />Pure protein.</h2>
          <p className="sv-body">
            Antibiotic-controlled, high-protein chicken.<br />
            Hygienically processed to advanced<br />
            sanitation standards. Every batch.
          </p>
        </div>

        <div ref={panel3Ref} className="sv-panel sv-panel-3">
          <span className="sv-eyebrow">03 &mdash; Certified</span>
          <h2 className="sv-heading">FSSAI licensed.<br />Freshly packed.</h2>
          <p className="sv-body">
            FSSAI Lic No. 11226331000344.<br />
            No added preservatives.<br />
            No added chemicals.
          </p>
        </div>
      </div>

      <div className="sv-progress-track" aria-hidden="true">
        <div ref={progressFillRef} className="sv-progress-fill" />
      </div>

      <div className="sv-scroll-cue" aria-hidden="true">
        <span className="sv-scroll-label">scroll</span>
        <svg className="sv-scroll-arrow" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 0v13M1 9l4 5 4-5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </section>
  )
}
