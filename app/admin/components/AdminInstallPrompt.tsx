'use client'

import { useState, useEffect } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BeforeInstallPromptEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const INSTALLED_KEY = 'bf-admin-pwa-installed'

export default function AdminInstallPrompt() {
  const [show,           setShow]           = useState(false)
  const [isIOS,          setIsIOS]          = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installing,     setInstalling]     = useState(false)

  // Point Chrome at the admin-specific manifest (the admin layout is a client
  // component, so we can't use Next's metadata API — inject the link instead).
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'manifest'
      document.head.appendChild(link)
    }
    link.href = '/manifest-admin.json'
  }, [])

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
    if (isStandalone) return

    try { if (localStorage.getItem(INSTALLED_KEY) === '1') return } catch {}

    const ua  = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
    setIsIOS(ios)

    if (ios) {
      const t = setTimeout(() => setShow(true), 4000)
      return () => clearTimeout(t)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setTimeout(() => setShow(true), 3000)
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
      zIndex: 300,
      display: 'flex', justifyContent: 'center',
      padding: '0 12px 16px',
      paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
      pointerEvents: 'none',
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 -4px 40px rgba(0,0,0,0.18)',
        pointerEvents: 'auto',
        animation: 'bfAdminSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg,#d97706,#f59e0b,#d97706)' }} />

        <div style={{ padding: '16px 16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{
              width: 50, height: 50, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg,#1a1109,#3a2a18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem',
            }}>🐔</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#1a1109', lineHeight: 1.3 }}>
                Install the Admin App
              </p>
              <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.45 }}>
                {isIOS
                  ? 'Tap the Share icon → "Add to Home Screen" for 1-tap access'
                  : 'One-tap access to orders, inventory & settings'}
              </p>
            </div>

            <button
              onClick={() => setShow(false)}
              style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', color: '#9ca3af', fontSize: '1rem', lineHeight: 1, flexShrink: 0, marginTop: -2 }}
            >✕</button>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            {isIOS ? (
              <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>⬆️</span>
                <span style={{ fontSize: '0.75rem', color: '#374151', lineHeight: 1.4 }}>
                  Tap <span style={{ color: '#1a1109', fontWeight: 700 }}>Share</span> → <span style={{ color: '#1a1109', fontWeight: 700 }}>Add to Home Screen</span>
                </span>
              </div>
            ) : (
              <>
                <button
                  onClick={install}
                  disabled={installing}
                  style={{
                    flex: 1,
                    background: '#1a1109',
                    border: 'none', borderRadius: 12, padding: '12px',
                    fontSize: '0.9375rem', fontWeight: 700, color: '#fff',
                    cursor: installing ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    opacity: installing ? 0.7 : 1,
                  }}
                >
                  {installing ? '…' : '⬇ Install App'}
                </button>
                <button
                  onClick={() => setShow(false)}
                  style={{ background: 'transparent', border: 'none', padding: '12px 16px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, color: '#9ca3af' }}
                >
                  Not now
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bfAdminSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}
