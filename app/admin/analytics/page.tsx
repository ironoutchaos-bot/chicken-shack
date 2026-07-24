'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAdminAuth } from '@/app/admin/_hooks/useAdminAuth'
import { AdminChecking, AdminLoginForm } from '@/app/admin/_hooks/AdminGate'

/* ── Types ──────────────────────────────────────────────────────── */

type Summary = {
  totalRevenue: number
  grossRevenueBeforeDiscounts?: number
  totalDiscounts?: number
  productDiscounts?: number
  couponDiscounts?: number
  discountedOrders?: number
  totalOrders: number
  deliveredOrders: number
  cancelledOrders: number
  activeOrders: number
  avgOrderValue: number
  totalCustomers: number
  shopVisits: number
  shopUniqueDevices: number
  todayVisits?: number
  todayDevices?: number
  selectedVisitSessions?: number
  selectedVisitors?: number
  checkoutStarters?: number
  completedCustomers?: number
  abandonedCheckouts?: number
  checkoutConversionRate?: number
}

type StatusItem      = { status: string; count: number }
type PaymentItem     = { method: string; count: number; revenue: number }
type TopItem         = { productId: string; name: string; totalQty: number; totalRevenue: number; orderCount: number }
type RevenueDay      = { date: string; revenue: number; orderCount: number }
type PeakHour        = { hour: number; orderCount: number }
type DayAvg          = { day: string; avg: number }
type PincodeItem     = { pincode: string; orderCount: number; revenue: number }
type DailyFunnelItem = {
  date: string
  visits: number
  visitors: number
  checkoutStarters: number
  completedCustomers: number
  abandonedCheckouts: number
}

type Analytics = {
  summary: Summary
  statusBreakdown: StatusItem[]
  paymentBreakdown: PaymentItem[]
  topItems: TopItem[]
  revenueByDate: RevenueDay[]
  peakHours: PeakHour[]
  avgOrderByDay: DayAvg[]
  pincodeBreakdown?: PincodeItem[]
  dailyFunnel?: DailyFunnelItem[]
  selectedDates?: { start: string | null; end: string | null }
}

type Range = '1d' | '7d' | '30d' | '90d' | 'all' | 'custom'

/* ── Status colours ─────────────────────────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  placed:      '#3b82f6',
  packed:      '#8b5cf6',
  on_the_way:  '#f59e0b',
  delivered:   '#16a34a',
  cancelled:   '#dc2626',
}

const STATUS_LABELS: Record<string, string> = {
  placed:      'Placed',
  packed:      'Packed',
  on_the_way:  'On the Way',
  delivered:   'Delivered',
  cancelled:   'Cancelled',
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const RANGE_OPTIONS: { label: string; value: Range }[] = [
  { label: 'Today',    value: '1d'  },
  { label: '7 Days',   value: '7d'  },
  { label: '30 Days',  value: '30d' },
  { label: '90 Days',  value: '90d' },
  { label: 'All Time', value: 'all' },
]

function dateInIST(offsetDays = 0) {
  const date = new Date(Date.now() + 330 * 60 * 1000)
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

/* ── Helper sub-components ──────────────────────────────────────── */

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={S.card}>
      <p style={S.cardLabel}>{label}</p>
      <p style={S.cardValue}>{value}</p>
    </div>
  )
}

function SectionBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={S.section}>
      <p style={S.sectionTitle}>{title}</p>
      {children}
    </div>
  )
}

function AmberBar({ ratio, height = 28 }: { ratio: number; height?: number }) {
  return (
    <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden', height }}>
      <div style={{ width: `${Math.max(ratio * 100, 0.5)}%`, height: '100%', background: '#d97706', borderRadius: 4, transition: 'width 0.4s' }} />
    </div>
  )
}

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

/* ── Main page ──────────────────────────────────────────────────── */

