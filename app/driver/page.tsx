'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { OrderRow, DeliveryAddress } from '@/lib/supabase-browser'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BeforeInstallPromptEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

type DriverInfo = {
  id: string
  name: string
  user_id: string
  phone: string | null
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

type ViewState = 'checking' | 'login' | 'dashboard'

const STATUS_LABEL: Record<string, string> = {
  placed:     'New Order',
  packed:     'Ready to Pick',
  on_the_way: 'En Route',
  delivered:  'Delivered',
  cancelled:  'Cancelled',
}

const STATUS_GLYPH: Record<string, string> = {
  placed:     '📦',
  packed:     '✅',
  on_the_way: '🛵',
  delivered:  '🏁',
  cancelled:  '✕',
}

export default function DriverPage() {
  const [view,        setView]        = useState<ViewState>('checking')
  const [driver,      setDriver]      = useState<DriverInfo | null>(null)
  const [orders,      setOrders]      = useState<OrderRow[]>([])
  const [ordersLoad,  setOrdersLoad]  = useState(false)
  const [updatingId,  setUpdatingId]  = useState<string | null>(null)
  const [expandedId,  setExpandedId]  = useState<string | null>(null)

  // Push notifications
  const [pushStatus,    setPushStatus]    = useState<'idle' | 'subscribed' | 'denied'>('idle')
  const [pushAsking,    setPushAsking]    = useState(false)
  const [pushDismissed, setPushDismissed] = useState(false)

  // PWA install
  const [isStandalone,   setIsStandalone]   = useState(true)   // assume installed until checked
  const [isIOS,          setIsIOS]          = useState(false)
  const [deferredInstall, setDeferredInstall] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPopup, setShowInstallPopup] = useState(false)
  const [installing,     setInstalling]     = useState(false)

  // Login form
  const [userId,    setUserId]    = useState('')
  const [password,  setPassword]  = useState('')
  const [logging,   setLogging]   = useState(false)
  const [loginErr,  setLoginErr]  = useState('')

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // New-order alarm (loud looping ring while the app is open)
  const [alarmOn,      setAlarmOn]      = useState(false)
  const audioCtxRef      = useRef<AudioContext | null>(null)
  const alarmTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const alarmPlayingRef  = useRef(false)
  const seenOrderIdsRef  = useRef<Set<string> | null>(null)

  // ── Auth check on mount ─────────────────────────────────────
  useEffect(() => {
    fetch('/api/driver/ping')
      .then(async r => {
        if (r.ok) {
          const d = await r.json()
          setDriver(d)
          setView('dashboard')
        } else {
          setView('login')
        }
      })
      .catch(() => setView('login'))
  }, [])

  // ── PWA install setup ────────────────────────────────────────
  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
    setIsStandalone(standalone)
    if (standalone) return

    const ua  = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
    setIsIOS(ios)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredInstall(e as BeforeInstallPromptEvent)
      // Auto-show popup after 4s
      setTimeout(() => setShowInstallPopup(true), 4000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setIsStandalone(true)
      setShowInstallPopup(false)
    })
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function triggerInstall() {
    if (!deferredInstall) return
    setInstalling(true)
    try {
      await deferredInstall.prompt()
      const { outcome } = await deferredInstall.userChoice
      if (outcome === 'accepted') {
        setIsStandalone(true)
        setShowInstallPopup(false)
      }
    } finally {
      setInstalling(false)
      setDeferredInstall(null)
    }
  }

  // ── Push notifications ───────────────────────────────────────
  async function subscribePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    setPushAsking(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setPushStatus('denied'); setPushAsking(false); return }

      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
        ).buffer as ArrayBuffer,
      })

      const saveRes = await fetch('/api/push/driver-subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ subscription: sub.toJSON() }),
      })
      if (saveRes.ok) {
        setPushStatus('subscribed')
      }
      // If save failed, leave status as 'idle' so the banner stays and driver can retry
    } catch {
      // leave as idle
    } finally {
      setPushAsking(false)
    }
  }

  // ── New-order alarm (loud looping ring) ─────────────────────
  // Synthesised with the Web Audio API so it needs no audio asset and can be
  // made loud + piercing. Only works while the app is OPEN — a fully closed
  // PWA cannot play a custom looping sound (OS limitation; push handles that).
  const ensureAudio = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null
    if (!audioCtxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AC) audioCtxRef.current = new AC()
    }
    const ctx = audioCtxRef.current
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
    return ctx
  }, [])

  const stopAlarm = useCallback(() => {
    alarmPlayingRef.current = false
    if (alarmTimerRef.current) { clearInterval(alarmTimerRef.current); alarmTimerRef.current = null }
    try { navigator.vibrate?.(0) } catch {}
    setAlarmOn(false)
  }, [])

  const startAlarm = useCallback(() => {
    if (alarmPlayingRef.current) return
    alarmPlayingRef.current = true
    setAlarmOn(true)
    const ctx = ensureAudio()
    const ring = () => {
      try { navigator.vibrate?.([300, 120, 300, 120, 450]) } catch {}
      if (!ctx) return
      const now = ctx.currentTime
      const tone = (freq: number, start: number, dur: number) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'square'                       // piercing, attention-grabbing
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.exponentialRampToValueAtTime(0.55, start + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
        osc.connect(gain); gain.connect(ctx.destination)
        osc.start(start); osc.stop(start + dur + 0.02)
      }
      // "ring-ring" — two quick double-tone bursts
      tone(1000, now,        0.18); tone(1320, now + 0.20, 0.18)
      tone(1000, now + 0.50, 0.18); tone(1320, now + 0.70, 0.18)
    }
    ring()
    alarmTimerRef.current = setInterval(ring, 1500)
  }, [ensureAudio])

  // Unlock the AudioContext on the first user interaction on the dashboard,
  // so the alarm can play later when an order arrives (autoplay policy).
  useEffect(() => {
    if (view !== 'dashboard') return
    const unlock = () => ensureAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [view, ensureAudio])

  // Stop the alarm if the component unmounts
  useEffect(() => stopAlarm, [stopAlarm])

  // ── Load orders ─────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    setOrdersLoad(true)
    try {
      const res = await fetch('/api/driver/orders')
      if (res.ok) {
        const data: OrderRow[] = await res.json()
        setOrders(data)

        // Detect newly-arrived orders that still need action → ring the alarm.
        const actionable = data.filter(o => o.order_status === 'placed' || o.order_status === 'packed')
        if (seenOrderIdsRef.current === null) {
          // First load — establish the baseline without ringing.
          seenOrderIdsRef.current = new Set(data.map(o => o.id))
        } else {
          const hasNew = actionable.some(o => !seenOrderIdsRef.current!.has(o.id))
          data.forEach(o => seenOrderIdsRef.current!.add(o.id))
          if (hasNew) startAlarm()
        }
      }
    } catch {}
    finally { setOrdersLoad(false) }
  }, [startAlarm])

  // Check push permission state when dashboard opens.
  // If permission is already granted, silently re-register so every phone
  // that opens the driver app gets its subscription saved to Supabase —
  // without this, only the first phone to explicitly tap "Allow" gets saved.
  useEffect(() => {
    if (view !== 'dashboard') return
    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted') {
        setPushStatus('subscribed')
        subscribePush() // re-register silently; upserts on endpoint so safe to call every open
      }
      if (Notification.permission === 'denied') setPushStatus('denied')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  // Poll every 20s when dashboard is visible
  useEffect(() => {
    if (view !== 'dashboard') return
    loadOrders()
    pollRef.current = setInterval(loadOrders, 20_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [view, loadOrders])

  // Instant refresh when SW delivers a push notification to this page
  useEffect(() => {
    if (view !== 'dashboard') return
    if (!('serviceWorker' in navigator)) return
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'ORDER_UPDATE') {
        if (event.data?.kind === 'driver_new_order') startAlarm()
        loadOrders()
      }
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [view, loadOrders, startAlarm])

  // ── Login ────────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLogging(true); setLoginErr('')
    try {
      const res = await fetch('/api/driver/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId.trim(), password: password.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setLoginErr(data.error ?? 'Login failed'); return }
      setDriver(data)
      setView('dashboard')
    } catch { setLoginErr('Network error. Try again.') }
    finally { setLogging(false) }
  }

  // ── Logout ───────────────────────────────────────────────────
  async function handleLogout() {
    await fetch('/api/driver/login', { method: 'DELETE' }).catch(() => {})
    setDriver(null)
    setOrders([])
    setView('login')
    setUserId('')
    setPassword('')
  }

  // ── Status update ────────────────────────────────────────────
  async function updateStatus(orderId: string, newStatus: 'on_the_way' | 'delivered') {
    setUpdatingId(orderId)
    try {
      const res = await fetch(`/api/driver/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_status: newStatus }),
      })
      if (res.ok) {
        setOrders(prev =>
          prev.map(o => o.id === orderId ? { ...o, order_status: newStatus } : o)
        )
      }
    } finally { setUpdatingId(null) }
  }

  // ── Checking ─────────────────────────────────────────────────
  if (view === 'checking') {
    return (
      <div style={S.shell}>
        <div style={S.splash}>
          <div style={S.splashIcon}>🐔</div>
          <p style={S.splashBrand}>B&apos;luru Fresh</p>
          <div style={S.spinner} />
        </div>
      </div>
    )
  }

  // ── Login ────────────────────────────────────────────────────
  if (view === 'login') {
    return (
      <div style={S.shell}>
        <div style={S.loginWrap}>
          {/* Logo */}
          <div style={S.loginLogo}>
            <span style={{ fontSize: '2.5rem' }}>🐔</span>
            <p style={S.loginBrand}>B&apos;luru Fresh</p>
            <p style={S.loginSub}>Driver Portal</p>
          </div>

          <form onSubmit={handleLogin} style={S.loginForm}>
            <div style={S.fieldGroup}>
              <label style={S.fieldLabel}>User ID</label>
              <input
                type="text" placeholder="e.g. raju01" autoCapitalize="none"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                style={S.loginInput}
                autoFocus
              />
            </div>
            <div style={S.fieldGroup}>
              <label style={S.fieldLabel}>Password</label>
              <input
                type="password" placeholder="Your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={S.loginInput}
              />
            </div>
            {loginErr && (
              <div style={S.loginErr}>{loginErr}</div>
            )}
            <button type="submit" disabled={logging} style={S.loginBtn}>
              {logging ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Dashboard ────────────────────────────────────────────────
  const active    = orders.filter(o => o.order_status !== 'delivered' && o.order_status !== 'cancelled')
  const delivered = orders.filter(o => o.order_status === 'delivered')

  return (
    <div style={S.shell}>
      {/* ── New-order ringing overlay ───────────────────────── */}
      {alarmOn && (
        <div style={S.alarmOverlay} onClick={stopAlarm}>
          <div style={S.alarmCard} onClick={e => e.stopPropagation()}>
            <div style={S.alarmBell}>🔔</div>
            <p style={S.alarmTitle}>New Order!</p>
            <p style={S.alarmSub}>A new order just came in. Tap below to view it.</p>
            <button onClick={stopAlarm} style={S.alarmStopBtn}>Stop &amp; View Orders</button>
          </div>
          <style>{`@keyframes bfPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}`}</style>
        </div>
      )}

      {/* Top bar */}
      <div style={S.topBar}>
        <div style={S.topBarLeft}>
          <div style={S.avatar}>{driver?.name?.charAt(0).toUpperCase() ?? '?'}</div>
          <div>
            <p style={S.driverName}>{driver?.name}</p>
            <p style={S.driverHandle}>@{driver?.user_id}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {ordersLoad && <div style={S.miniSpinner} />}
          <button onClick={loadOrders} style={S.refreshBtn} title="Refresh">↻</button>
          <button onClick={handleLogout} style={S.logoutBtn}>Sign out</button>
        </div>
      </div>

      {/* ── Persistent Install Card ─────────────────────────── */}
      {!isStandalone && (
        <div style={{
          margin: '0.75rem 1rem 0',
          background: '#1c1c1e',
          border: '1px solid rgba(255,159,10,0.35)',
          borderRadius: 16,
          overflow: 'hidden',
        }}>
          <div style={{ height: 3, background: 'linear-gradient(90deg,#ff9f0a,#ff6b00,#ff9f0a)' }} />
          <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(135deg,#ff9f0a,#ff6b00)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.375rem',
            }}>🚗</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: '#e8e8ed', lineHeight: 1.3 }}>
                Install BF Driver App
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: '#636366', lineHeight: 1.4 }}>
                {isIOS
                  ? 'Tap Share → "Add to Home Screen"'
                  : 'One tap access to your orders'
                }
              </p>
            </div>
            {isIOS ? (
              <div style={{
                background: '#2c2c2e', borderRadius: 10,
                padding: '8px 10px', fontSize: '0.75rem',
                color: '#9a9a9f', lineHeight: 1.4, maxWidth: 130,
              }}>
                Tap <span style={{ color: '#e8e8ed', fontWeight: 700 }}>⬆ Share</span><br />
                → <span style={{ color: '#e8e8ed', fontWeight: 700 }}>Add to Home Screen</span>
              </div>
            ) : (
              <button
                onClick={triggerInstall}
                disabled={installing || !deferredInstall}
                style={{
                  background: deferredInstall
                    ? 'linear-gradient(135deg,#ff9f0a,#ff6b00)'
                    : '#2c2c2e',
                  border: 'none', borderRadius: 10,
                  padding: '9px 14px',
                  fontSize: '0.8125rem', fontWeight: 800,
                  color: deferredInstall ? '#fff' : '#48484e',
                  cursor: deferredInstall ? 'pointer' : 'default',
                  whiteSpace: 'nowrap' as const,
                  flexShrink: 0,
                }}
              >
                {installing ? '…' : deferredInstall ? '⬇ Install' : 'Open in Chrome'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={S.statsRow}>
        <div style={S.statCard}>
          <p style={S.statNum}>{active.length}</p>
          <p style={S.statLbl}>Active</p>
        </div>
        <div style={S.statCard}>
          <p style={S.statNum}>{delivered.length}</p>
          <p style={S.statLbl}>Delivered</p>
        </div>
        <div style={S.statCard}>
          <p style={S.statNum}>₹{orders.reduce((s, o) => s + (o.payment_status === 'cod' && o.order_status !== 'delivered' ? o.total_amount : 0), 0)}</p>
          <p style={S.statLbl}>COD pending</p>
        </div>
      </div>

      {/* Push notification prompt */}
      {pushStatus === 'idle' && !pushDismissed &&
       typeof Notification !== 'undefined' && Notification.permission === 'default' && (
        <div style={S.pushBanner}>
          <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>🔔</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#e8e8ed', margin: 0 }}>
              Get notified when assigned
            </p>
            <p style={{ fontSize: '0.75rem', color: '#636366', margin: '2px 0 0' }}>
              Instant alerts when a new order is assigned to you
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={subscribePush} disabled={pushAsking} style={S.pushAllow}>
              {pushAsking ? '…' : 'Allow'}
            </button>
            <button onClick={() => setPushDismissed(true)} style={S.pushDismiss}>✕</button>
          </div>
        </div>
      )}

      {pushStatus === 'subscribed' && (
        <div style={S.pushActive}>
          <span>🔔</span>
          <span>Notifications on — you&apos;ll be alerted for new orders</span>
        </div>
      )}

      {/* Orders */}
      <div style={S.feed}>
        {orders.length === 0 && !ordersLoad && (
          <div style={S.emptyState}>
            <p style={{ fontSize: '3rem', margin: 0 }}>🛵</p>
            <p style={{ color: '#6b6b70', fontWeight: 600, margin: '8px 0 0', fontSize: '0.9375rem' }}>No orders assigned yet</p>
            <p style={{ color: '#48484e', fontSize: '0.8125rem', margin: '4px 0 0' }}>Pull to refresh or wait — new ones will appear here</p>
          </div>
        )}

        {/* Active orders first */}
        {active.length > 0 && (
          <>
            <p style={S.sectionHdr}>Active · {active.length}</p>
            {active.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                expanded={expandedId === order.id}
                updating={updatingId === order.id}
                onToggle={() => setExpandedId(p => p === order.id ? null : order.id)}
                onStatusChange={updateStatus}
              />
            ))}
          </>
        )}

        {/* Delivered */}
        {delivered.length > 0 && (
          <>
            <p style={{ ...S.sectionHdr, color: '#48484e' }}>Delivered · {delivered.length}</p>
            {delivered.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                expanded={expandedId === order.id}
                updating={false}
                onToggle={() => setExpandedId(p => p === order.id ? null : order.id)}
                onStatusChange={updateStatus}
              />
            ))}
          </>
        )}
      </div>

      {/* ── Auto-popup overlay (fires 4s after page load) ──── */}
      {showInstallPopup && !isStandalone && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        }}>
          <div style={{
            width: '100%', maxWidth: 430,
            background: '#1c1c1e',
            border: '1px solid rgba(255,159,10,0.3)',
            borderRadius: '24px 24px 0 0',
            overflow: 'hidden',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.7)',
            animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            paddingBottom: 'env(safe-area-inset-bottom,0px)',
          }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg,#ff9f0a,#ff6b00,#ff9f0a)' }} />
            {/* Handle */}
            <div style={{ width: 40, height: 4, background: '#3a3a3c', borderRadius: 2, margin: '14px auto 0' }} />
            <div style={{ padding: '14px 20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 54, height: 54, borderRadius: 16, flexShrink: 0,
                  background: 'linear-gradient(135deg,#ff9f0a,#ff6b00)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.75rem',
                  boxShadow: '0 4px 16px rgba(255,159,10,0.4)',
                }}>🚗</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#e8e8ed', lineHeight: 1.3 }}>
                    Add BF Driver to Home Screen
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#636366', lineHeight: 1.45 }}>
                    {isIOS
                      ? 'Tap Share → "Add to Home Screen" for instant 1-tap access'
                      : 'Install for 1-tap access to your orders — no browser needed'
                    }
                  </p>
                </div>
                <button
                  onClick={() => setShowInstallPopup(false)}
                  style={{ background: 'transparent', border: 'none', color: '#48484e', cursor: 'pointer', fontSize: '1rem', padding: 4, flexShrink: 0, marginTop: -2 }}
                >✕</button>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                {isIOS ? (
                  <>
                    <div style={{
                      flex: 1, background: '#2c2c2e', borderRadius: 14,
                      padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>⬆️</span>
                      <span style={{ fontSize: '0.8rem', color: '#9a9a9f', lineHeight: 1.4 }}>
                        Tap <span style={{ color: '#e8e8ed', fontWeight: 700 }}>Share</span>
                        {' → '}
                        <span style={{ color: '#e8e8ed', fontWeight: 700 }}>Add to Home Screen</span>
                      </span>
                    </div>
                    <button onClick={() => setShowInstallPopup(false)} style={{ background: 'transparent', border: 'none', padding: '11px 16px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#48484e' }}>
                      Later
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={triggerInstall}
                      disabled={installing}
                      style={{
                        flex: 1,
                        background: 'linear-gradient(135deg,#ff9f0a,#ff6b00)',
                        border: 'none', borderRadius: 14,
                        padding: '13px',
                        fontSize: '1rem', fontWeight: 800, color: '#fff',
                        cursor: installing ? 'default' : 'pointer',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {installing ? '…' : '⬇ Install App'}
                    </button>
                    <button onClick={() => setShowInstallPopup(false)} style={{ background: 'transparent', border: 'none', padding: '13px 18px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#48484e' }}>
                      Not now
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          <style>{`@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
        </div>
      )}
    </div>
  )
}

function OrderCard({
  order, expanded, updating, onToggle, onStatusChange,
}: {
  order: OrderRow
  expanded: boolean
  updating: boolean
  onToggle: () => void
  onStatusChange: (id: string, status: 'on_the_way' | 'delivered') => void
}) {
  const [pendingStatus, setPendingStatus] = useState<'on_the_way' | 'delivered' | null>(null)

  const addr    = order.delivery_address as DeliveryAddress | null
  const isOTW   = order.order_status === 'on_the_way'
  const isDone  = order.order_status === 'delivered'
  const isCOD   = order.payment_status === 'cod'
  const glyph   = STATUS_GLYPH[order.order_status] ?? '📦'
  const label   = STATUS_LABEL[order.order_status] ?? order.order_status
  const stColor = isDone ? '#30d158' : isOTW ? '#ff9f0a' : order.order_status === 'packed' ? '#0a84ff' : '#ebebf5'

  return (
    <div style={{ ...S.orderCard, opacity: isDone ? 0.6 : 1 }}>
      {/* ── Confirmation modal ── */}
      {pendingStatus && (
        <div style={S.modalBackdrop}>
          <div style={S.modalSheet}>
            {/* Handle bar */}
            <div style={S.modalHandle} />

            {/* Title */}
            <p style={S.modalTitle}>
              {pendingStatus === 'on_the_way' ? '🛵 Mark On the Way?' : '✅ Mark as Delivered?'}
            </p>
            <p style={S.modalSub}>
              Order #{order.id.slice(0, 8).toUpperCase()} ·{' '}
              {order.items.reduce((s, i) => s + i.quantity, 0)} pcs · ₹{order.total_amount}
            </p>
            {order.customer_name && (
              <p style={{ margin: '-4px 0 0', fontSize: '0.875rem', color: '#ebebf5', textAlign: 'center' }}>
                👤 {order.customer_name}
              </p>
            )}

            {/* COD cash reminder */}
            {isCOD && pendingStatus === 'delivered' && (
              <div style={S.codReminder}>
                <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>💰</span>
                <div>
                  <p style={S.codReminderTitle}>Collect ₹{order.total_amount} Cash</p>
                  <p style={S.codReminderSub}>
                    This is a COD order. Collect the cash from the customer before confirming delivery.
                  </p>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: '1.25rem' }}>
              <button
                onClick={() => setPendingStatus(null)}
                style={S.modalCancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onStatusChange(order.id, pendingStatus)
                  setPendingStatus(null)
                }}
                disabled={updating}
                style={{
                  ...S.modalConfirmBtn,
                  background: pendingStatus === 'on_the_way'
                    ? 'linear-gradient(135deg, #ff9f0a, #ff6b00)'
                    : 'linear-gradient(135deg, #30d158, #25a244)',
                }}
              >
                {updating ? '…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card top — always visible */}
      <button onClick={onToggle} style={S.cardTopBtn}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <div style={{ ...S.statusDot, background: stColor }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={S.orderId}>#{order.id.slice(0, 8).toUpperCase()}</span>
              <span style={{ ...S.statusChip, color: stColor, borderColor: stColor + '40' }}>
                {glyph} {label}
              </span>
              {isCOD && (
                <span style={S.codChip}>COD</span>
              )}
            </div>
            {order.customer_name && (
              <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#a1a1aa', letterSpacing: '0.01em' }}>
                👤 {order.customer_name}
              </p>
            )}
            <p style={S.orderMeta}>
              {order.items.reduce((s, i) => s + i.quantity, 0)} pcs ·{' '}
              <span style={{ color: '#e8e8ed', fontWeight: 700 }}>₹{order.total_amount}</span>
              {isCOD && !isDone && <span style={{ color: '#ff9f0a', marginLeft: 4 }}> · collect cash</span>}
            </p>
          </div>
        </div>
        <span style={{ color: '#48484e', fontSize: '1.1rem', flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Items — always visible */}
      <div style={S.itemsRow}>
        {order.items.map((item, i) => (
          <span key={i} style={S.itemChip}>
            {item.name} × {item.quantity}
          </span>
        ))}
      </div>

      {/* Call + Navigate buttons — hidden once delivered */}
      {!isDone && (order.customer_phone || (order.delivery_address as DeliveryAddress | null)?.lat) && (
        <div style={S.actionRow}>
          {order.customer_phone && (
            <a href={`tel:${order.customer_phone}`} style={{ ...S.callBtn, flex: 1 }}>
              📲 Call Customer
            </a>
          )}
          {(() => {
            const a = order.delivery_address as DeliveryAddress | null
            if (!a?.lat || !a?.lng) return null
            return (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lng}`}
                target="_blank" rel="noopener noreferrer"
                style={{ ...S.navBtnInline, flex: 1 }}
              >
                🧭 Navigate
              </a>
            )
          })()}
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div style={S.cardBody}>
          {/* Address */}
          {addr && (
            <div style={S.addrBlock}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <p style={S.detailLabel}>📍 Delivery Address</p>
                {!isDone && addr.lat && addr.lng && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${addr.lat},${addr.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    style={S.navBtn}
                  >
                    🧭 Navigate
                  </a>
                )}
              </div>
              {addr.houseNumber  && <p style={S.addrMain}>{addr.houseNumber}</p>}
              {addr.streetAddress && <p style={S.addrDetail}>{addr.streetAddress}</p>}
              {addr.landmark      && <p style={S.addrDetail}>Near: {addr.landmark}</p>}
              {addr.pincode       && <p style={S.addrDetail}>Pin: {addr.pincode}</p>}
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div style={S.notesBlock}>
              <p style={S.detailLabel}>💬 Instructions</p>
              <p style={S.notesText}>{order.notes}</p>
            </div>
          )}

          {/* Order time */}
          <p style={S.orderTime}>
            Ordered {new Date(order.created_at).toLocaleString('en-IN', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
      )}

      {/* Action buttons */}
      {!isDone && order.order_status !== 'cancelled' && (
        <div style={S.actions}>
          {!isOTW && (
            <button
              onClick={() => setPendingStatus('on_the_way')}
              disabled={updating}
              style={S.btnOTW}
            >
              {updating ? '…' : '🛵 Mark On the Way'}
            </button>
          )}
          {isOTW && (
            <button
              onClick={() => setPendingStatus('delivered')}
              disabled={updating}
              style={S.btnDelivered}
            >
              {updating ? '…' : '✅ Mark as Delivered'}
            </button>
          )}
        </div>
      )}

      {isDone && (
        <div style={S.doneRow}>
          <span>✅ Delivered</span>
        </div>
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  // New-order alarm overlay
  alarmOverlay: {
    position: 'fixed', inset: 0, zIndex: 10000,
    background: 'rgba(255,107,0,0.18)',
    backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
  },
  alarmCard: {
    width: '100%', maxWidth: 340, textAlign: 'center',
    background: '#1c1c1e', border: '1.5px solid rgba(255,159,10,0.5)',
    borderRadius: 24, padding: '2rem 1.5rem',
    boxShadow: '0 20px 70px rgba(255,107,0,0.35)',
  },
  alarmBell: { fontSize: '3.75rem', lineHeight: 1, animation: 'bfPulse 0.7s ease-in-out infinite' },
  alarmTitle: { fontSize: '1.5rem', fontWeight: 900, color: '#fff', margin: '0.75rem 0 0', letterSpacing: '-0.02em' },
  alarmSub: { fontSize: '0.875rem', color: '#9a9a9f', margin: '0.5rem 0 0', lineHeight: 1.5 },
  alarmStopBtn: {
    width: '100%', marginTop: '1.5rem',
    background: 'linear-gradient(135deg,#ff9f0a,#ff6b00)',
    border: 'none', borderRadius: 16, padding: '1rem',
    fontSize: '1.0625rem', fontWeight: 800, color: '#fff', cursor: 'pointer',
    letterSpacing: '-0.01em', boxShadow: '0 6px 20px rgba(255,107,0,0.4)',
  },
  alarmMuted: { fontSize: '0.75rem', color: '#ff9f0a', margin: '0.875rem 0 0' },

  // Shell
  shell: {
    minHeight: '100dvh',
    background: '#0a0a0b',
    color: '#e8e8ed',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
    WebkitFontSmoothing: 'antialiased',
    overflowX: 'hidden',
  },

  // Splash / checking
  splash: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  splashIcon:  { fontSize: '3.5rem' },
  splashBrand: { fontSize: '1.5rem', fontWeight: 700, color: '#e8e8ed', margin: 0, letterSpacing: '-0.03em' },
  spinner: {
    width: 28, height: 28,
    border: '3px solid rgba(255,255,255,0.1)',
    borderTop: '3px solid #ff9f0a',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  miniSpinner: {
    width: 16, height: 16,
    border: '2px solid rgba(255,255,255,0.1)',
    borderTop: '2px solid #ff9f0a',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },

  // Login
  loginWrap: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1.5rem',
  },
  loginLogo:  { textAlign: 'center', marginBottom: '2.5rem' },
  loginBrand: { fontSize: '1.75rem', fontWeight: 800, color: '#e8e8ed', margin: '8px 0 0', letterSpacing: '-0.04em' },
  loginSub:   { fontSize: '0.875rem', color: '#636366', margin: '4px 0 0', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' },
  loginForm: {
    width: '100%', maxWidth: 360,
    display: 'flex', flexDirection: 'column', gap: 14,
  },
  fieldGroup:  { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel:  { fontSize: '0.75rem', fontWeight: 600, color: '#636366', textTransform: 'uppercase', letterSpacing: '0.05em' },
  loginInput: {
    background: '#1c1c1e',
    border: '1.5px solid #2c2c2e',
    borderRadius: 12,
    padding: '0.875rem 1rem',
    fontSize: '1rem',
    color: '#e8e8ed',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  loginErr: {
    background: '#2c1010',
    border: '1px solid #5c2020',
    borderRadius: 10,
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    color: '#ff453a',
  },
  loginBtn: {
    background: 'linear-gradient(135deg, #ff9f0a, #ff6b00)',
    border: 'none',
    borderRadius: 14,
    padding: '1rem',
    fontSize: '1rem',
    fontWeight: 700,
    color: '#fff',
    cursor: 'pointer',
    letterSpacing: '-0.01em',
    marginTop: 6,
  },

  // Push banner
  pushBanner: {
    margin: '0 1rem 0.5rem',
    background: '#1c1c1e',
    border: '1px solid rgba(255,159,10,0.25)',
    borderRadius: 14,
    padding: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  pushAllow: {
    background: 'linear-gradient(135deg, #ff9f0a, #ff6b00)',
    border: 'none',
    borderRadius: 9,
    padding: '0.45rem 0.875rem',
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: '#fff',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  pushDismiss: {
    background: 'transparent',
    border: '1px solid #2c2c2e',
    borderRadius: 9,
    padding: '0.45rem 0.6rem',
    color: '#48484e',
    cursor: 'pointer',
    fontSize: '0.8125rem',
  },
  pushActive: {
    margin: '0 1rem 0.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    fontSize: '0.75rem',
    color: '#30d158',
    fontWeight: 600,
    padding: '0.5rem 0.25rem',
  },

  // Top bar
  topBar: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    background: 'rgba(10,10,11,0.92)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
  },
  topBarLeft:  { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36, height: 36,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #ff9f0a, #ff6b00)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1rem', fontWeight: 700, color: '#fff', flexShrink: 0,
  },
  driverName:  { fontWeight: 700, color: '#e8e8ed', fontSize: '0.9375rem', margin: 0, lineHeight: 1.3 },
  driverHandle:{ fontSize: '0.75rem', color: '#636366', margin: 0, fontFamily: 'monospace' },
  refreshBtn: {
    background: 'transparent',
    border: '1px solid #2c2c2e',
    borderRadius: 8,
    padding: '0.35rem 0.6rem',
    color: '#636366',
    cursor: 'pointer',
    fontSize: '1rem',
    lineHeight: 1,
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #2c2c2e',
    borderRadius: 8,
    padding: '0.35rem 0.625rem',
    color: '#636366',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 500,
  },

  // Stats
  statsRow: {
    display: 'flex',
    gap: 10,
    padding: '1rem',
    overflowX: 'auto',
    scrollbarWidth: 'none',
  },
  statCard: {
    flex: '1 0 80px',
    background: '#1c1c1e',
    borderRadius: 14,
    padding: '0.875rem',
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  statNum: { fontSize: '1.5rem', fontWeight: 800, color: '#e8e8ed', margin: 0, letterSpacing: '-0.03em' },
  statLbl: { fontSize: '0.7rem', color: '#636366', margin: '3px 0 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' },

  // Feed
  feed: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '0 1rem 2rem',
  },
  sectionHdr: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#ff9f0a',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    margin: '0.5rem 0 0',
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },

  // Order card
  orderCard: {
    background: '#1c1c1e',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 18,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'border-color 0.15s',
  },
  cardTopBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '0.9rem 1rem',
    background: 'transparent',
    border: 'none',
    width: '100%',
    cursor: 'pointer',
    textAlign: 'left',
  },
  statusDot: {
    width: 10, height: 10,
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 0 6px currentColor',
  },
  orderId: {
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: '#e8e8ed',
    fontFamily: 'monospace',
    letterSpacing: '0.04em',
  },
  statusChip: {
    fontSize: '0.7rem',
    fontWeight: 700,
    border: '1px solid',
    borderRadius: 99,
    padding: '1px 7px',
    letterSpacing: '0.02em',
  },
  codChip: {
    fontSize: '0.65rem',
    fontWeight: 800,
    background: '#3a2800',
    color: '#ff9f0a',
    borderRadius: 99,
    padding: '1px 6px',
    letterSpacing: '0.04em',
  },
  orderMeta: {
    fontSize: '0.8125rem',
    color: '#636366',
    margin: '3px 0 0',
    fontWeight: 500,
  },

  // Items row — always visible on card
  itemsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    padding: '0 1rem 0.75rem',
  },

  // Call + Nav buttons row
  actionRow: {
    display: 'flex',
    gap: 8,
    padding: '0 1rem 0.75rem',
  },

  callBtn: {
    background: 'linear-gradient(135deg, #30d158, #25a244)',
    color: '#fff',
    borderRadius: 12,
    padding: '0.6rem 1.1rem',
    fontSize: '0.875rem',
    fontWeight: 700,
    textDecoration: 'none',
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    boxShadow: '0 4px 12px rgba(48,209,88,0.3)',
  },

  // Expanded body
  cardBody: {
    padding: '0 1rem 0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.875rem',
  },
  addrBlock: {
    background: '#252527',
    borderRadius: 12,
    padding: '0.75rem',
  },
  itemsBlock: {
    background: '#252527',
    borderRadius: 12,
    padding: '0.75rem',
  },
  notesBlock: {
    background: '#252527',
    borderRadius: 12,
    padding: '0.75rem',
  },
  detailLabel: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: '#636366',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: 0,
  },
  addrMain:   { fontSize: '0.9375rem', fontWeight: 700, color: '#e8e8ed', margin: '4px 0 0' },
  addrDetail: { fontSize: '0.8125rem', color: '#9a9a9f', margin: '2px 0 0' },
  mapsLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: '#0a84ff',
    textDecoration: 'none',
  },
  navBtn: {
    background: 'linear-gradient(135deg, #0a84ff, #0066cc)',
    color: '#fff',
    borderRadius: 9,
    padding: '0.3rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: 700,
    textDecoration: 'none',
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  navBtnInline: {
    background: 'linear-gradient(135deg, #0a84ff, #0066cc)',
    color: '#fff',
    borderRadius: 12,
    padding: '0.6rem 0.875rem',
    fontSize: '0.875rem',
    fontWeight: 700,
    textDecoration: 'none',
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    boxShadow: '0 4px 12px rgba(10,132,255,0.3)',
  },
  itemChip: {
    background: '#1c1c1e',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: '0.25rem 0.625rem',
    fontSize: '0.8125rem',
    color: '#ababaf',
  },
  notesText: {
    fontSize: '0.875rem',
    color: '#9a9a9f',
    margin: '4px 0 0',
    lineHeight: 1.5,
  },
  orderTime: {
    fontSize: '0.7rem',
    color: '#48484e',
    fontWeight: 500,
    margin: 0,
  },

  // Action buttons
  actions: {
    padding: '0.75rem 1rem',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  btnOTW: {
    width: '100%',
    background: 'linear-gradient(135deg, #ff9f0a, #ff6b00)',
    border: 'none',
    borderRadius: 14,
    padding: '0.875rem',
    fontSize: '1rem',
    fontWeight: 700,
    color: '#fff',
    cursor: 'pointer',
    letterSpacing: '-0.01em',
  },
  btnDelivered: {
    width: '100%',
    background: 'linear-gradient(135deg, #30d158, #25a244)',
    border: 'none',
    borderRadius: 14,
    padding: '0.875rem',
    fontSize: '1rem',
    fontWeight: 700,
    color: '#fff',
    cursor: 'pointer',
    letterSpacing: '-0.01em',
    boxShadow: '0 4px 20px rgba(48,209,88,0.25)',
  },
  doneRow: {
    padding: '0.625rem 1rem',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#30d158',
    textAlign: 'center',
  },

  // Confirmation modal
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
  },
  modalSheet: {
    background: '#1c1c1e',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: '24px 24px 0 0',
    padding: '1rem 1.5rem 2rem',
    width: '100%',
    maxWidth: 430,
  },
  modalHandle: {
    width: 40, height: 4,
    background: '#3a3a3c',
    borderRadius: 2,
    margin: '0 auto 1.25rem',
  },
  modalTitle: {
    fontSize: '1.125rem',
    fontWeight: 800,
    color: '#e8e8ed',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  modalSub: {
    fontSize: '0.8125rem',
    color: '#636366',
    margin: '5px 0 0',
    fontFamily: 'monospace',
  },
  codReminder: {
    marginTop: '1rem',
    background: '#2a1e00',
    border: '1px solid rgba(255,159,10,0.3)',
    borderRadius: 14,
    padding: '0.875rem',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  codReminderTitle: {
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: '#ff9f0a',
    margin: 0,
  },
  codReminderSub: {
    fontSize: '0.75rem',
    color: '#9a7535',
    margin: '4px 0 0',
    lineHeight: 1.5,
  },
  modalCancelBtn: {
    flex: 1,
    background: '#2c2c2e',
    border: 'none',
    borderRadius: 14,
    padding: '0.875rem',
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: '#ababaf',
    cursor: 'pointer',
  },
  modalConfirmBtn: {
    flex: 2,
    border: 'none',
    borderRadius: 14,
    padding: '0.875rem',
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: '#fff',
    cursor: 'pointer',
    letterSpacing: '-0.01em',
  },
}
