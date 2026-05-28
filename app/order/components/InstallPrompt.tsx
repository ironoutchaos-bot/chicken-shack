'use client'

import { useState, useEffect } from 'react'
import { X, Download, Share2 } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BeforeInstallPromptEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

export default function InstallPrompt() {
  const [show,           setShow]           = useState(false)
  const [isIOS,          setIsIOS]          = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Don't show if already running as an installed PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
    if (isStandalone) return

    const ua  = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
    setIsIOS(ios)

    if (ios) {
      // Show every visit — no localStorage skip — so it keeps nudging until installed
      const t = setTimeout(() => setShow(true), 2000)
      return () => clearTimeout(t)
    }

    // Android/Chrome: show as soon as the browser fires beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setTimeout(() => setShow(true), 3000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setShow(false))

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShow(false)
    setDeferredPrompt(null)
  }

  if (!show) return null

  // ── iOS — full-screen modal style ──────────────────────────────
  if (isIOS) {
    return (
      <div className="fixed inset-0 z-[70] flex items-end justify-center pointer-events-none">
        {/* Backdrop */}
        <div
          className="absolute inset-0 pointer-events-auto"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShow(false)}
        />

        <div
          className="relative w-full max-w-[430px] pointer-events-auto animate-slide-up"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div
            className="mx-3 mb-3 rounded-3xl overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #1C0A02 0%, #0D0601 100%)', boxShadow: '0 -4px 40px rgba(0,0,0,0.6)' }}
          >
            {/* Top accent */}
            <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400" />

            <div className="px-5 pt-5 pb-5">
              {/* Header row */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                    style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 0 20px rgba(251,191,36,0.4)' }}
                  >
                    🐔
                  </div>
                  <div>
                    <p className="font-black text-white text-base leading-tight">B&apos;luru Fresh</p>
                    <p className="text-amber-400 text-xs font-semibold mt-0.5">Fresh Chicken Delivery</p>
                  </div>
                </div>
                <button
                  onClick={() => setShow(false)}
                  className="p-2 rounded-full transition-colors shrink-0"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  <X size={16} className="text-stone-400" />
                </button>
              </div>

              {/* Main message */}
              <p className="text-white font-bold text-lg leading-snug mb-1">
                Add to your Home Screen
              </p>
              <p className="text-stone-400 text-sm leading-relaxed mb-5">
                Get the full app experience — faster loading, easy reordering, and one-tap access every time.
              </p>

              {/* Step-by-step instructions */}
              <div className="space-y-3 mb-5">
                {[
                  { step: '1', icon: <Share2 size={16} className="text-amber-400" />, text: <>Tap the <span className="text-white font-bold">Share</span> button — the <span className="text-white font-bold">box with an arrow ↑</span> at the <span className="text-white font-bold">bottom centre</span> of your Safari browser</> },
                  { step: '2', icon: <span className="text-amber-400 text-base leading-none">⊞</span>, text: <>Scroll down and tap <span className="text-white font-bold">"Add to Home Screen"</span></> },
                  { step: '3', icon: <span className="text-amber-400 text-base leading-none">✓</span>, text: <>Tap <span className="text-white font-bold">Add</span> — done!</> },
                ].map(({ step, icon, text }) => (
                  <div
                    key={step}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black"
                      style={{ background: 'rgba(245,158,11,0.18)', color: '#F59E0B' }}
                    >
                      {step}
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      {icon}
                      <p className="text-stone-300 text-sm leading-snug">{text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Arrow pointing down to Safari toolbar */}
              <div className="flex flex-col items-center gap-1.5 mb-1">
                <div
                  className="w-full flex items-center gap-2 rounded-2xl px-4 py-2.5"
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px dashed rgba(245,158,11,0.35)' }}
                >
                  <Share2 size={15} className="text-amber-400 shrink-0" />
                  <p className="text-amber-300 text-xs leading-snug">
                    Can&apos;t find it? The Share button looks like a <span className="font-bold text-white">box with an upward arrow ↑</span> and sits in the <span className="font-bold text-white">middle of the bottom bar</span> in Safari.
                  </p>
                </div>
                <div className="w-px h-3" style={{ background: 'rgba(245,158,11,0.4)' }} />
                <div
                  className="w-0 h-0"
                  style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid rgba(245,158,11,0.5)' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Android — compact bottom card (unchanged) ──────────────────
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[70] flex justify-center pointer-events-none">
      <div
        className="w-full max-w-[430px] pointer-events-auto animate-slide-up"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="mx-3 mb-3 bg-stone-900 rounded-3xl shadow-float overflow-hidden">
          {/* Top accent line */}
          <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400" />

          <div className="px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-2xl shrink-0 shadow-lg">
                🐔
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm leading-tight">
                  Add B&apos;luru Fresh to Home Screen
                </p>
                <p className="text-stone-400 text-xs mt-0.5 leading-snug">
                  Get faster access, offline support & order notifications
                </p>
              </div>
              <button
                onClick={() => setShow(false)}
                className="p-1.5 rounded-full hover:bg-stone-800 transition-colors shrink-0 -mt-0.5"
              >
                <X size={15} className="text-stone-400" />
              </button>
            </div>

            {/* Android reassurance */}
            <div className="mt-3 flex items-start gap-2 bg-stone-800 rounded-2xl px-3 py-2.5">
              <span className="text-base shrink-0 mt-0.5">🛡️</span>
              <p className="text-xs text-stone-300 leading-snug">
                Your phone may show a{' '}
                <span className="text-amber-400 font-semibold">"security warning"</span>
                {' '}— this is a known Google issue with new websites and is{' '}
                <span className="text-white font-semibold">completely safe</span>.
                Just tap{' '}
                <span className="text-white font-semibold">More details → Install anyway</span>.
              </p>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={install}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-white rounded-2xl py-2.5 text-sm font-bold transition-all active:scale-95"
              >
                <Download size={15} />
                Install App
              </button>
              <button
                onClick={() => setShow(false)}
                className="px-4 py-2.5 text-xs font-semibold text-stone-500 hover:text-stone-400 transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