export default function AdminAnalyticsPage() {
  const { authed, checking, login } = useAdminAuth()
  const [loginErr,  setLoginErr]  = useState('')
  const [logging,   setLogging]   = useState(false)

  const [data,    setData]    = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [range,   setRange]   = useState<Range>('30d')
  const [startDate, setStartDate] = useState(() => dateInIST(-29))
  const [endDate, setEndDate] = useState(() => dateInIST())
  const [appliedDates, setAppliedDates] = useState(() => ({
    start: dateInIST(-29),
    end: dateInIST(),
  }))

  /* Revenue target state */
  const [target,      setTarget]      = useState<number | null>(null)
  const [targetInput, setTargetInput] = useState('')

  /* Load saved target from localStorage on mount */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem('bf-rev-target')
    if (saved) {
      const n = parseFloat(saved)
      if (!isNaN(n) && n > 0) setTarget(n)
    }
  }, [])

  const fetchAnalytics = useCallback(async (
    r: Range,
    dates: { start: string; end: string },
  ) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ range: r })
      if (r === 'custom') {
        params.set('start', dates.start)
        params.set('end', dates.end)
      }
      const res = await fetch(`/api/admin/analytics?${params.toString()}`)
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (authed) fetchAnalytics(range, appliedDates)
  }, [authed, range, appliedDates, fetchAnalytics])

  function handleRangeChange(r: Range) {
    setRange(r)
  }

  function handleApplyDates() {
    if (!startDate || !endDate) return
    setAppliedDates({
      start: startDate <= endDate ? startDate : endDate,
      end: startDate <= endDate ? endDate : startDate,
    })
    setRange('custom')
  }

  function handleSaveTarget() {
    const n = parseFloat(targetInput)
    if (isNaN(n) || n <= 0) return
    setTarget(n)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('bf-rev-target', String(n))
    }
    setTargetInput('')
  }

  async function handleLogin(pw: string) {
    setLogging(true); setLoginErr('')
    const err = await login(pw)
    if (err) setLoginErr(err)
    setLogging(false)
  }

  if (checking) return <AdminChecking />
  if (!authed)  return <AdminLoginForm onLogin={handleLogin} error={loginErr} loading={logging} />

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Analytics</h1>
          <p style={S.subtitle}>Store performance overview</p>
        </div>
        <button onClick={() => fetchAnalytics(range, appliedDates)} style={S.refreshBtn} disabled={loading}>
          {loading ? '…' : '↻ Refresh'}
        </button>
      </div>

      {/* Date range filter */}
      <div style={S.rangeBar}>
        {RANGE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleRangeChange(opt.value)}
            style={{
              ...S.rangeBtn,
              background: range === opt.value ? '#d97706' : '#fff',
              color:      range === opt.value ? '#fff'    : '#6b5744',
              borderColor: range === opt.value ? '#d97706' : '#e5e7eb',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div style={S.calendarBar}>
        <label style={S.dateLabel}>
          From
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={event => setStartDate(event.target.value)}
            style={S.dateInput}
          />
        </label>
        <label style={S.dateLabel}>
          To
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={dateInIST()}
            onChange={event => setEndDate(event.target.value)}
            style={S.dateInput}
          />
        </label>
        <button onClick={handleApplyDates} style={S.applyDateBtn}>Show These Dates</button>
      </div>

      {loading && !data && (
        <p style={{ color: '#9ca3af', padding: '3rem 0', textAlign: 'center' }}>Loading analytics…</p>
      )}

      {data && (
        <div style={S.content}>
          <div>
            <p style={S.groupTitle}>Customer Journey</p>
            <p style={S.groupHint}>
              Unique people during the selected dates. Recorded from this update onward.
            </p>
          </div>
          <div style={S.cards}>
            <SummaryCard label="Website Visitors" value={data.summary.selectedVisitors ?? 0} />
            <SummaryCard label="Started Checkout" value={data.summary.checkoutStarters ?? 0} />
            <SummaryCard label="Ordered" value={data.summary.completedCustomers ?? 0} />
            <SummaryCard label="Did Not Order" value={data.summary.abandonedCheckouts ?? 0} />
            <SummaryCard
              label="Checkout Success"
              value={`${Math.round(data.summary.checkoutConversionRate ?? 0)}%`}
            />
          </div>

          <DailyFunnelTable items={data.dailyFunnel ?? []} />

          <div>
            <p style={S.groupTitle}>Sales Overview</p>
            <p style={S.groupHint}>Orders and revenue during the selected dates</p>
          </div>
          <div style={S.cards}>
            <SummaryCard label="Net Revenue"       value={fmt(data.summary.totalRevenue)} />
            <SummaryCard label="Gross Before Discounts" value={fmt(data.summary.grossRevenueBeforeDiscounts ?? data.summary.totalRevenue)} />
            <SummaryCard label="Discounts Given"   value={fmt(data.summary.totalDiscounts ?? 0)} />
            <SummaryCard label="Product Discounts" value={fmt(data.summary.productDiscounts ?? 0)} />
            <SummaryCard label="Coupon Discounts"  value={fmt(data.summary.couponDiscounts ?? 0)} />
            <SummaryCard label="Discounted Orders" value={data.summary.discountedOrders ?? 0} />
            <SummaryCard label="Total Orders"      value={data.summary.totalOrders} />
            <SummaryCard label="Delivered"         value={data.summary.deliveredOrders} />
            <SummaryCard label="Active Orders"     value={data.summary.activeOrders} />
            <SummaryCard label="Cancelled"         value={data.summary.cancelledOrders} />
            <SummaryCard label="Avg Order Value"   value={fmt(data.summary.avgOrderValue)} />
            <SummaryCard label="All-time Customers" value={data.summary.totalCustomers} />
          </div>

          {/* Revenue Target tracker */}
          <RevenueTarget
            totalRevenue={data.summary.totalRevenue}
            target={target}
            targetInput={targetInput}
            onInputChange={setTargetInput}
            onSave={handleSaveTarget}
          />

          {/* Top Items by Revenue */}
          <TopItemsRevenue items={data.topItems} />

          {/* Top Items by Qty */}
          <TopItemsQty items={data.topItems} />

          {/* Order Status Breakdown */}
          <StatusBreakdown items={data.statusBreakdown} />

          {/* Payment Breakdown */}
          <PaymentBreakdown items={data.paymentBreakdown} />

          {/* Revenue Last 30 Days */}
          <RevenueChart days={data.revenueByDate} />

          {/* Peak Hours */}
          <PeakHoursChart hours={data.peakHours} />

          {/* Avg Order Value by Day */}
          <AvgByDayChart days={data.avgOrderByDay} />

          {/* Demand by Pincode */}
          <PincodeDemand items={data.pincodeBreakdown ?? []} />
        </div>
      )}
    </div>
  )
}

