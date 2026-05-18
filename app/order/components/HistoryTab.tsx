'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Loader2, RotateCcw, ChevronDown, Archive, Scissors, CheckCircle2, XCircle } from 'lucide-react'
import { type OrderRow, type CartItem } from '@/lib/supabase-browser'
import type { AuthUser } from '@/lib/auth-types'

const PAGE_SIZE = 10

// ─── Date grouping ────────────────────────────────────────────────────────────

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function getDateGroup(dateStr: string): string {
  const date      = new Date(dateStr)
  const now       = new Date()
  const today     = startOfDay(now)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const weekAgo   = new Date(today); weekAgo.setDate(today.getDate() - 7)
  const monthAgo  = new Date(today); monthAgo.setDate(today.getDate() - 30)
  const orderDay  = startOfDay(date)

  if (orderDay.getTime() === today.getTime())     return 'Today'
  if (orderDay.getTime() === yesterday.getTime()) return 'Yesterday'
  if (orderDay >= weekAgo)                         return 'This week'
  if (orderDay >= monthAgo)                        return 'This month'
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function groupOrders(orders: OrderRow[]): { label: string; orders: OrderRow[] }[] {
  const groups = new Map<string, OrderRow[]>()
  for (const order of orders) {
    const label = getDateGroup(order.created_at)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(order)
  }
  return Array.from(groups.entries()).map(([label, orders]) => ({ label, orders }))
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderRow['order_status'] }) {
  if (status === 'cancelled') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full tracking-wide"
        style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}
      >
        <XCircle size={10} strokeWidth={2.5} />
        Cancelled
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full tracking-wide"
      style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}
    >
      <CheckCircle2 size={10} strokeWidth={2.5} />
      Delivered
    </span>
  )
}

// ─── Group header ─────────────────────────────────────────────────────────────

function GroupHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-1 pt-5 pb-2.5">
      <span
        className="text-[9px] font-black tracking-[0.18em] whitespace-nowrap"
        style={{ color: '#B45309' }}
      >
        {label.toUpperCase()}
      </span>
      <div className="flex-1 h-px" style={{ background: 'rgba(217,119,6,0.15)' }} />
    </div>
  )
}

// ─── Receipt card ─────────────────────────────────────────────────────────────

