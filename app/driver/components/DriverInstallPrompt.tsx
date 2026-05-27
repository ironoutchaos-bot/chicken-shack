'use client'

import { useState, useEffect } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BeforeInstallPromptEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const INSTALLED_KEY = 'bf-driver-pwa-installed'

export default function DriverInstallPrompt() {
  const [show,           setShow]           = useState(false)
  const [isIOS,          setIsIOS]          = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installing,     setInstalling]     = useState(false)

  useEffect(() => {
    // Don't show if already running as standalone PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
    if (isStandalone) return

    // Don't show if already installed in a previous session
    try { if (localStorage.getItem(INSTALLED_KEY) === '1') return } catch {}

    const ua  = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
    setIsIOS(ios)

    if (ios) {
      // Show iOS instructions after 6s
      const t = setTimeout(() => setShow(true), 6000)
      return () => clearTimeout(t)
    }

    // Android/Chrome: wait for the browser's beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setTimeout(() => setShow(true), 4000)
    }
    window.addEventListener('beforeinstallprompt', handler)

    const onInstalled = () => {
      try { localStorage.setItem(INSTALLED_KEY, '1') } catch {}
      setShow(false)
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install() {
    if (!deferredPrompt) return
    setInstalling(true)
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        try { localStorage.setItem(INSTALLED_KEY, '1') } catch {}
        setShow(false)
      }
    } finally {
      setInstalling(false)
      setDeferredPrompt(null)
    }
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      zIndex: 200,
      display: 'flex', justifyContent: 'center',
      padding: '0 12px 16px',
      paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
      pointerEvents: 'none',
    }}>
      <div style={{
        width: '100%', maxWidth: 430,
        background: '#1c1c1e',
        border: '1px solid rgba(255,159,10,0.3)',
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: '0 -4px 40px rgba(0,0,0,0.6)',
        pointerEvents: 'auto',
        animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Amber top accent */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, #ff9f0a, #ff6b00, #ff9f0a)',
        }} />

        <div style={{ padding: '16px 16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            {/* Icon */}
            <div style={{
              width: 52, height: 52, borderRadius: 16, flexShrink: 0,
              background: 'linear-gradient(135deg, #ff9f0a, #ff6b00)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.625rem',
              boxShadow: '0 4px 16px rgba(255,159,10,0.35)',
            }}>
              🚗
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#e8e8ed', lineHeight: 1.3 }}>
                Add BF Driver to Home Screen
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#636366', lineHeight: 1.45 }}>
                {isIOS
                  ? 'Tap the share icon below → "Add to Home Screen" for quick 1-tap access'
                  : 'One tap to check orders, navigate & mark deliveries'
                }
              </p>
            </div>

            {/* Close */}
            <button
              onClick={() => setShow(false)}
              style={{
                background: 'transparent', border: 'none',
                padding: '4px', cursor: 'pointer',
                color: '#48484e', fontSize: '1rem', lineHeight: 1,
                flexShrink: 0, marginTop: -2,
              }}
            >
              ✕
            </button>
          </div>

          {/* Action row */}
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            {isIOS ? (
              <>
                <div style={{
                  flex: 1,
                  background: '#2c2c2e',
                  borderRadius: 14,
                  padding: '10px 12px',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>⬆️</span>
                  <span style={{ fontSize: '0.75rem', color: '#9a9a9f', lineHeight: 1.4 }}>
                    Tap <span style={{ color: '#e8e8ed', fontWeight: 700 }}>Share</span>
                    {' → '}
                    <span style={{ color: '#e8e8ed', fontWeight: 700 }}>Add to Home Screen</span>
                  </span>
                </div>
                <button
                  onClick={() => setShow(false)}
                  style={{
                    background: 'transparent', border: 'none',
                    padding: '10px 14px', cursor: 'pointer',
                    fontSize: '0.8125rem', fontWeight: 600, color: '#48484e',
                  }}
                >
                  Later
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={install}
                  disabled={installing}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #ff9f0a, #ff6b00)',
                    border: 'none', borderRadius: 14,
                    padding: '12px',
                    fontSize: '0.9375rem', fontWeight: 800, color: '#fff',
                    cursor: installing ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    opacity: installing ? 0.7 : 1,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {installing ? '…' : '⬇ Install App'}
                </button>
                <button
                  onClick={() => setShow(false)}
                  style={{
                    background: 'transparent', border: 'none',
                    padding: '12px 16px', cursor: 'pointer',
                    fontSize: '0.8125rem', fontWeight: 600, color: '#48484e',
                  }}
                >
                  Not now
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}