/* ── Revenue Target Tracker ─────────────────────────────────────── */

function DailyFunnelTable({ items }: { items: DailyFunnelItem[] }) {
  const rows = [...items].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <SectionBox title="Daily Customer Journey">
      <p style={{ margin: 0, color: '#6b7280', fontSize: '0.8125rem' }}>
        Visitor and checkout history is recorded from 24 Jul 2026.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ ...S.table, minWidth: 650 }}>
          <thead>
            <tr>
              <th style={S.th}>Date</th>
              <th style={S.th}>Visitors</th>
              <th style={S.th}>Started Checkout</th>
              <th style={S.th}>Ordered</th>
              <th style={S.th}>Did Not Order</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td style={S.td} colSpan={5}>No customer journey data for these dates.</td>
              </tr>
            ) : rows.map(item => (
              <tr key={item.date}>
                <td style={{ ...S.td, fontWeight: 700 }}>
                  {new Date(`${item.date}T00:00:00`).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td style={S.td}>{item.visitors}</td>
                <td style={S.td}>{item.checkoutStarters}</td>
                <td style={{ ...S.td, color: '#15803d', fontWeight: 700 }}>
                  {item.completedCustomers}
                </td>
                <td style={{ ...S.td, color: '#b45309', fontWeight: 700 }}>
                  {item.abandonedCheckouts}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionBox>
  )
}

function RevenueTarget({
  totalRevenue,
  target,
  targetInput,
  onInputChange,
  onSave,
}: {
  totalRevenue: number
  target: number | null
  targetInput: string
  onInputChange: (v: string) => void
  onSave: () => void
}) {
  const pct = target ? Math.min(Math.round((totalRevenue / target) * 100), 100) : 0

  return (
    <div style={S.section}>
      <p style={S.sectionTitle}>Monthly Revenue Target</p>

      {/* Input row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="number"
          min={0}
          placeholder="Set target (₹)"
          value={targetInput}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSave() }}
          style={S.targetInput}
        />
        <button onClick={onSave} style={S.targetSaveBtn}>Save Target</button>
        {target && (
          <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
            Current target: {fmt(target)}
          </span>
        )}
      </div>

      {target ? (
        <>
          {/* Progress text */}
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
            <span style={{ fontWeight: 700, color: '#d97706' }}>{fmt(totalRevenue)}</span>
            {' of '}
            <span style={{ fontWeight: 700 }}>{fmt(target)}</span>
            {' target '}
            <span style={{ fontWeight: 700, color: pct >= 100 ? '#16a34a' : '#d97706' }}>({pct}%)</span>
          </p>

          {/* Progress bar */}
          <div style={{ background: '#f3f4f6', borderRadius: 8, height: 16, overflow: 'hidden' }}>
            <div style={{
              width: `${pct}%`,
              height: '100%',
              background: pct >= 100 ? '#16a34a' : '#d97706',
              borderRadius: 8,
              transition: 'width 0.6s ease',
            }} />
          </div>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#9ca3af' }}>
          No target set. Enter an amount above and click Save Target.
        </p>
      )}
    </div>
  )
}