function ReceiptCard({
  order,
  expanded,
  onToggle,
  onReorder,
}: {
  order: OrderRow
  expanded: boolean
  onToggle: () => void
  onReorder: (order: OrderRow) => void
}) {
  const date      = new Date(order.created_at)
  const timeStr   = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  const dateStr   = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const delivered = order.order_status !== 'cancelled'
  const preview   = order.items.slice(0, 2).map(it => it.name).join(', ') +
                    (order.items.length > 2 ? ` +${order.items.length - 2}` : '')

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: '#FFFFFF',
        border: '1.5px solid rgba(217,119,6,0.12)',
        boxShadow: '0 2px 16px rgba(124,45,18,0.07), 0 1px 4px rgba(0,0,0,0.03)',
      }}
    >
      {/* Left accent bar via top border */}
      <div
        style={{
          height: 3,
          background: delivered
            ? 'linear-gradient(90deg, #059669, #34D399)'
            : 'linear-gradient(90deg, #9CA3AF, #D1D5DB)',
        }}
      />

      {/* ── Summary row (always visible) ── */}
      <button
        className="w-full text-left px-4 pt-3.5 pb-3 active:bg-stone-50/80 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Left: date + preview */}
          <div className="flex flex-col min-w-0 flex-1 gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-black" style={{ color: '#1C0F00' }}>{dateStr}</span>
              <span className="text-[11px] font-medium" style={{ color: '#C4A882' }}>{timeStr}</span>
            </div>
            <p className="text-[11px] leading-snug line-clamp-1" style={{ color: '#A8896A' }}>
              {preview}
            </p>
          </div>

          {/* Right: badge + amount + chevron */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <StatusBadge status={order.order_status} />
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black tabular-nums" style={{ color: '#B45309' }}>
                ₹{order.total_amount}
              </span>
              <ChevronDown
                size={14}
                strokeWidth={2.2}
                className="transition-transform duration-250"
                style={{
                  color: '#C4A882',
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </div>
          </div>
        </div>
      </button>

      {/* ── Expanded detail ── */}
      {expanded && (
        <>
          {/* Perforated tear line */}
          <div className="relative flex items-center px-4 py-1">
            <div className="flex-1 border-t border-dashed" style={{ borderColor: 'rgba(217,119,6,0.2)' }} />
            <div className="mx-2.5">
              <Scissors size={11} strokeWidth={1.5} className="-rotate-90" style={{ color: '#D4C4AE' }} />
            </div>
            <div className="flex-1 border-t border-dashed" style={{ borderColor: 'rgba(217,119,6,0.2)' }} />
          </div>

          <div className="px-4 pb-4 space-y-4" style={{ background: '#FFFDF9' }}>

            {/* Items */}
            <div className="space-y-2.5 pt-1">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[9px] font-black font-mono shrink-0" style={{ color: '#D4C4AE' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[11px]"
                      style={{ background: '#FEF9EE', border: '1px solid rgba(217,119,6,0.12)' }}
                    >
                      🍗
                    </div>
                    <span className="text-[13px] font-semibold truncate" style={{ color: '#374151' }}>
                      {item.name}
                    </span>
                    <span className="text-[11px] shrink-0" style={{ color: '#C4A882' }}>× {item.quantity}</span>
                  </div>
                  <span className="text-[13px] font-black shrink-0 tabular-nums" style={{ color: '#1C0F00' }}>
                    ₹{item.pricePerKg * item.quantity}
                  </span>
                </div>
              ))}
            </div>

            {/* Notes */}
            {order.notes && (
              <div
                className="rounded-2xl px-3.5 py-3"
                style={{ background: '#FFFFFF', border: '1px solid rgba(217,119,6,0.12)' }}
              >
                <p className="text-[9px] font-black tracking-[0.16em] mb-1" style={{ color: '#A8896A' }}>NOTE</p>
                <p className="text-xs leading-relaxed" style={{ color: '#78716C' }}>{order.notes}</p>
              </div>
            )}

            {/* Total */}
            <div
              className="flex items-center justify-between pt-3 border-t border-dashed"
              style={{ borderColor: 'rgba(217,119,6,0.18)' }}
            >
              <span className="text-[10px] font-black tracking-[0.16em]" style={{ color: '#A8896A' }}>
                TOTAL PAID
              </span>
              <span className="text-xl font-black tabular-nums" style={{ color: '#1C0F00' }}>
                ₹{order.total_amount}
              </span>
            </div>

            {/* Order ref + time */}
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black font-mono tracking-widest" style={{ color: '#D4C4AE' }}>
                #{order.id.slice(0, 8).toUpperCase()}
              </span>
              <span className="text-[9px] font-medium" style={{ color: '#D4C4AE' }}>
                {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {timeStr}
              </span>
            </div>

            {/* Reorder */}
            {delivered && (
              <button
                onClick={() => onReorder(order)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black active:scale-[0.98] transition-all"
                style={{
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 55%, #B45309 100%)',
                  boxShadow: '0 4px 16px rgba(217,119,6,0.38)',
                  color: '#fff',
                }}
              >
                <RotateCcw size={13} strokeWidth={2.5} />
                Reorder
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HistoryTab({ user, onReorder }: { user: AuthUser; onReorder: (items: CartItem[]) => void }) {
  const [orders,      setOrders]      = useState<OrderRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [spinning,    setSpinning]    = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore,     setHasMore]     = useState(false)
  const [offset,      setOffset]      = useState(0)
  const [expanded,    setExpanded]    = useState<string | null>(null)

  const loadHistory = useCallback(async (reset = true) => {
    const start = reset ? 0 : offset
    if (reset) { setSpinning(true); if (orders.length === 0) setLoading(true) }
    else setLoadingMore(true)

    try {
      const res  = await fetch(`/api/orders/history?user_id=${encodeURIComponent(user.id)}&offset=${start}&limit=${PAGE_SIZE}`)
      const rows: OrderRow[] = res.ok ? await res.json() : []
      if (reset) setOrders(rows)
      else setOrders(prev => [...prev, ...rows])
      setHasMore(rows.length === PAGE_SIZE)
      setOffset(start + rows.length)
    } catch (err) {
      console.error('[HistoryTab] loadHistory failed:', err)
    } finally {
      setLoading(false)
      setSpinning(false)
      setLoadingMore(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, offset])

  useEffect(() => { loadHistory(true) }, [user.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleReorder(order: OrderRow) {
    onReorder(order.items.map(item => ({
      productId:  item.productId,
      name:       item.name,
      pricePerKg: item.pricePerKg,
      quantity:   item.quantity,
      imageUrl:   null,
    })))
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4" style={{ background: '#FDF8F0', minHeight: '60vh' }}>
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 8px 32px rgba(217,119,6,0.35)' }}
        >
          <Loader2 size={24} className="animate-spin text-white" strokeWidth={2.5} />
        </div>
        <p className="text-sm font-semibold" style={{ color: '#A8896A' }}>Loading your history…</p>
      </div>
    )
  }

  const groups = groupOrders(orders)

  return (
    <div className="min-h-full" style={{ background: '#FDF8F0' }}>

      {/* ── Header ── */}
      <div
        className="sticky top-0 z-20"
        style={{
          background: 'linear-gradient(145deg, #7C2D12 0%, #B45309 55%, #D97706 100%)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          boxShadow: '0 4px 24px rgba(124,45,18,0.40)',
        }}
      >
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black tracking-[0.22em] mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
              PAST ORDERS
            </p>
            <h1 className="text-[22px] font-black text-white tracking-tight leading-none">Order History</h1>
          </div>
          <div className="flex items-center gap-2">
            {orders.length > 0 && (
              <span
                className="text-[10px] font-black px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}
              >
                {orders.length}{hasMore ? '+' : ''} orders
              </span>
            )}
            <button
              onClick={() => loadHistory(true)}
              className="w-10 h-10 rounded-2xl flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <RefreshCw size={16} className={`text-white ${spinning ? 'animate-spin' : ''}`} strokeWidth={2.2} />
            </button>
          </div>
        </div>
        {/* Subtle bottom glow */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />
      </div>

      {/* ── Content ── */}
      <div className="px-4 pb-8">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #FEF9EE, #FEF3C7)',
                border: '1.5px solid rgba(217,119,6,0.15)',
                boxShadow: '0 4px 20px rgba(217,119,6,0.1)',
              }}
            >
              <Archive size={28} style={{ color: '#D97706' }} strokeWidth={1.4} />
            </div>
            <div className="text-center">
              <p className="font-black text-base tracking-tight" style={{ color: '#1C0F00' }}>No past orders</p>
              <p className="text-sm mt-1.5 leading-snug" style={{ color: '#A8896A' }}>
                Your delivered orders will appear here
              </p>
            </div>
          </div>
        ) : (
          <>
            {groups.map(group => (
              <div key={group.label}>
                <GroupHeader label={group.label} />
                <div className="space-y-3">
                  {group.orders.map(order => (
                    <ReceiptCard
                      key={order.id}
                      order={order}
                      expanded={expanded === order.id}
                      onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
                      onReorder={handleReorder}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="pt-5">
                <button
                  onClick={() => loadHistory(false)}
                  disabled={loadingMore}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black active:scale-[0.98] transition-all disabled:opacity-50"
                  style={{
                    background: '#FFFFFF',
                    border: '1.5px solid rgba(217,119,6,0.2)',
                    color: '#B45309',
                    boxShadow: '0 2px 12px rgba(124,45,18,0.07)',
                  }}
                >
                  {loadingMore ? (
                    <><Loader2 size={13} className="animate-spin" /> Loading…</>
                  ) : (
                    'Load older orders'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
