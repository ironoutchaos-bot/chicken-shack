'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

interface Props {
  images: string[]
}

export default function BannerCarousel({ images }: Props) {
  const [current, setCurrent]   = useState(0)
  const [fading,  setFading]    = useState(false)
  const timerRef                = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset index if images change (e.g. admin deletes one)
  useEffect(() => { setCurrent(0) }, [images.length])

  useEffect(() => {
    if (images.length <= 1) return

    timerRef.current = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setCurrent(i => (i + 1) % images.length)
        setFading(false)
      }, 350)
    }, 3000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [images.length])

  function goTo(idx: number) {
    if (idx === current) return
    if (timerRef.current) clearInterval(timerRef.current)
    setFading(true)
    setTimeout(() => {
      setCurrent(idx)
      setFading(false)
      // Restart auto-cycle
      timerRef.current = setInterval(() => {
        setFading(true)
        setTimeout(() => {
          setCurrent(i => (i + 1) % images.length)
          setFading(false)
        }, 350)
      }, 3000)
    }, 350)
  }

  // ── No images: show the original gradient fallback banner ──
  if (images.length === 0) {
    return (
      <div
        className="mx-3 mt-3 rounded-3xl overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #431407 0%, #78350F 40%, #92400E 70%, #B45309 100%)' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 80% 50%, rgba(251,191,36,0.18) 0%, transparent 60%)' }}
        />
        <div className="relative px-5 py-5 z-10">
          <p
            className="text-[10px] font-black uppercase tracking-[0.25em] leading-none"
            style={{ color: '#FCD34D' }}
          >
            Today&apos;s Picks
          </p>
          <h2
            className="font-black text-[22px] leading-tight mt-1.5 tracking-tight"
            style={{ color: '#FFFFFF' }}
          >
            Farm Fresh Cuts<br />Ready for You 🐔
          </h2>
          <p className="text-[11px] mt-1.5 leading-snug" style={{ color: 'rgba(253,230,138,0.7)' }}>
            Cut fresh only after you order. No frozen. No stored meat.
          </p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[11px] font-bold text-white">Order to cut</span>
            </div>
            <div
              className="rounded-full px-3 py-1.5"
              style={{ background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <span className="text-[11px] font-bold" style={{ color: '#FDE68A' }}>⚡ ~45 min delivery</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Image banner (single or carousel) ──
  return (
    <div
      className="mx-3 mt-3 rounded-3xl overflow-hidden relative"
      style={{ aspectRatio: '16/7', background: '#FEF3C7' }}
    >
      {/* Image with crossfade */}
      <div
        className="absolute inset-0 transition-opacity"
        style={{ opacity: fading ? 0 : 1, transitionDuration: '350ms' }}
      >
        <Image
          key={images[current]}
          src={images[current]}
          alt="Banner"
          fill
          className="object-cover"
          sizes="(max-width: 430px) 100vw, 430px"
          priority={current === 0}
        />
      </div>

      {/* Subtle bottom gradient for readability */}
      <div
        className="absolute inset-x-0 bottom-0 h-8 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.25), transparent)' }}
      />

      {/* Dot indicators — only if multiple images */}
      {images.length > 1 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to banner ${i + 1}`}
              className="rounded-full transition-all"
              style={{
                width:      i === current ? 16 : 6,
                height:     6,
                background: i === current ? '#fff' : 'rgba(255,255,255,0.45)',
                boxShadow:  i === current ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