/* ── Top Items by Revenue ───────────────────────────────────────── */

function TopItemsRevenue({ items }: { items: TopItem[] }) {
  const top10 = [...items].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10)
  const maxRev = top10[0]?.totalRevenue ?? 1

  const RANK_COLORS = ['#f59e0b', '#6b7280', '#92400e']

  return (
    <SectionBox title="Top Items by Revenue">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {top10.map((item, i) => {
          const pct = Math.round((item.totalRevenue / maxRev) * 100)
          return (
            <div key={item.productId} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0',
              borderBottom: i < top10.length - 1 ? '1px solid #f3f4f6' : 'none',
            }}>
              {/* Rank bubble */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: i < 3 ? RANK_COLORS[i] : '#f3f4f6',
                color: i < 3 ? '#fff' : '#9ca3af',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 800,
              }}>{i + 1}</div>

              {/* Name + bar */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1a1109', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#d97706', flexShrink: 0, marginLeft: 8 }}>
                    {fmt(item.totalRevenue)}
                  </span>
                </div>
                {/* Progress bar */}
                <div style={{ height: 6, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: i === 0 ? '#d97706' : i === 1 ? '#f59e0b' : '#fbbf24',
                    borderRadius: 99,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151' }}>{item.totalQty}</div>
                  <div style={{ fontSize: '0.6875rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>qty</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151' }}>{item.orderCount}</div>
                  <div style={{ fontSize: '0.6875rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>orders</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </SectionBox>
  )
}

/* ── Top Items by Qty ───────────────────────────────────────────── */

function TopItemsQty({ items }: { items: TopItem[] }) {
  const top5 = [...items].sort((a, b) => b.totalQty - a.totalQty).slice(0, 5)
  const maxQty = top5[0]?.totalQty ?? 1
  return (
    <SectionBox title="Top Items by Quantity Sold">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {top5.map((item, i) => (
          <div key={item.productId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 20, color: '#9ca3af', fontWeight: 700, fontSize: '0.8125rem', textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
            <span style={{ width: 160, fontSize: '0.875rem', fontWeight: 600, color: '#1a1109', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
            <AmberBar ratio={item.totalQty / maxQty} />
            <span style={{ width: 48, fontSize: '0.8125rem', fontWeight: 600, color: '#374151', textAlign: 'right', flexShrink: 0 }}>{item.totalQty}</span>
          </div>
        ))}
      </div>
    </SectionBox>
  )
}

/* ── Order Status Breakdown ─────────────────────────────────────── */

function StatusBreakdown({ items }: { items: StatusItem[] }) {
  const order = ['placed', 'packed', 'on_the_way', 'delivered', 'cancelled']
  const sorted = order.map(s => items.find(i => i.status === s) ?? { status: s, count: 0 })
  const max = Math.max(...sorted.map(i => i.count), 1)
  return (
    <SectionBox title="Order Status Breakdown">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map(item => (
          <div key={item.status} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 90, fontSize: '0.8125rem', fontWeight: 600, color: STATUS_COLORS[item.status] ?? '#6b7280', flexShrink: 0 }}>
              {STATUS_LABELS[item.status] ?? item.status}
            </span>
            <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 4, height: 20, overflow: 'hidden' }}>
              <div style={{ width: `${(item.count / max) * 100}%`, height: '100%', background: STATUS_COLORS[item.status] ?? '#9ca3af', borderRadius: 4, minWidth: item.count > 0 ? 4 : 0, transition: 'width 0.4s' }} />
            </div>
            <span style={{ width: 36, fontSize: '0.8125rem', fontWeight: 700, color: '#374151', textAlign: 'right', flexShrink: 0 }}>{item.count}</span>
          </div>
        ))}
      </div>
    </SectionBox>
  )
}

/* ── Payment Breakdown ──────────────────────────────────────────── */

function PaymentBreakdown({ items }: { items: PaymentItem[] }) {
  const cod     = items.find(i => i.method === 'cod')
  const online  = items.find(i => i.method === 'online' || i.method === 'razorpay' || i.method === 'cashfree')
  const pending = items.find(i => i.method === 'pending')

  const stats = [
    { label: 'Cash on Delivery', count: cod?.count ?? 0,     rev: cod?.revenue ?? 0,     color: '#16a34a' },
    { label: 'Online (Paid)',     count: online?.count ?? 0,  rev: online?.revenue ?? 0,  color: '#3b82f6' },
    { label: 'Pending',          count: pending?.count ?? 0, rev: pending?.revenue ?? 0, color: '#f59e0b' },
  ]

  return (
    <SectionBox title="Payment Breakdown">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {stats.map(s => (
          <div key={s.label} style={{ ...S.payCard, borderLeft: `3px solid ${s.color}` }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>{s.label}</p>
            <p style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 700, color: '#1a1109' }}>{s.count}</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#6b5744' }}>{fmt(s.rev)}</p>
          </div>
        ))}
      </div>
    </SectionBox>
  )
}

