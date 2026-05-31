'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseBrowser, type OrderRow, type DriverRow } from '@/lib/supabase-browser'

const STATUS_OPTIONS: OrderRow['order_status'][] = ['placed', 'packed', 'on_the_way', 'delivered']

const STATUS_LABELS: Record<OrderRow['order_status'], string> = {
  placed:     '📦 Placed',
  packed:     '👨‍🍳 Packed',
  on_the_way: '🛵 On the way',
  delivered:  '✅ Delivered',
  cancelled:  '❌ Cancelled',
}

const STATUS_COLOR: Record<OrderRow['order_status'], string> = {
  placed:     '#f59e0b',
  packed:     '#3b82f6',
  on_the_way: '#8b5cf6',
  delivered:  '#16a34a',
  cancelled:  '#9ca3af',
}

export default function AdminOrdersPage() {
  const [authed,   setAuthed]   = useState(false)
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [logging,  setLogging]  = useState(false)
  const [loginErr, setLoginErr] = useState('')

  const [orders,    setOrders]    = useState<OrderRow[]>([])
  const [drivers,   setDrivers]   = useState<DriverRow[]>([])
  const [loading,   setLoading]   = useState(false)
  const [saving,    setSaving]    = useState<string | null>(null)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [etaInputs, setEtaInputs] = useState<Record<string, string>>({})
  const [filter,    setFilter]    = useState<'active' | 'all'>('active')
  const [search,    setSearch]    = useState('')
  const [selected,  setSelected]  = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<OrderRow['order_status']>('placed')
  const [bulkUpdating, setBulkUpdating] = useState(false)

  const supabase = getSupabaseBrowser()

  const loadOrders = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    try {
      const res = await fetch('/api/orders')
      if (!res.ok) throw new Error('Not authorized')
      const raw = await res.json()
      const data: OrderRow[] = Array.isArray(raw) ? raw : []
      setOrders(data)
      setEtaInputs(prev => {
        const next: Record<string, string> = {}
        data.forEach(o => {
          // Preserve any value the admin is actively editing; fill in DB value for new rows
          next[o.id] = o.id in prev ? prev[o.id] : (o.eta_minutes?.toString() ?? '')
        })
        return next
      })
    } catch (e) {
      console.error(e)
    } finally {
      if (showSpinner) setLoading(false)
    }
  }, [])

  const loadDrivers = useCallback(async () => {
    try {
      const res = await fetch('/api/drivers')
      if (res.ok) setDrivers(await res.json())
    } catch {}
  }, [])

  useEffect(() => {
    fetch('/api/admin/ping').then(r => {
      if (r.ok) { setAuthed(true); loadOrders(); loadDrivers() }
    }).catch(() => {}).finally(() => setChecking(false))
  }, [loadOrders, loadDrivers])

  // Realtime subscription for new/updated orders
  useEffect(() => {
    if (!authed) return
    const channel = supabase
      .channel('admin:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadOrders(false))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [authed, supabase, loadOrders])

  // Polling fallback every 5s — silent (no spinner)
  useEffect(() => {
    if (!authed) return
    const t = setInterval(() => loadOrders(false), 5_000)
    return () => clearInterval(t)
  }, [authed, loadOrders])

  // Instant silent refresh when SW delivers a push notification to this tab
  useEffect(() => {
    if (!authed || !('serviceWorker' in navigator)) return
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'ORDER_UPDATE') loadOrders(false)
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [authed, loadOrders])

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setLogging(true); setLoginErr('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) { setLoginErr('Incorrect password'); return }
      setAuthed(true)
      loadOrders()
      loadDrivers()
    } catch { setLoginErr('Network error') }
    finally { setLogging(false) }
  }

  async function updateStatus(orderId: string, newStatus: OrderRow['order_status']) {
    setSaving(orderId)
    try {
      const etaRaw = etaInputs[orderId]
      const eta = etaRaw ? parseInt(etaRaw, 10) : null
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_status: newStatus,
          eta_minutes: isNaN(eta as number) ? null : eta,
        }),
      })
      setOrders(prev => prev.map(o =>
        o.id === orderId
          ? { ...o, order_status: newStatus, eta_minutes: isNaN(eta as number) ? null : eta }
          : o
      ))
    } finally { setSaving(null) }
  }

  async function updateEta(orderId: string) {
    setSaving(orderId + '-eta')
    const etaRaw = etaInputs[orderId]
    const eta = etaRaw ? parseInt(etaRaw, 10) : null
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eta_minutes: isNaN(eta as number) ? null : eta }),
      })
      setOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, eta_minutes: isNaN(eta as number) ? null : eta } : o
      ))
    } finally { setSaving(null) }
  }

  async function confirmPayment(orderId: string) {
    setSaving(orderId + '-confirm')
    setOrderError(null)
    try {
      const res = await fetch('/api/admin/confirm-payment', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ order_id: orderId }),
      })
      const data = await res.json()
      if (!res.ok) { setOrderError(data.error ?? 'Confirm failed'); return }
      // Reload orders so driver assignment + payment status update shows
      await loadOrders(false)
    } finally { setSaving(null) }
  }

  async function assignDriver(orderId: string, driverId: string) {
    setSaving(orderId + '-driver')
    setOrderError(null)
    const driver = drivers.find(d => d.id === driverId)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id:    driverId || null,
          driver_name:  driver?.name  || null,
          driver_phone: driver?.phone || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setOrderError(data.error ?? `Driver assignment failed (${res.status})`)
        return   // do NOT update local state — keep UI in sync with DB
      }
      setOrders(prev => prev.map(o =>
        o.id === orderId
          ? { ...o, driver_id: driverId || null, driver_name: driver?.name || null, driver_phone: driver?.phone || null }
          : o
      ))
    } finally { setSaving(null) }
  }

  if (checking) return null
  if (!authed) {
    return (
      <div style={S.loginWrap}>
        <div style={S.loginBox}>
          <h1 style={S.loginTitle}>Admin Sign In</h1>
          <form onSubmit={login} style={S.form}>
            <input type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)} style={S.input} autoFocus />
            {loginErr && <p style={S.err}>{loginErr}</p>}
            <button type="submit" style={S.loginBtn} disabled={logging}>
              {logging ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const baseDisplayed = filter === 'active'
    ? orders.filter(o => o.order_status !== 'delivered')
    : orders

  const displayed = search.trim()
    ? baseDisplayed.filter(o =>
        o.customer_phone?.includes(search) ||
        o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        o.delivery_address?.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        o.id.slice(0, 8).toUpperCase().includes(search.toUpperCase())
      )
    : baseDisplayed

  function toggleSelected(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const allDisplayedSelected =
    displayed.length > 0 && displayed.every(o => selected.has(o.id))

  function toggleSelectAll() {
    if (allDisplayedSelected) {
      setSelected(prev => {
        const next = new Set(prev)
        displayed.forEach(o => next.delete(o.id))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        displayed.forEach(o => next.add(o.id))
        return next
      })
    }
  }

  function exportCSV() {
    const base = filter === 'active' ? orders.filter(o => o.order_status !== 'delivered') : orders
    const toExport = search.trim()
      ? base.filter(o =>
          o.customer_phone?.includes(search) ||
          o.id.slice(0, 8).toUpperCase().includes(search.toUpperCase())
        )
      : base
    const rows = [
      ['Order ID', 'Date', 'Customer Name', 'Customer Phone', 'Status', 'Payment', 'Total (₹)', 'Items', 'Address', 'Notes'],
      ...toExport.map(o => {
        const addr = o.delivery_address
        const addrStr = addr
          ? [addr.houseNumber || addr.line1, addr.streetAddress, addr.landmark, addr.pincode]
              .filter(Boolean).join(', ')
          : ''
        const itemsStr = o.items.map(i => `${i.name} x${i.quantity}`).join(' | ')
        const nameStr  = o.customer_name ?? addr?.customerName ?? ''
        return [
          o.id.slice(0, 8).toUpperCase(),
          new Date(o.created_at).toLocaleString('en-IN'),
          nameStr,
          o.customer_phone ?? '',
          o.order_status,
          o.payment_status ?? '',
          o.total_amount ?? '',
          itemsStr,
          addrStr,
          o.notes ?? '',
        ]
      }),
    ]
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function bulkUpdateStatus() {
    if (selected.size === 0 || bulkUpdating) return
    setBulkUpdating(true)
    try {
      await Promise.all(
        Array.from(selected).map(id =>
          fetch(`/api/orders/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_status: bulkStatus }),
          })
        )
      )
      await loadOrders()
      setSelected(new Set())
    } finally {
      setBulkUpdating(false)
    }
  }

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Orders Dashboard</h1>
          <p style={S.subtitle}>
            {loading ? '⏳ Loading…' : `${orders.filter(o => o.order_status !== 'delivered').length} active · ${orders.length} total`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={S.filterGroup}>
            {(['active', 'all'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ ...S.filterBtn, ...(filter === f ? S.filterActive : {}) }}>
                {f === 'active' ? 'Active' : 'All orders'}
              </button>
            ))}
          </div>
          <button onClick={exportCSV}   style={S.refreshBtn}>⬇ Export CSV</button>
          <button onClick={() => loadOrders(true)} style={S.refreshBtn}>↻ Refresh</button>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search name, phone or order ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            border: '1.5px solid #e5e7eb',
            borderRadius: 8,
            padding: '0.5rem 0.75rem',
            width: 240,
            fontSize: '0.875rem',
            outline: 'none',
          }}
        />
      </div>

      {orderError && (
        <div style={{
          background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10,
          padding: '0.75rem 1rem', marginBottom: '0.75rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.875rem' }}>
            ⚠️ {orderError}
          </span>
          <button
            onClick={() => setOrderError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '1rem' }}
          >✕</button>
        </div>
      )}

      {displayed.length === 0 && !loading && (
        <div style={S.empty}>
          <p style={{ fontSize: '2.5rem', margin: 0 }}>📭</p>
          <p style={{ color: '#6b5744', fontWeight: 500, margin: 0 }}>
            {filter === 'active' ? 'No active orders right now' : 'No orders yet'}
          </p>
        </div>
      )}

      {displayed.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.5rem', paddingLeft: 4 }}>
          <input
            type="checkbox"
            checked={allDisplayedSelected}
            onChange={toggleSelectAll}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>Select all</span>
        </div>
      )}

      <div style={{ ...S.table, paddingBottom: selected.size > 0 ? '5rem' : 0 }}>
        {displayed.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            drivers={drivers}
            saving={saving === order.id || saving === order.id + '-eta' || saving === order.id + '-driver'}
            confirmPending={saving === order.id + '-confirm'}
            etaValue={etaInputs[order.id] ?? ''}
            onEtaChange={val => setEtaInputs(prev => ({ ...prev, [order.id]: val }))}
            onStatusChange={s => updateStatus(order.id, s)}
            onEtaSave={() => updateEta(order.id)}
            onDriverAssign={dId => assignDriver(order.id, dId)}
            onConfirmPayment={() => confirmPayment(order.id)}
            checked={selected.has(order.id)}
            onToggleCheck={() => toggleSelected(order.id)}
          />
        ))}
      </div>

      {selected.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#fff', borderTop: '2px solid #d97706',
          padding: '0.75rem 1.5rem',
          display: 'flex', alignItems: 'center', gap: 12,
          zIndex: 50,
        }}>
          <span style={{ fontWeight: 600, color: '#1a1109', fontSize: '0.9rem', flex: '0 0 auto' }}>
            {selected.size} order{selected.size !== 1 ? 's' : ''} selected
          </span>
          <select
            value={bulkStatus}
            onChange={e => setBulkStatus(e.target.value as OrderRow['order_status'])}
            disabled={bulkUpdating}
            style={{ border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.4rem 0.625rem', fontSize: '0.875rem', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
          >
            {(['placed', 'packed', 'on_the_way', 'delivered', 'cancelled'] as OrderRow['order_status'][]).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button
            onClick={bulkUpdateStatus}
            disabled={bulkUpdating}
            style={{ background: '#1a1109', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
          >
            {bulkUpdating ? 'Updating…' : 'Update All'}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            disabled={bulkUpdating}
            style={{ background: 'transparent', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.5rem 0.875rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem', color: '#6b7280' }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}

function OrderCard({
  order, drivers, saving, confirmPending, etaValue, onEtaChange, onStatusChange, onEtaSave, onDriverAssign, onConfirmPayment, checked, onToggleCheck,
}: {
  order: OrderRow
  drivers: DriverRow[]
  saving: boolean
  confirmPending: boolean
  etaValue: string
  onEtaChange: (v: string) => void
  onStatusChange: (s: OrderRow['order_status']) => void
  onEtaSave: () => void
  onDriverAssign: (driverId: string) => void
  onConfirmPayment: () => void
  checked: boolean
  onToggleCheck: () => void
}) {
  const color = STATUS_COLOR[order.order_status]
  const addr  = order.delivery_address

  return (
    <div style={{ ...S.card, ...(checked ? { borderColor: '#d97706', background: '#fffbf0' } : {}) }}>
      {/* Header row */}
      <div style={S.cardHead}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggleCheck}
            style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
          />
          <div style={{ ...S.dot, background: color }} />
          <div>
            <p style={S.orderId}>#{order.id.slice(0, 8).toUpperCase()}</p>
            <p style={S.orderTime}>
              {new Date(order.created_at).toLocaleString('en-IN', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={S.amount}>₹{order.total_amount}</p>
          <p style={{ ...S.itemCount, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
            {order.payment_status === 'cod'     && <span style={S.codBadge}>COD</span>}
            {order.payment_status === 'paid'    && <span style={{ ...S.codBadge, background: '#16a34a' }}>✓ Paid</span>}
            {order.payment_status === 'pending' && <span style={{ ...S.codBadge, background: '#f59e0b' }}>⏳ Pending</span>}
            {order.payment_status === 'failed'  && <span style={{ ...S.codBadge, background: '#dc2626' }}>✗ Failed</span>}
          </p>
        </div>
      </div>

      {/* Customer name + phone */}
      {(order.customer_name || order.delivery_address?.customerName || order.customer_phone) && (
        <div style={S.phoneBox}>
          <span style={{ fontSize: '0.875rem' }}>👤</span>
          <div style={{ flex: 1 }}>
            {(order.customer_name || order.delivery_address?.customerName) && (
              <p style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#1a1109', margin: 0 }}>
                {order.customer_name ?? order.delivery_address?.customerName}
              </p>
            )}
            {order.customer_phone && (
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6b7280', margin: '2px 0 0', fontFamily: 'monospace' }}>
                {order.customer_phone}
              </p>
            )}
          </div>
          {order.customer_phone && (
            <a
              href={`tel:${order.customer_phone}`}
              style={{ background: '#16a34a', color: '#fff', borderRadius: 8, padding: '0.4rem 0.875rem', fontSize: '0.8125rem', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              📲 Call
            </a>
          )}
        </div>
      )}

      {/* Delivery Address */}
      {addr && (
        <div style={S.addrBox}>
          <span style={S.addrIcon}>📍</span>
          <div style={{ flex: 1 }}>
            {(addr.houseNumber || addr.line1) && (
              <p style={{ ...S.addrLine, color: '#1a1109', fontWeight: 700 }}>
                {addr.houseNumber || addr.line1}
              </p>
            )}
            {addr.streetAddress && <p style={S.addrSub}>{addr.streetAddress}</p>}
            {addr.landmark  && <p style={S.addrSub}>Near: {addr.landmark}</p>}
            {addr.pincode   && <p style={S.addrSub}>Pincode: {addr.pincode}</p>}
            {addr.lat && addr.lng && (
              <a
                href={addr.mapsUrl ?? `https://maps.google.com/?q=${addr.lat},${addr.lng}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: '0.7rem', fontWeight: 700, color: '#1d6bf3', textDecoration: 'none' }}
              >
                🗺 Open in Google Maps
                <span style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 400 }}>
                  ({addr.lat.toFixed(5)}, {addr.lng.toFixed(5)})
                </span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Items */}
      <div style={S.items}>
        {order.items.map((item, i) => (
          <span key={i} style={S.item}>
            {item.name} × {item.quantity} pc{item.quantity !== 1 ? 's' : ''}
          </span>
        ))}
      </div>

      {/* Notes */}
      {order.notes && (
        <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>Instructions</p>
          <p style={{ fontSize: '0.8125rem', color: '#475569', margin: 0 }}>{order.notes}</p>
        </div>
      )}

      {/* Controls */}
      <div style={S.controls}>
        {/* Status dropdown */}
        <div style={{ flex: '1 1 160px' }}>
          <label style={S.label}>Status</label>
          <select
            value={order.order_status}
            onChange={e => onStatusChange(e.target.value as OrderRow['order_status'])}
            disabled={saving}
            style={{ ...S.select, borderColor: color, color }}
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* ETA input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 120px', minWidth: 120 }}>
          <label style={S.label}>ETA (min)</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="number" min={0} max={300} placeholder="e.g. 30"
              value={etaValue}
              onChange={e => onEtaChange(e.target.value)}
              style={S.etaInput}
              disabled={saving}
            />
            <button onClick={onEtaSave} disabled={saving} style={S.etaBtn}>
              {saving ? '…' : 'Set'}
            </button>
          </div>
        </div>

        {/* Driver assignment */}
        {drivers.length > 0 && (
          <div style={{ flex: '1 1 170px' }}>
            <label style={S.label}>Assign Driver</label>
            {(order.payment_status !== 'cod' && order.payment_status !== 'paid') ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{
                  background: '#fef3c7', border: '1.5px solid #fde68a', borderRadius: 8,
                  padding: '0.5rem 0.75rem', fontSize: '0.8125rem', color: '#92400e', fontWeight: 600,
                }}>
                  ⏳ Awaiting payment confirmation
                </div>
                <button
                  onClick={() => onConfirmPayment()}
                  disabled={confirmPending}
                  style={{
                    background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8,
                    padding: '0.45rem 0.9rem', fontWeight: 700, fontSize: '0.8125rem',
                    cursor: 'pointer', opacity: confirmPending ? 0.6 : 1,
                  }}
                >
                  {confirmPending ? '⏳ Confirming…' : '✓ Confirm Payment Received'}
                </button>
              </div>
            ) : (
              <>
                <select
                  value={order.driver_id ?? ''}
                  onChange={e => onDriverAssign(e.target.value)}
                  disabled={saving}
                  style={{ ...S.select, borderColor: order.driver_id ? '#8b5cf6' : '#e5e7eb', color: order.driver_id ? '#8b5cf6' : '#6b7280' }}
                >
                  <option value=''>— Unassigned —</option>
                  {drivers.filter(d => d.is_active).map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {order.driver_name && (
                  <p style={{ fontSize: '0.7rem', color: '#8b5cf6', marginTop: 3, fontWeight: 600 }}>
                    🚗 {order.driver_name}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  loginWrap:   { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loginBox:    { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '2.5rem 2rem', width: 340, textAlign: 'center' },
  loginTitle:  { fontWeight: 700, color: '#1a1109', marginBottom: '1.5rem' },
  form:        { display: 'flex', flexDirection: 'column', gap: 12 },
  input:       { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.9375rem', outline: 'none' },
  err:         { color: '#dc2626', fontSize: '0.8125rem', margin: 0 },
  loginBtn:    { background: '#1a1109', color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer' },

  wrap:        { padding: 'clamp(1rem, 4vw, 2rem) clamp(0.75rem, 4vw, 2.5rem)' },
  header:      { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 10 },
  title:       { fontSize: 'clamp(1.125rem, 4vw, 1.5rem)', fontWeight: 700, color: '#1a1109', margin: 0 },
  subtitle:    { fontSize: '0.8125rem', color: '#6b5744', marginTop: 4 },
  filterGroup: { display: 'flex', border: '1.5px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' },
  filterBtn:   { background: 'transparent', border: 'none', padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.8125rem', color: '#6b5744', fontWeight: 500 },
  filterActive:{ background: '#1a1109', color: '#fff' },
  refreshBtn:  { background: 'transparent', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.8125rem', color: '#6b5744' },
  empty:       { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', gap: 12 },
  table:       { display: 'flex', flexDirection: 'column', gap: '0.875rem' },

  card:        { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 'clamp(0.875rem, 3vw, 1.25rem) clamp(0.875rem, 3vw, 1.5rem)', display: 'flex', flexDirection: 'column', gap: '0.875rem' },
  cardHead:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  dot:         { width: 10, height: 10, borderRadius: '50%', marginTop: 4, flexShrink: 0 },
  orderId:     { fontWeight: 700, color: '#1a1109', fontSize: '0.875rem', margin: 0, fontFamily: 'monospace' },
  orderTime:   { color: '#9ca3af', fontSize: '0.75rem', margin: '2px 0 0' },
  amount:      { fontWeight: 700, color: '#1a1109', fontSize: '1.125rem', margin: 0 },
  itemCount:   { color: '#9ca3af', fontSize: '0.75rem', margin: '2px 0 0' },

  codBadge:    { background: '#d97706', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', borderRadius: 4, letterSpacing: '0.05em' },

  phoneBox:    { display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.625rem 0.75rem' },

  addrBox:     { display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '0.625rem 0.75rem' },
  addrIcon:    { fontSize: '0.875rem', lineHeight: 1.5, flexShrink: 0 },
  addrLine:    { fontWeight: 600, color: '#1a1109', fontSize: '0.8125rem', margin: 0 },
  addrSub:     { color: '#92400e', fontSize: '0.75rem', margin: '1px 0 0' },

  items:       { display: 'flex', flexWrap: 'wrap', gap: 6 },
  item:        { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '0.25rem 0.625rem', fontSize: '0.8125rem', color: '#374151' },

  controls:    { display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' },
  label:       { fontSize: '0.6875rem', fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' },
  select:      { width: '100%', border: '2px solid', borderRadius: 8, padding: '0.5rem 0.625rem', fontSize: '0.875rem', fontWeight: 600, outline: 'none', cursor: 'pointer', background: '#fff' },
  etaInput:    { flex: 1, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.5rem 0.625rem', fontSize: '0.875rem', outline: 'none', minWidth: 0 },
  etaBtn:      { background: '#d97706', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 0.75rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem', whiteSpace: 'nowrap' },
}
