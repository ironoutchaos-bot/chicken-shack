'use client'

import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BeforeInstallPromptEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

export default function InstallPrompt() {
  const [show,           setShow]           = useState(false)
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
    if (ios) return  // No install prompt on iOS

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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[2147483000] flex justify-center pointer-events-none">
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