/* ── Revenue Last 30 Days ───────────────────────────────────────── */

function RevenueChart({ days }: { days: RevenueDay[] }) {
  const recent = days.slice(-30)
  const maxRev = Math.max(...recent.map(d => d.revenue), 1)
  const BAR_HEIGHT = 120

  return (
    <SectionBox title="Revenue — Last 30 Days">
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: BAR_HEIGHT + 28, minWidth: recent.length * 18 }}>
          {recent.map((d, i) => {
            const ratio = d.revenue / maxRev
            const showLabel = i % 5 === 0
            const label = d.date.slice(5) // MM-DD
            return (
              <div key={d.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 14 }}>
                <div
                  title={`${d.date}: ${fmt(d.revenue)} (${d.orderCount} orders)`}
                  style={{
                    width: '100%',
                    height: Math.max(ratio * BAR_HEIGHT, d.revenue > 0 ? 2 : 0),
                    background: '#d97706',
                    borderRadius: '3px 3px 0 0',
                    transition: 'height 0.3s',
                  }}
                />
                <span style={{ fontSize: '0.5rem', color: '#9ca3af', marginTop: 3, whiteSpace: 'nowrap', opacity: showLabel ? 1 : 0 }}>{label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </SectionBox>
  )
}

/* ── Peak Hours ─────────────────────────────────────────────────── */

function PeakHoursChart({ hours }: { hours: PeakHour[] }) {
  const filled: PeakHour[] = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    orderCount: hours.find(x => x.hour === h)?.orderCount ?? 0,
  }))
  const max = Math.max(...filled.map(h => h.orderCount), 1)
  const BAR_HEIGHT = 60

  return (
    <SectionBox title="Peak Hours (Orders by Hour)">
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: BAR_HEIGHT + 24 }}>
        {filled.map(h => {
          const ratio = h.orderCount / max
          const showLabel = h.hour % 3 === 0
          const label = `${h.hour}:00`
          return (
            <div key={h.hour} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div
                title={`${label}: ${h.orderCount} orders`}
                style={{
                  width: '100%',
                  height: Math.max(ratio * BAR_HEIGHT, h.orderCount > 0 ? 2 : 0),
                  background: '#d97706',
                  borderRadius: '3px 3px 0 0',
                }}
              />
              <span style={{ fontSize: '0.5rem', color: '#9ca3af', marginTop: 3, whiteSpace: 'nowrap', opacity: showLabel ? 1 : 0 }}>{h.hour}</span>
            </div>
          )
        })}
      </div>
    </SectionBox>
  )
}

/* ── Avg Order Value by Day of Week ─────────────────────────────── */

function AvgByDayChart({ days }: { days: DayAvg[] }) {
  const sorted = DAYS.map(d => ({ day: d, avg: days.find(x => x.day === d)?.avg ?? 0 }))
  const max = Math.max(...sorted.map(d => d.avg), 1)
  const BAR_HEIGHT = 80

  return (
    <SectionBox title="Avg Order Value by Day of Week">
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: BAR_HEIGHT + 32 }}>
        {sorted.map(d => {
          const ratio = d.avg / max
          return (
            <div key={d.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <span style={{ fontSize: '0.6875rem', color: '#d97706', fontWeight: 600, marginBottom: 4 }}>
                {d.avg > 0 ? fmt(d.avg) : ''}
              </span>
              <div
                title={`${d.day}: ${fmt(d.avg)}`}
                style={{
                  width: '100%',
                  height: Math.max(ratio * BAR_HEIGHT, d.avg > 0 ? 3 : 0),
                  background: '#d97706',
                  borderRadius: '4px 4px 0 0',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 4, fontWeight: 500 }}>{d.day}</span>
            </div>
          )
        })}
      </div>
    </SectionBox>
  )
}

