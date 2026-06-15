'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Download, MapPin, Bell, Share, Check, Plus } from 'lucide-react'

type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Mode = 'hidden' | 'install-android' | 'install-ios' | 'permissions'

const LS_INSTALL_DISMISSED = 'bf-install-dismissed'
const LS_PERMS_DONE        = 'bf-perms-done'

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  )
}

function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
}

export default function PwaPrompts({
  userId,
  onSubscribePush,
}: {
  userId: string | null
  onSubscribePush: () => void
}) {
  const [mode, setMode] = useState<Mode>('hidden')
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  // Permission UI state
  const [locState,  setLocState]  = useState<'idle' | 'granted' | 'denied'>('idle')
  const [notifState, setNotifState] = useState<'idle' | 'granted' | 'denied'>('idle')

  // ── Decide which prompt (if any) to show ────────────────────────
  useEffect(() => {
    const standalone = isStandaloneMode()

    // INSTALLED → maybe show the permissions popup (once)
    if (standalone) {
      if (localStorage.getItem(LS_PERMS_DONE) === '1') return

      const notifGranted = typeof Notification !== 'undefined' && Notification.permission === 'granted'
      // Seed current notification state
      if (notifGranted) setNotifState('granted')

      // If notifications already granted, nothing left worth nagging about
      if (notifGranted) { localStorage.setItem(LS_PERMS_DONE, '1'); return }

      const t = setTimeout(() => setMode('permissions'), 1200)
      return () => clearTimeout(t)
    }

    // NOT installed → maybe show an install prompt
    if (localStorage.getItem(LS_INSTALL_DISMISSED) === '1') return

    if (isIOS()) {
      // iOS Safari has no native install prompt — show manual instructions
      const t = setTimeout(() => setMode('install-ios'), 3000)
      return () => clearTimeout(t)
    }

    // Android / Chromium — wait for the browser's install event
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setTimeout(() => setMode('install-android'), 2500)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setMode('hidden'))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // ── Actions ─────────────────────────────────────────────────────
  const installAndroid = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setMode('hidden')
  }, [deferredPrompt])

  const dismissInstall = useCallback(() => {
    localStorage.setItem(LS_INSTALL_DISMISSED, '1')
    setMode('hidden')
  }, [])

  const enableLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocState('denied'); return }
    navigator.geolocation.getCurrentPosition(
      () => setLocState('granted'),
      () => setLocState('denied'),
      { timeout: 12_000, enableHighAccuracy: true }
    )
  }, [])

  const enableNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') { setNotifState('denied'); return }
    try {
      const perm = await Notification.requestPermission()
      if (perm === 'granted') {
        setNotifState('granted')
        if (userId) onSubscribePush() // tie subscription to the logged-in user
      } else {
        setNotifState('denied')
      }
    } catch {
      setNotifState('denied')
    }
  }, [userId, onSubscribePush])

  const finishPermissions = useCallback(() => {
    localStorage.setItem(LS_PERMS_DONE, '1')
    setMode('hidden')
  }, [])

  if (mode === 'hidden') return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center pointer-events-none">
      {/* Backdrop only for the permissions modal */}
      {mode === 'permissions' && (
        <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={finishPermissions} />
      )}

      <div
        className="relative w-full max-w-[430px] pointer-events-auto animate-slide-up"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* ── ANDROID INSTALL ─────────────────────────────────── */}
        {mode === 'install-android' && (
          <div className="mx-3 mb-3 bg-stone-900 rounded-3xl shadow-2xl overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-fuchsia-500" />
            <div className="px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-lg border border-purple-200">
                  <span className="text-2xl font-black text-purple-700">B<span className="text-lime-500">.</span></span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm leading-tight">Install B&apos;luru Fresh</p>
                  <p className="text-stone-400 text-xs mt-0.5 leading-snug">
                    Get exclusive offers &amp; faster future orders
                  </p>
                </div>
                <button onClick={dismissInstall} className="p-1.5 rounded-full hover:bg-stone-800 transition-colors shrink-0 -mt-0.5">
                  <X size={15} className="text-stone-400" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={installAndroid}
                  className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl py-2.5 text-sm font-bold transition-all active:scale-95"
                >
                  <Download size={15} /> Install App
                </button>
                <button onClick={dismissInstall} className="px-4 py-2.5 text-xs font-semibold text-stone-500 hover:text-stone-400 transition-colors">
                  Not now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── iOS INSTALL INSTRUCTIONS ────────────────────────── */}
        {mode === 'install-ios' && (
          <div className="mx-3 mb-3 bg-stone-900 rounded-3xl shadow-2xl overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-fuchsia-500" />
            <div className="px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-lg border border-purple-200">
                  <span className="text-2xl font-black text-purple-700">B<span className="text-lime-500">.</span></span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm leading-tight">Add B&apos;luru Fresh to your Home Screen</p>
                  <p className="text-stone-400 text-xs mt-0.5 leading-snug">Install it in 2 quick taps</p>
                </div>
                <button onClick={dismissInstall} className="p-1.5 rounded-full hover:bg-stone-800 transition-colors shrink-0 -mt-0.5">
                  <X size={15} className="text-stone-400" />
                </button>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-3 bg-stone-800 rounded-2xl px-3 py-2.5">
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-black flex items-center justify-center shrink-0">1</span>
                  <p className="text-xs text-stone-200 leading-snug flex items-center gap-1.5">
                    Tap the <Share size={15} className="inline text-blue-400" /> <span className="font-semibold text-white">Share</span> button below
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-stone-800 rounded-2xl px-3 py-2.5">
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-black flex items-center justify-center shrink-0">2</span>
                  <p className="text-xs text-stone-200 leading-snug flex items-center gap-1.5">
                    Choose <Plus size={15} className="inline text-white" /> <span className="font-semibold text-white">Add to Home Screen</span>
                  </p>
                </div>
              </div>
              <button onClick={dismissInstall} className="w-full mt-3 py-2.5 text-xs font-semibold text-stone-400 hover:text-stone-300 transition-colors">
                Got it
              </button>
            </div>
          </div>
        )}

        {/* ── POST-INSTALL PERMISSIONS ────────────────────────── */}
        {mode === 'permissions' && (
          <div className="mx-3 mb-3 bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-2 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center mb-3">
                <span className="text-3xl font-black text-purple-700">B<span className="text-lime-500">.</span></span>
              </div>
              <p className="font-black text-stone-900 text-base leading-tight">Welcome to B&apos;luru Fresh!</p>
              <p className="text-stone-500 text-xs mt-1 leading-snug px-2">
                Turn these on for the best experience — faster checkout &amp; live order updates.
              </p>
            </div>

            <div className="px-4 py-3 space-y-2.5">
              {/* Location */}
              <button
                onClick={enableLocation}
                disabled={locState === 'granted'}
                className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 transition-all active:scale-[0.98] disabled:active:scale-100"
                style={{ background: locState === 'granted' ? '#ecfdf5' : '#faf5ff', border: `1px solid ${locState === 'granted' ? '#a7f3d0' : '#e9d5ff'}` }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: locState === 'granted' ? '#10b981' : '#9333ea' }}>
                  <MapPin size={18} className="text-white" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-bold text-stone-900 leading-tight">Location</p>
                  <p className="text-[11px] text-stone-500 leading-snug">Auto-fill your delivery address</p>
                </div>
                {locState === 'granted'
                  ? <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold shrink-0"><Check size={14} /> On</span>
                  : <span className="text-purple-700 text-xs font-bold shrink-0">{locState === 'denied' ? 'Retry' : 'Enable'}</span>}
              </button>

              {/* Notifications */}
              <button
                onClick={enableNotifications}
                disabled={notifState === 'granted'}
                className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 transition-all active:scale-[0.98] disabled:active:scale-100"
                style={{ background: notifState === 'granted' ? '#ecfdf5' : '#faf5ff', border: `1px solid ${notifState === 'granted' ? '#a7f3d0' : '#e9d5ff'}` }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: notifState === 'granted' ? '#10b981' : '#9333ea' }}>
                  <Bell size={18} className="text-white" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-bold text-stone-900 leading-tight">Notifications</p>
                  <p className="text-[11px] text-stone-500 leading-snug">Order packed, on the way &amp; delivered</p>
                </div>
                {notifState === 'granted'
                  ? <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold shrink-0"><Check size={14} /> On</span>
                  : <span className="text-purple-700 text-xs font-bold shrink-0">{notifState === 'denied' ? 'Retry' : 'Enable'}</span>}
              </button>
            </div>

            <div className="px-4 pb-4 pt-1">
              <button
                onClick={finishPermissions}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white rounded-2xl py-3 text-sm font-bold transition-all active:scale-[0.98]"
              >
                {locState === 'granted' || notifState === 'granted' ? 'Continue' : 'Maybe later'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
