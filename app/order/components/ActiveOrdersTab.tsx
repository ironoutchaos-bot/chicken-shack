'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Package, ChefHat, Bike, CheckCircle2, Clock, RefreshCw, ClipboardList, Phone, MapPin, Sparkles } from 'lucide-react'
import { SpinnerRoot } from '@heroui/react'
import { getSupabaseBrowser, type OrderRow } from '@/lib/supabase-browser'
import type { AuthUser } from '@/lib/auth-types'

interface Props {
  user: AuthUser
  onTabCountChange: (n: number) => void
  refreshTrigger?: number
}

type StatusKey = OrderRow['order_status']

const STEPS: { key: StatusKey; label: string; Icon: React.ElementType }[] = [
  { key: 'placed',     label: 'Placed',   Icon: Package      },
  { key: 'packed',     label: 'Packing',  Icon: ChefHat      },
  { key: 'on_the_way', label: 'On Way',   Icon: Bike         },
  { key: 'delivered',  label: 'Done',     Icon: CheckCircle2 },
]

function stepIndex(status: StatusKey) {
  return STEPS.findIndex(s => s.key === status)
}

function formatEta(minutes: number): string {
  const arrival = new Date(Date.now() + minutes * 60_000)
  return arrival.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const DELIVERY_CELEBRATION_MS = 5 * 60 * 1000

export default function ActiveOrdersTab({ user, onTabCountChange, refreshTrigger }: Props) {
  const [orders,         setOrders]         = useState<OrderRow[]>([])
  const [deliveredCards, setDeliveredCards] = useState<OrderRow[]>([])
  const [loading,        setLoading]        = useState(true)
  const [spinning,       setSpinning]       = useState(false)

  const supabase       = getSupabaseBrowser()
  const channelRef     = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const reconnectCount = useRef(0)
  const clearTimers    = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const loadOrdersRef  = useRef<() => Promise<void>>(undefined)

  const loadOrders = useCallback(async () => {
    setSpinning(true)
    try {
      const res = await fetch('/api/orders/active')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const all: OrderRow[] = await res.json()
      const rows = all.filter(o => o.order_status !== 'delivered' && o.order_status !== 'cancelled')
      setOrders(rows)
    } catch (err) {
      console.error('[ActiveOrdersTab] loadOrders failed:', err)
    } finally {
      setLoading(false)
      setSpinning(false)
    }
  }, [user.id])

  useEffect(() => { onTabCountChange(orders.length) }, [orders, onTabCountChange])
  useEffect(() => { loadOrdersRef.current = loadOrders }, [loadOrders])
  useEffect(() => { if (refreshTrigger) loadOrders() }, [refreshTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

  const addDeliveredCard = useCallback((order: OrderRow) => {
    setDeliveredCards(prev => {
      if (prev.some(o => o.id === order.id)) return prev
      return [order, ...prev]
    })
    if (clearTimers.current[order.id]) clearTimeout(clearTimers.current[order.id])
    clearTimers.current[order.id] = setTimeout(() => {
      setDeliveredCards(prev => prev.filter(o => o.id !== order.id))
      delete clearTimers.current[order.id]
    }, DELIVERY_CELEBRATION_MS)
  }, [])

  const setupChannel = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    const ch = supabase
      .channel(`orders-user-${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const updated = payload.new as OrderRow | undefined
          if (updated?.order_status === 'delivered') {
            setOrders(prev => prev.filter(o => o.id !== updated.id))
            addDeliveredCard(updated)
          } else {
            loadOrdersRef.current?.()
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') reconnectCount.current = 0
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reconnectCount.current++
          if (reconnectCount.current <= 5) {
            const delay = 3_000 * Math.min(reconnectCount.current, 4)
            setTimeout(() => setupChannel(), delay)
          }
        }
      })
    channelRef.current = ch
  }, [user.id, supabase, addDeliveredCard])

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 4_000)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadOrders()
    setupChannel()
    return () => {
      Object.values(clearTimers.current).forEach(clearTimeout)
      clearTimers.current = {}
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user.id, loadOrders, setupChannel])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4" style={{ background: '#FDF8F0', minHeight: '60vh' }}>
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 8px 32px rgba(217,119,6,0.35)' }}
        >
          <SpinnerRoot color="warning" size="md" />
        </div>
        <p className="text-sm font-semibold" style={{ color: '#A8896A' }}>Loading your orders…</p>
      </div>
    )
  }

  const hasContent = orders.length > 0 || deliveredCards.length > 0

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
              LIVE TRACKING
            </p>
            <h1 className="text-[22px] font-black text-white tracking-tight leading-none">Active Orders</h1>
          </div>
          <button
            onClick={loadOrders}
            className="w-10 h-10 rounded-2xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <RefreshCw size={16} className={`text-white ${spinning ? 'animate-spin' : ''}`} strokeWidth={2.2} />
          </button>
        </div>

        {/* Live pill */}
        <div className="px-4 pb-3 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {!hasContent
              ? 'No active orders right now'
              : orders.length > 0
                ? `${orders.length} order${orders.length > 1 ? 's' : ''} in progress`
                : 'All orders delivered'
            }
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 py-4 space-y-4">
        {!hasContent ? (
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #FEF9EE, #FEF3C7)',
                border: '1.5px solid rgba(217,119,6,0.15)',
                boxShadow: '0 4px 20px rgba(217,119,6,0.1)',
              }}
            >
              <ClipboardList size={30} style={{ color: '#D97706' }} strokeWidth={1.4} />
            </div>
            <div className="text-center">
              <p className="font-black text-base tracking-tight" style={{ color: '#1C0F00' }}>No active orders</p>
              <p className="text-sm mt-1.5 leading-snug" style={{ color: '#A8896A' }}>
                Orders you place will be tracked live here
              </p>
            </div>
          </div>
        ) : (
          <>
            {deliveredCards.map(order => (
              <DeliveredCard key={`delivered-${order.id}`} order={order} />
            ))}
            {orders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DeliveredCard
// ─────────────────────────────────────────────────────────────────────────────
function DeliveredCard({ order }: { order: OrderRow }) {
  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{ boxShadow: '0 8px 32px rgba(16,185,129,0.2), 0 2px 8px rgba(0,0,0,0.06)' }}
    >
      {/* Celebration banner */}
      <div
        className="px-5 py-5 flex items-center gap-4"
        style={{ background: 'linear-gradient(135deg, #065F46 0%, #059669 60%, #34D399 100%)' }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        >
          🎉
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-lg leading-tight">Delivered!</p>
          <p className="text-emerald-200 text-xs font-medium mt-0.5">Enjoy your fresh chicken 🍗</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-white font-black text-2xl leading-none">₹{order.total_amount}</p>
          <p className="text-emerald-300 text-[10px] font-medium mt-1">
            {new Date(order.updated_at ?? order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white px-5 py-4 space-y-2">
        <p className="text-[9px] font-black tracking-[0.18em] mb-3" style={{ color: '#A8896A' }}>ORDER SUMMARY</p>
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{ background: '#ECFDF5' }}
              >
                <CheckCircle2 size={11} style={{ color: '#059669' }} strokeWidth={2.5} />
              </div>
              <span className="text-sm font-semibold" style={{ color: '#374151' }}>
                {item.name}
                <span className="font-normal ml-1" style={{ color: '#9CA3AF' }}>× {item.quantity}</span>
              </span>
            </div>
            <span className="text-sm font-black" style={{ color: '#1C0F00' }}>
              ₹{item.pricePerKg * item.quantity}
            </span>
          </div>
        ))}
      </div>

      {/* Payment */}
      <div
        className="px-5 py-3.5 flex items-center gap-2"
        style={{ background: '#F0FDF4', borderTop: '1px solid #D1FAE5' }}
      >
        <Sparkles size={13} style={{ color: '#059669' }} strokeWidth={2} />
        <span className="text-xs font-bold" style={{ color: '#065F46' }}>
          {order.payment_status === 'cod' ? 'Cash on Delivery · Paid' : 'Online Payment · Confirmed'}
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OrderCard
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; emoji: string; textColor: string; bg: string; border: string }> = {
  placed:     { label: 'Order Placed',    emoji: '📋', textColor: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
  packed:     { label: 'Packing Now',     emoji: '📦', textColor: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  on_the_way: { label: 'Out for Delivery',emoji: '🛵', textColor: '#065F46', bg: '#ECFDF5', border: '#A7F3D0' },
}

function OrderCard({ order }: { order: OrderRow }) {
  const curStep = stepIndex(order.order_status)
  const meta    = STATUS_META[order.order_status] ?? STATUS_META.placed

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: '#FFFFFF',
        border: '1.5px solid rgba(217,119,6,0.15)',
        boxShadow: '0 4px 24px rgba(124,45,18,0.10), 0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* ── Top amber accent bar ── */}
      <div style={{ height: 4, background: 'linear-gradient(90deg, #B45309, #F59E0B, #D97706)' }} />

      {/* ── Order header ── */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between">
        <div>
          <p className="text-[9px] font-black tracking-[0.18em] mb-1" style={{ color: '#A8896A' }}>ORDER ID</p>
          <p className="text-xs font-black font-mono tracking-widest" style={{ color: '#4B3219' }}>
            #{order.id.slice(0, 8).toUpperCase()}
          </p>
          <p className="text-[10px] font-medium mt-0.5" style={{ color: '#C4A882' }}>
            {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[30px] font-black leading-none tracking-tight" style={{ color: '#1C0F00' }}>
            ₹{order.total_amount}
          </p>
          {/* Status badge */}
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mt-1.5"
            style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
          >
            <span className="text-[11px] leading-none">{meta.emoji}</span>
            <span className="text-[10px] font-black" style={{ color: meta.textColor }}>{meta.label}</span>
          </div>
        </div>
      </div>

      {/* ── ETA bar ── */}
      {order.eta_minutes != null && (
        <div className="mx-4 mb-3 rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #1C0F00 0%, #2D1A06 100%)' }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(251,191,36,0.2)' }}
          >
            <Clock size={14} style={{ color: '#FBBF24' }} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[9px] font-bold tracking-[0.14em] leading-none mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              ARRIVING BY
            </p>
            <p className="text-sm font-black leading-none" style={{ color: '#FBBF24' }}>
              ~{formatEta(order.eta_minutes)}
              <span className="font-medium text-[11px] ml-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {order.eta_minutes} min away
              </span>
            </p>
          </div>
        </div>
      )}

      {/* ── Progress stepper ── */}
      <div className="px-4 pb-4" style={{ background: '#FFFDF9' }}>
        <div className="relative flex items-start justify-between pt-3">
          {/* Background line */}
          <div
            className="absolute top-[23px] rounded-full"
            style={{ left: 20, right: 20, height: 2, background: 'rgba(217,119,6,0.12)' }}
          />
          {/* Filled progress line */}
          <div
            className="absolute top-[23px] rounded-full transition-all duration-700 ease-out"
            style={{
              left: 20,
              height: 2,
              background: 'linear-gradient(90deg, #B45309, #F59E0B)',
              width: curStep === 0 ? '0%' : `${(curStep / (STEPS.length - 1)) * (100 - (40 / 100 * STEPS.length))}%`,
            }}
          />

          {STEPS.map((step, i) => {
            const done   = i < curStep
            const active = i === curStep
            return (
              <div key={step.key} className="relative flex flex-col items-center gap-2 z-10" style={{ flex: 1 }}>
                <div
                  className="w-[46px] h-[46px] rounded-2xl flex items-center justify-center transition-all duration-300"
                  style={
                    active ? {
                      background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                      boxShadow: '0 0 0 5px rgba(251,191,36,0.18), 0 4px 12px rgba(217,119,6,0.4)',
                      transform: 'scale(1.08)',
                    } : done ? {
                      background: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
                      boxShadow: '0 2px 8px rgba(217,119,6,0.2)',
                    } : {
                      background: '#FFFFFF',
                      border: '1.5px solid rgba(217,119,6,0.15)',
                    }
                  }
                >
                  <step.Icon
                    size={16}
                    strokeWidth={2.3}
                    style={{ color: active ? '#fff' : done ? '#92400E' : '#D4C4AE' }}
                  />
                </div>
                <span
                  className="text-[9px] font-black text-center leading-tight"
                  style={{ color: active ? '#B45309' : done ? '#D97706' : '#C4A882' }}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Driver card ── */}
      {order.driver_name && order.driver_phone &&
       (order.order_status === 'packed' || order.order_status === 'on_the_way') && (
        <div className="mx-4 mb-3">
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{ background: '#F0FDF4', border: '1px solid #A7F3D0' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #059669, #065F46)', boxShadow: '0 2px 8px rgba(5,150,105,0.3)' }}
            >
              <span className="text-white text-sm font-black">
                {order.driver_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black tracking-[0.14em] leading-none mb-0.5" style={{ color: '#065F46' }}>
                {order.order_status === 'on_the_way' ? 'YOUR RIDER' : 'DRIVER ASSIGNED'}
              </p>
              <p className="text-sm font-black truncate" style={{ color: '#1C0F00' }}>{order.driver_name}</p>
            </div>
            <a
              href={`tel:${order.driver_phone}`}
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[11px] font-black active:scale-95 transition-all shrink-0 text-white"
              style={{
                background: 'linear-gradient(135deg, #059669, #047857)',
                boxShadow: '0 3px 10px rgba(5,150,105,0.35)',
              }}
            >
              <Phone size={12} strokeWidth={2.8} />
              Call
            </a>
          </div>
        </div>
      )}

      {/* ── Delivery address ── */}
      {order.delivery_address && (
        <div className="mx-4 mb-3 flex items-start gap-2.5">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: '#FEF9EE', border: '1px solid rgba(217,119,6,0.15)' }}
          >
            <MapPin size={12} style={{ color: '#D97706' }} strokeWidth={2.5} />
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: '#A8896A' }}>
            {[
              order.delivery_address.houseNumber,
              order.delivery_address.streetAddress,
              order.delivery_address.landmark,
            ].filter(Boolean).join(', ')}
          </p>
        </div>
      )}

      {/* ── Items list ── */}
      <div
        className="mx-4 mb-0 border-t border-dashed"
        style={{ borderColor: 'rgba(217,119,6,0.15)' }}
      />
      <div className="px-4 py-3 space-y-2.5">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-[12px]"
                style={{ background: '#FEF9EE', border: '1px solid rgba(217,119,6,0.12)' }}
              >
                🍗
              </div>
              <span className="text-[13px] font-semibold" style={{ color: '#374151' }}>
                {item.name}
                <span className="font-normal ml-1" style={{ color: '#9CA3AF' }}>× {item.quantity}</span>
              </span>
            </div>
            <span className="text-[13px] font-black" style={{ color: '#1C0F00' }}>
              ₹{item.pricePerKg * item.quantity}
            </span>
          </div>
        ))}
      </div>

      {/* ── Notes ── */}
      {order.notes && (
        <>
          <div className="mx-4 border-t border-dashed" style={{ borderColor: 'rgba(217,119,6,0.12)' }} />
          <div className="px-4 py-3 pb-4">
            <p className="text-[9px] font-black tracking-[0.16em] mb-1" style={{ color: '#A8896A' }}>INSTRUCTIONS</p>
            <p className="text-xs leading-relaxed" style={{ color: '#78716C' }}>{order.notes}</p>
          </div>
        </>
      )}
      {!order.notes && <div className="h-2" />}
    </div>
  )
}