/* ── Demand by Pincode ──────────────────────────────────────────── */

function PincodeDemand({ items }: { items: PincodeItem[] }) {
  const top10 = [...items]
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, 10)
  const max = Math.max(...top10.map(p => p.orderCount), 1)

  return (
    <SectionBox title="Demand by Pincode">
      {top10.length === 0 ? (
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#9ca3af' }}>No pincode data available yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {top10.map(item => (
            <div key={item.pincode} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 72, fontSize: '0.8125rem', fontWeight: 600, color: '#374151', flexShrink: 0 }}>
                {item.pincode}
              </span>
              <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 4, height: 20, overflow: 'hidden' }}>
                <div style={{
                  width: `${(item.orderCount / max) * 100}%`,
                  height: '100%',
                  background: '#d97706',
                  borderRadius: 4,
                  minWidth: item.orderCount > 0 ? 4 : 0,
                  transition: 'width 0.4s',
                }} />
              </div>
              <span style={{ width: 36, fontSize: '0.8125rem', fontWeight: 700, color: '#374151', textAlign: 'right', flexShrink: 0 }}>
                {item.orderCount}
              </span>
              <span style={{ width: 80, fontSize: '0.8125rem', color: '#6b5744', textAlign: 'right', flexShrink: 0 }}>
                {fmt(item.revenue)}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionBox>
  )
}

/* ── Styles ─────────────────────────────────────────────────────── */

const S: Record<string, React.CSSProperties> = {
  wrap:         { padding: 'clamp(1rem, 4vw, 2rem) clamp(0.75rem, 4vw, 2.5rem)', fontFamily: 'system-ui', maxWidth: 960, margin: '0 auto' },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: 10 },
  title:        { fontSize: 'clamp(1.125rem, 4vw, 1.5rem)', fontWeight: 700, color: '#1a1109', margin: 0 },
  subtitle:     { fontSize: '0.8125rem', color: '#6b5744', marginTop: 4 },
  refreshBtn:   { background: 'transparent', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.4rem 0.85rem', cursor: 'pointer', fontSize: '0.8125rem', color: '#6b5744' },

  rangeBar:     { display: 'flex', gap: 8, marginBottom: '0.75rem', flexWrap: 'wrap' },
  rangeBtn:     { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.35rem 0.85rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, fontFamily: 'system-ui', transition: 'background 0.15s, color 0.15s' },
  calendarBar:  { display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: '1.5rem', flexWrap: 'wrap', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 },
  dateLabel:    { display: 'flex', flexDirection: 'column', gap: 5, color: '#6b5744', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' },
  dateInput:    { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.55rem 0.7rem', color: '#1a1109', background: '#fff', fontFamily: 'system-ui', fontSize: '0.875rem', minHeight: 40 },
  applyDateBtn: { border: 'none', borderRadius: 8, padding: '0.62rem 1rem', minHeight: 40, background: '#d97706', color: '#fff', cursor: 'pointer', fontWeight: 700, fontFamily: 'system-ui' },

  content:      { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  groupTitle:   { margin: 0, color: '#1a1109', fontSize: '1rem', fontWeight: 800 },
  groupHint:    { margin: '3px 0 0', color: '#6b7280', fontSize: '0.8125rem' },

  cards:        { display: 'flex', flexWrap: 'wrap', gap: 12 },
  card:         { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, minWidth: 140, flex: '1 1 140px' },
  cardLabel:    { fontSize: '0.6875rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 },
  cardValue:    { fontSize: '1.375rem', fontWeight: 700, color: '#1a1109', margin: '6px 0 0' },

  section:      { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.125rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' },
  sectionTitle: { fontWeight: 700, color: '#1a1109', fontSize: '0.9375rem', margin: 0 },

  table:        { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' },
  th:           { textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' },
  td:           { padding: '0.5rem 0.75rem', color: '#374151', fontSize: '0.875rem' },

  payCard:      { background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 10, padding: '0.875rem 1rem', minWidth: 150, flex: '1 1 150px' },

  targetInput:  { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.4rem 0.75rem', fontSize: '0.875rem', fontFamily: 'system-ui', color: '#1a1109', outline: 'none', width: 180 },
  targetSaveBtn:{ background: '#d97706', color: '#fff', border: 'none', borderRadius: 8, padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, fontFamily: 'system-ui' },
}
