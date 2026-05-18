'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAdminAuth } from '@/app/admin/_hooks/useAdminAuth'
import { AdminChecking, AdminLoginForm } from '@/app/admin/_hooks/AdminGate'

// ─── Types ───────────────────────────────────────────────────────────────────

type CartItem = {
  productId: string
  name: string
  pricePerKg: number
  quantity: number
}

type UserRow = {
  id: string
  phone: string
  name: string | null
  joinedAt: string
  totalOrders: number
  completedOrders: number
  cancelledOrders: number
  totalSpent: number
  avgOrderValue: number
  lastOrderAt: string | null
  lastOrderStatus: string | null
  cartItems: CartItem[] | null
  cartTotal: number | null
  cartUpdatedAt: string | null
}

type LastOrderStatus = 'placed' | 'packed' | 'on_the_way' | 'delivered' | 'cancelled'

// ─── CSV Export ──────────────────────────────────────────────────────────────

function exportCSV(users: UserRow[]) {
  const headers = ['Phone','Name','Total Orders','Completed','Cancelled','Total Spent','Avg Order','Last Order','Last Status','Cart Items','Cart Total','Joined']
  const rows = users.map(u => [
    u.phone, u.name ?? '', u.totalOrders, u.completedOrders, u.cancelledOrders,
    u.totalSpent, Math.round(u.avgOrderValue), u.lastOrderAt?.slice(0,10) ?? '',
    u.lastOrderStatus ?? '', u.cartItems?.length ?? 0, u.cartTotal ?? 0,
    u.joinedAt?.slice(0,10) ?? ''
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `customers-${new Date().toISOString().slice(0,10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  return phone
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 60)  return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  return `${days}d ago`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
}

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  placed:     { bg: '#f59e0b', text: '#fff' },
  packed:     { bg: '#3b82f6', text: '#fff' },
  on_the_way: { bg: '#8b5cf6', text: '#fff' },
  delivered:  { bg: '#16a34a', text: '#fff' },
  cancelled:  { bg: '#9ca3af', text: '#fff' },
}

const STATUS_LABEL: Record<string, string> = {
  placed:     'Placed',
  packed:     'Packed',
  on_the_way: 'On the way',
  delivered:  'Delivered',
  cancelled:  'Cancelled',
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLOR[status] ?? { bg: '#e5e7eb', text: '#374151' }
  return (
    <span style={{
      background: c.bg,
      color: c.text,
      fontSize: '0.6875rem',
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: 20,
      whiteSpace: 'nowrap',
      letterSpacing: '0.02em',
    }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

// ─── Expanded Row ─────────────────────────────────────────────────────────────

function ExpandedRow({ user }: { user: UserRow }) {
  const hasCart = user.cartItems && user.cartItems.length > 0
  const [copied, setCopied] = React.useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(user.phone)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <tr>
      <td colSpan={10} style={{ padding: 0, borderBottom: '1px solid #e5e7eb' }}>
        <div style={{
          background: '#fafafa',
          borderTop: '1px solid #f3f4f6',
          padding: '1rem 1.25rem',
          display: 'flex',
          gap: '2rem',
          flexWrap: 'wrap',
        }}>
          {/* Action buttons */}
          <div style={{ width: '100%', display: 'flex', gap: 8, marginBottom: 4 }}>
            <a
              href={`https://wa.me/91${user.phone}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ background: '#dcfce7', color: '#15803d', borderRadius: 20, padding: '0.35rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', border: 'none', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            >
              💬 WhatsApp
            </a>
            <button
              onClick={e => { e.stopPropagation(); handleCopy() }}
              style={{ background: '#f3f4f6', color: '#374151', borderRadius: 20, padding: '0.35rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', border: 'none' }}
            >
              {copied ? '✓ Copied!' : '📋 Copy number'}
            </button>
          </div>
          {/* Order summary */}
          <div style={{ flex: '1 1 220px' }}>
            <p style={S.expandLabel}>Order Summary</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
              <div style={S.expandRow}>
                <span style={S.expandKey}>Total Orders</span>
                <span style={S.expandVal}>{user.totalOrders}</span>
              </div>
              <div style={S.expandRow}>
                <span style={S.expandKey}>Completed</span>
                <span style={{ ...S.expandVal, color: '#16a34a', fontWeight: 700 }}>{user.completedOrders}</span>
              </div>
              <div style={S.expandRow}>
                <span style={S.expandKey}>Cancelled</span>
                <span style={{ ...S.expandVal, color: '#9ca3af' }}>{user.cancelledOrders}</span>
              </div>
              <div style={S.expandRow}>
                <span style={S.expandKey}>Total Spent</span>
                <span style={{ ...S.expandVal, fontWeight: 700 }}>₹{user.totalSpent}</span>
              </div>
              <div style={S.expandRow}>
                <span style={S.expandKey}>Avg Order</span>
                <span style={S.expandVal}>₹{user.avgOrderValue}</span>
              </div>
              <div style={S.expandRow}>
                <span style={S.expandKey}>Last Order</span>
                <span style={S.expandVal}>{relativeTime(user.lastOrderAt)}</span>
              </div>
              {user.lastOrderStatus && (
                <div style={S.expandRow}>
                  <span style={S.expandKey}>Last Status</span>
                  <StatusBadge status={user.lastOrderStatus} />
                </div>
              )}
            </div>
          </div>

          {/* Cart contents */}
          {hasCart && (
            <div style={{ flex: '1 1 220px' }}>
              <p style={S.expandLabel}>Cart Contents</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                {user.cartItems!.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.375rem 0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1a1109' }}>{item.name}</span>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: 6 }}>×{item.quantity} kg</span>
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#d97706' }}>₹{(item.pricePerKg * item.quantity).toFixed(0)}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px dashed #e5e7eb', paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151' }}>Cart Total</span>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#d97706' }}>₹{user.cartTotal ?? 0}</span>
                </div>
                {user.cartUpdatedAt && (
                  <p style={{ fontSize: '0.6875rem', color: '#9ca3af', margin: 0 }}>
                    Updated {relativeTime(user.cartUpdatedAt)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [loginErr,  setLoginErr]  = useState('')
  const [logging,   setLogging]   = useState(false)
  const [users,     setUsers]     = useState<UserRow[]>([])
  const [loading,   setLoading]   = useState(false)
  const [search,    setSearch]    = useState('')
  const [expanded,  setExpanded]  = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Not authorized')
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  const { authed, checking, login } = useAdminAuth(loadUsers)

  async function handleLogin(pw: string) {
    setLogging(true)
    setLoginErr('')
    const err = await login(pw)
    if (err) setLoginErr(err)
    setLogging(false)
  }

  // Filtered users
  const filtered = useMemo(() => {
    if (!search.trim()) return users
    const q = search.trim().toLowerCase()
    return users.filter(u =>
      u.phone.toLowerCase().includes(q) ||
      (u.name ?? '').toLowerCase().includes(q)
    )
  }, [users, search])

  // Summary stats
  const summary = useMemo(() => {
    const totalCustomers = users.length
    const activeCarts    = users.filter(u => u.cartItems && u.cartItems.length > 0).length
    const totalRevenue   = users.reduce((sum, u) => sum + (u.totalSpent ?? 0), 0)
    return { totalCustomers, activeCarts, totalRevenue }
  }, [users])

  // Abandoned carts
  const abandonedCarts = useMemo(() =>
    filtered.filter(u => u.cartItems && u.cartItems.length > 0),
    [filtered]
  )

  if (checking) return <AdminChecking />

  if (!authed) {
    return (
      <AdminLoginForm
        onLogin={handleLogin}
        error={loginErr}
        loading={logging}
      />
    )
  }

  return (
    <div style={{ padding: 'clamp(1rem, 4vw, 2rem) clamp(0.75rem, 4vw, 2.5rem)', fontFamily: 'system-ui' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.125rem, 4vw, 1.5rem)', fontWeight: 700, color: '#1a1109', margin: 0 }}>
            Customers
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#6b5744', marginTop: 4 }}>
            {loading ? 'Loading…' : `${users.length} registered customers`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => exportCSV(users)}
            style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '0.4rem 0.875rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, fontFamily: 'system-ui' }}
          >
            ↓ Export CSV
          </button>
          <button
            onClick={loadUsers}
            style={{ background: 'transparent', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.8125rem', color: '#6b5744', fontFamily: 'system-ui' }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: '0.875rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Customers',  value: summary.totalCustomers,         color: '#1a1109' },
          { label: 'Active Carts',     value: summary.activeCarts,            color: '#d97706' },
          { label: 'Total Revenue',    value: `₹${summary.totalRevenue.toLocaleString('en-IN')}`, color: '#16a34a' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '0.875rem 1.25rem', flex: '1 1 140px', minWidth: 140 }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: '1.375rem', fontWeight: 800, color: s.color, margin: '4px 0 0' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="search"
          placeholder="Search by phone or name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            maxWidth: 400,
            border: '1.5px solid #e5e7eb',
            borderRadius: 8,
            padding: '0.625rem 1rem',
            fontSize: '0.9375rem',
            outline: 'none',
            fontFamily: 'system-ui',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Main table */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: 12 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#d97706', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Loading customers…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
          {search ? 'No customers match your search.' : 'No customers yet.'}
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: '2rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6', background: '#fafafa' }}>
                  {['Phone', 'Name', 'Orders', 'Total Spent', 'Avg Order', 'Last Order', 'Last Status', 'Cart', 'Joined', ''].map(col => (
                    <th key={col} style={S.th}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <React.Fragment key={user.id}>
                    <tr
                      onClick={() => setExpanded(expanded === user.id ? null : user.id)}
                      style={{
                        borderBottom: expanded === user.id ? 'none' : '1px solid #f3f4f6',
                        cursor: 'pointer',
                        background: expanded === user.id ? '#fffbf0' : undefined,
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { if (expanded !== user.id) (e.currentTarget as HTMLTableRowElement).style.background = '#fafafa' }}
                      onMouseLeave={e => { if (expanded !== user.id) (e.currentTarget as HTMLTableRowElement).style.background = '' }}
                    >
                      {/* Phone */}
                      <td style={{ ...S.td, fontFamily: 'monospace', fontWeight: 700, color: '#1a1109' }}>
                        {formatPhone(user.phone)}
                      </td>
                      {/* Name */}
                      <td style={{ ...S.td, color: user.name ? '#374151' : '#d1d5db' }}>
                        {user.name ?? '—'}
                      </td>
                      {/* Orders */}
                      <td style={S.td}>
                        <span style={{ color: '#374151' }}>{user.totalOrders}</span>
                        {user.completedOrders > 0 && (
                          <span style={{ color: '#16a34a', fontWeight: 700, marginLeft: 4 }}>/{user.completedOrders}</span>
                        )}
                      </td>
                      {/* Total Spent */}
                      <td style={{ ...S.td, fontWeight: 700 }}>₹{user.totalSpent.toLocaleString('en-IN')}</td>
                      {/* Avg Order */}
                      <td style={S.td}>₹{user.avgOrderValue.toFixed(0)}</td>
                      {/* Last Order */}
                      <td style={{ ...S.td, color: user.lastOrderAt ? '#374151' : '#d1d5db' }}>
                        {relativeTime(user.lastOrderAt)}
                      </td>
                      {/* Last Status */}
                      <td style={S.td}>
                        {user.lastOrderStatus
                          ? <StatusBadge status={user.lastOrderStatus as LastOrderStatus} />
                          : <span style={{ color: '#d1d5db' }}>—</span>
                        }
                      </td>
                      {/* Cart */}
                      <td style={S.td}>
                        {user.cartItems && user.cartItems.length > 0
                          ? (
                            <span style={{ color: '#d97706', fontWeight: 600 }}>
                              🛒 {user.cartItems.length} item{user.cartItems.length !== 1 ? 's' : ''} ₹{user.cartTotal ?? 0}
                            </span>
                          )
                          : <span style={{ color: '#d1d5db' }}>—</span>
                        }
                      </td>
                      {/* Joined */}
                      <td style={{ ...S.td, color: '#9ca3af' }}>{formatDate(user.joinedAt)}</td>
                      {/* WhatsApp quick action */}
                      <td style={{ ...S.td, paddingLeft: 4 }} onClick={e => e.stopPropagation()}>
                        <a
                          href={`https://wa.me/91${user.phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ background: '#dcfce7', color: '#15803d', borderRadius: 20, padding: '0.25rem 0.5rem', fontSize: '0.875rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}
                          title={`WhatsApp ${user.phone}`}
                        >
                          💬
                        </a>
                      </td>
                    </tr>
                    {expanded === user.id && <ExpandedRow user={user} />}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Abandoned Carts section */}
      {abandonedCarts.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1109', margin: '0 0 0.875rem' }}>
            Abandoned Carts
            <span style={{ background: '#fef3c7', color: '#d97706', fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, marginLeft: 8 }}>
              {abandonedCarts.length}
            </span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {abandonedCarts.map(user => (
              <div key={user.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '0.875rem 1.125rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                {/* Phone */}
                <div style={{ flex: '0 0 auto' }}>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Customer</p>
                  <p style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1a1109', fontSize: '0.875rem', margin: '2px 0 0' }}>{formatPhone(user.phone)}</p>
                  {user.name && <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '1px 0 0' }}>{user.name}</p>}
                </div>

                {/* Cart items summary */}
                <div style={{ flex: '1 1 200px' }}>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Items</p>
                  <p style={{ fontSize: '0.8125rem', color: '#374151', margin: '2px 0 0' }}>
                    {user.cartItems!.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                  </p>
                </div>

                {/* Cart total */}
                <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Total</p>
                  <p style={{ fontSize: '1rem', fontWeight: 800, color: '#d97706', margin: '2px 0 0' }}>₹{user.cartTotal ?? 0}</p>
                </div>

                {/* Last updated */}
                <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Updated</p>
                  <p style={{ fontSize: '0.8125rem', color: '#9ca3af', margin: '2px 0 0' }}>{relativeTime(user.cartUpdatedAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  th: {
    padding: '0.625rem 1rem',
    textAlign: 'left',
    fontSize: '0.6875rem',
    fontWeight: 700,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '0.75rem 1rem',
    color: '#374151',
    fontSize: '0.8125rem',
    verticalAlign: 'middle',
  },
  expandLabel: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    color: '#9ca3af',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    margin: 0,
  },
  expandRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  expandKey: {
    fontSize: '0.8125rem',
    color: '#6b7280',
  },
  expandVal: {
    fontSize: '0.8125rem',
    color: '#1a1109',
  },
}
