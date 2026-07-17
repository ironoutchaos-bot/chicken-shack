'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, Loader2, RotateCcw, ChevronDown, Archive, Scissors, CheckCircle2, XCircle, Download } from 'lucide-react'
import { type OrderRow, type CartItem } from '@/lib/supabase-browser'
import type { AuthUser } from '@/lib/auth-types'
import type { Tab } from '../OrderApp'

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

// ─── Invoice PDF generator ────────────────────────────────────────────────────

async function downloadInvoice(order: OrderRow) {
  const date        = new Date(order.created_at)
  const dateStr     = date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')

  // Fetch sequential invoice number from server
  let invoiceNo = `BF00001`
  try {
    const r = await fetch(`/api/orders/invoice-number?order_id=${encodeURIComponent(order.id)}`)
    if (r.ok) {
      const data = await r.json()
      if (data.invoice_number) invoiceNo = data.invoice_number
    }
  } catch { /* fallback */ }

  const subtotal    = order.items.reduce((s, i) => s + i.pricePerKg * i.quantity, 0)
  const deliveryFee = Math.max(0, order.total_amount - subtotal)

  // Escape user-supplied strings before injecting into HTML to prevent XSS
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const addr = order.delivery_address
  const addrLines = esc(addr
    ? [addr.houseNumber, addr.streetAddress, addr.landmark].filter(Boolean).join(', ')
    : '')
  const addrPincode = esc(addr?.pincode ?? '')
  const custName  = esc(order.customer_name ?? 'Customer')
  const custPhone = esc(order.customer_phone ?? '')

  const itemRows = order.items.map((item) => {
    const gross = (item.pricePerKg * item.quantity).toFixed(2)
    return `
    <tr>
      <td class="cat">Fresh Chicken<br/><span class="hsn">HSN: 0207</span></td>
      <td>
        <strong>${esc(item.name)}</strong><br/>
        <span class="tax-rate">SGST/UTGST: 0.0%</span><br/>
        <span class="tax-rate">CGST: 0.0%</span>
      </td>
      <td class="num">${item.quantity} kg</td>
      <td class="num">₹${gross}</td>
      <td class="num">0.00</td>
      <td class="num">₹${gross}</td>
      <td class="num">0.00</td>
      <td class="num">0.00</td>
      <td class="num">₹${gross}</td>
    </tr>`
  }).join('')

  const deliveryRow = deliveryFee > 0 ? `
    <tr>
      <td class="cat"></td>
      <td><strong>Delivery Fee</strong></td>
      <td class="num">1</td>
      <td class="num">₹${deliveryFee.toFixed(2)}</td>
      <td class="num">0.00</td>
      <td class="num">₹${deliveryFee.toFixed(2)}</td>
      <td class="num">0.00</td>
      <td class="num">0.00</td>
      <td class="num">₹${deliveryFee.toFixed(2)}</td>
    </tr>` : ''

  const totalItems = order.items.length + (deliveryFee > 0 ? 1 : 0)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Tax Invoice - ${invoiceNo} - B'LURU Fresh Chicken</title>
  <style>
    *  { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff; padding: 28px 32px; }

    /* ── Page title ── */
    .page-title { text-align: center; font-size: 16px; font-weight: 700; margin-bottom: 6px; }

    /* ── Seller block ── */
    .seller { font-size: 11px; line-height: 1.6; margin-bottom: 4px; }
    .seller .sold-by { font-weight: 700; }
    .seller .ship-addr { font-style: italic; color: #444; }
    .seller .gstin { font-weight: 700; }

    /* ── Invoice number badge ── */
    .inv-badge { border: 1px solid #aaa; padding: 4px 10px; font-size: 11px; display: inline-block; margin-top: 2px; }
    .inv-badge span { font-weight: 700; }

    /* ── Top meta bar ── */
    .meta-bar { display: grid; grid-template-columns: 160px 1fr 1fr 140px; border: 1px solid #ccc; margin: 12px 0 0 0; }
    .meta-bar .cell { padding: 8px 10px; font-size: 10.5px; line-height: 1.65; border-right: 1px solid #ccc; }
    .meta-bar .cell:last-child { border-right: none; font-size: 9.5px; color: #555; font-style: italic; }
    .meta-bar .cell strong { display: block; font-size: 12px; margin-bottom: 2px; }

    /* ── Items table ── */
    .total-items { font-size: 11px; margin: 14px 0 4px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { border-top: 1.5px solid #111; border-bottom: 1.5px solid #111; }
    thead th { padding: 7px 6px; font-size: 10px; font-weight: 700; text-align: left; }
    thead th.num { text-align: right; }
    tbody tr { border-bottom: 1px solid #ddd; }
    tbody td { padding: 7px 6px; font-size: 10.5px; vertical-align: top; }
    tbody td.num { text-align: right; white-space: nowrap; }
    tbody td.cat { font-size: 9.5px; color: #555; width: 90px; }
    .hsn { font-size: 9px; color: #888; }
    .tax-rate { font-size: 9px; color: #555; font-weight: 700; text-transform: uppercase; }
    tfoot tr { border-top: 1.5px solid #111; }
    tfoot td { padding: 8px 6px; font-weight: 700; font-size: 11px; }
    tfoot td.num { text-align: right; }

    /* ── Grand total ── */
    .grand-total { text-align: right; font-size: 16px; font-weight: 700; margin: 18px 0 4px; }

    /* ── Footer ── */
    .footer-bar { border-top: 1px solid #aaa; margin-top: 24px; padding-top: 10px; font-size: 9.5px; color: #555; line-height: 1.6; }
    .eoe { display: flex; justify-content: space-between; margin-top: 8px; font-weight: 700; font-size: 10px; }

    @media print { @page { size: A4; margin: 1.2cm; } body { padding: 0; } }
  </style>
</head>
<body>

  <!-- Title + seller row -->
  <div style="display:flex; justify-content:space-between; align-items:flex-start;">
    <div style="flex:1">
      <p class="page-title" style="text-align:left">Tax Invoice</p>
      <div class="seller">
        <span class="sold-by">Sold By: B'LURU Fresh Chicken,</span><br/>
        <span class="ship-addr">Ship-from Address: Thirumenahalli Main Road, Agrahara Layout, Yelahanka, Bengaluru – 560064, Karnataka</span><br/>
        <span class="gstin">GSTIN – 29MFHPS1801R1ZI</span><br/>
        <span class="gstin">FSSAI License No – 11226331000344</span>
      </div>
    </div>
    <div style="text-align:right; padding-left:20px;">
      <div class="inv-badge">Invoice Number &nbsp;<span># ${invoiceNo}</span></div>
    </div>
  </div>

  <!-- Order meta + Bill To + Ship To -->
  <div class="meta-bar">
    <div class="cell">
      <strong>Order ID:</strong> ${order.id.slice(0,16).toUpperCase()}<br/>
      <strong>Order Date:</strong> ${dateStr}<br/>
      <strong>Invoice Date:</strong> ${dateStr}<br/>
      <strong>GSTIN:</strong> 29MFHPS1801R1ZI
    </div>
    <div class="cell">
      <strong>Bill To</strong>
      ${custName}<br/>
      ${addrLines}<br/>
      Bengaluru ${addrPincode} Karnataka<br/>
      ${custPhone ? 'Phone: ' + custPhone : ''}
    </div>
    <div class="cell">
      <strong>Ship To</strong>
      ${custName}<br/>
      ${addrLines}<br/>
      Bengaluru ${addrPincode} Karnataka<br/>
      ${custPhone ? 'Phone: ' + custPhone : ''}
    </div>
    <div class="cell">
      This is a computer-generated invoice. No signature required.
    </div>
  </div>

  <!-- Items table -->
  <p class="total-items">Total items: ${totalItems}</p>
  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th>Title</th>
        <th class="num">Qty</th>
        <th class="num">Gross Amt (Rs.)</th>
        <th class="num">Discounts (Rs.)</th>
        <th class="num">Taxable Value (Rs.)</th>
        <th class="num">SGST/UTGST (Rs.)</th>
        <th class="num">CGST (Rs.)</th>
        <th class="num">Total (Rs.)</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      ${deliveryRow}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="2" style="text-align:right">Total</td>
        <td class="num">${totalItems}</td>
        <td class="num">₹${order.total_amount.toFixed(2)}</td>
        <td class="num">0.00</td>
        <td class="num">₹${order.total_amount.toFixed(2)}</td>
        <td class="num">0.00</td>
        <td class="num">0.00</td>
        <td class="num">₹${order.total_amount.toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Grand total -->
  <div class="grand-total">Grand Total &nbsp; Rs. ${order.total_amount.toFixed(2)}</div>

  <!-- Footer -->
  <div class="footer-bar">
    <strong>Note:</strong> Fresh chicken is exempt from GST under HSN 0207 (unprocessed poultry meat). SGST and CGST are 0%.<br/>
    Regd. office: B'LURU Fresh Chicken, Thirumenahalli Main Road, Agrahara Layout, Yelahanka, Bengaluru – 560064, Karnataka<br/>
    Contact: +91 70124 88951 | admin@blurufresh.com | www.blurufresh.com
    <div class="eoe">
      <span>E. &amp; O.E.</span>
      <span>page 1 of 1</span>
    </div>
  </div>

  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
}

// ─── Star rating ─────────────────────────────────────────────────────────────

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHovered(n)}
          onMouseLeave={() => onChange && setHovered(0)}
          style={{
            background: 'none', border: 'none', padding: '2px 1px',
            cursor: onChange ? 'pointer' : 'default',
            fontSize: '1.625rem', lineHeight: 1,
            filter: n <= active ? 'none' : 'grayscale(1) opacity(0.3)',
            transform: n <= active ? 'scale(1.08)' : 'scale(1)',
            transition: 'transform 0.12s, filter 0.12s',
          }}
          aria-label={`${n} star`}
        >
          ⭐
        </button>
      ))}
    </div>
  )
}

// ─── Feedback section (inside expanded card) ─────────────────────────────────

function FeedbackSection({ order, onSaved }: { order: OrderRow; onSaved: (rating: number, comment: string) => void }) {
  const alreadyDone = !!order.feedback_rating

  const [rating,    setRating]    = useState(order.feedback_rating ?? 0)
  const [comment,   setComment]   = useState(order.feedback_comment ?? '')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(alreadyDone)
  const [error,     setError]     = useState('')

  async function handleSubmit() {
    if (!rating) { setError('Please select a rating'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/orders/${order.id}/feedback`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rating, comment }),
      })
      if (!res.ok) throw new Error('Failed')
      setSaved(true)
      onSaved(rating, comment)
    } catch {
      setError('Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const LABELS = ['', 'Poor 😞', 'Fair 😐', 'Good 🙂', 'Great 😊', 'Excellent 🤩']

  if (saved) {
    return (
      <div
        className="rounded-2xl px-4 py-3.5 text-center"
        style={{ background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', border: '1px solid #A7F3D0' }}
      >
        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: '#065F46' }}>
          Thanks for your feedback! {LABELS[rating] || ''}
        </p>
        <Stars value={rating} />
        {comment && (
          <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#047857', fontStyle: 'italic' }}>
            "{comment}"
          </p>
        )}
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl px-4 py-4 space-y-3"
      style={{ background: '#FFFBEB', border: '1.5px solid rgba(217,119,6,0.2)' }}
    >
      <p className="text-[11px] font-black tracking-[0.14em]" style={{ color: '#92400E', margin: 0 }}>
        RATE YOUR ORDER
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Stars value={rating} onChange={setRating} />
        {rating > 0 && (
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#B45309' }}>
            {LABELS[rating]}
          </span>
        )}
      </div>

      <textarea
        rows={2}
        placeholder="Any comments? (optional)"
        value={comment}
        onChange={e => setComment(e.target.value)}
        maxLength={500}
        style={{
          width: '100%', resize: 'none', border: '1.5px solid rgba(217,119,6,0.25)',
          borderRadius: 12, padding: '10px 12px', fontSize: '0.8125rem',
          fontFamily: 'system-ui', color: '#374151', background: '#fff',
          outline: 'none', boxSizing: 'border-box',
        }}
      />

      {error && <p style={{ margin: 0, fontSize: '0.75rem', color: '#DC2626' }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={saving || !rating}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black active:scale-[0.98] transition-all disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 55%, #B45309 100%)',
          boxShadow: '0 4px 14px rgba(217,119,6,0.32)',
          color: '#fff',
        }}
      >
        {saving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : 'Submit Feedback'}
      </button>
    </div>
  )
}

// ─── Receipt card ─────────────────────────────────────────────────────────────

function ReceiptCard({
  order,
  expanded,
  onToggle,
  onReorder,
  highlight,
}: {
  order: OrderRow
  expanded: boolean
  onToggle: () => void
  onReorder: (order: OrderRow) => void
  highlight?: boolean
}) {
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  // Local feedback state — updated after a successful submission so UI reflects change immediately
  const [localFeedbackRating,  setLocalFeedbackRating]  = useState(order.feedback_rating ?? null)
  const [localFeedbackComment, setLocalFeedbackComment] = useState(order.feedback_comment ?? null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Scroll into view when this card is highlighted (from deep link)
  useEffect(() => {
    if (highlight && cardRef.current) {
      setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)
    }
  }, [highlight])

  const feedbackOrder = {
    ...order,
    feedback_rating:  localFeedbackRating,
    feedback_comment: localFeedbackComment,
  } as OrderRow

  async function handleInvoice() {
    setInvoiceLoading(true)
    await downloadInvoice(order)
    setInvoiceLoading(false)
  }
  const date      = new Date(order.created_at)
  const timeStr   = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  const dateStr   = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const delivered = order.order_status !== 'cancelled'
  const preview   = order.items.slice(0, 2).map(it => it.name).join(', ') +
                    (order.items.length > 2 ? ` +${order.items.length - 2}` : '')

  return (
    <div
      ref={cardRef}
      className="rounded-3xl overflow-hidden"
      style={{
        background: '#FFFFFF',
        border: highlight ? '2px solid #D97706' : '1.5px solid rgba(217,119,6,0.12)',
        boxShadow: highlight
          ? '0 0 0 3px rgba(217,119,6,0.15), 0 2px 16px rgba(124,45,18,0.1)'
          : '0 2px 16px rgba(124,45,18,0.07), 0 1px 4px rgba(0,0,0,0.03)',
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

            {/* Feedback — only for delivered orders */}
            {delivered && (
              <FeedbackSection
                order={feedbackOrder}
                onSaved={(rating, comment) => {
                  setLocalFeedbackRating(rating)
                  setLocalFeedbackComment(comment)
                }}
              />
            )}

            {/* Actions */}
            <div className={`flex gap-2 ${delivered ? '' : 'justify-end'}`}>
              {delivered && (
                <button
                  onClick={() => onReorder(order)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black active:scale-[0.98] transition-all"
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
              <button
                onClick={handleInvoice}
                disabled={invoiceLoading}
                className="flex items-center justify-center gap-2 rounded-2xl py-3.5 px-4 text-sm font-black active:scale-[0.98] transition-all disabled:opacity-60"
                style={{
                  background: '#FFFFFF',
                  border: '1.5px solid rgba(217,119,6,0.25)',
                  color: '#B45309',
                  boxShadow: '0 2px 8px rgba(124,45,18,0.07)',
                }}
              >
                {invoiceLoading
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Download size={13} strokeWidth={2.5} />
                }
                Invoice
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HistoryTab({
  user,
  onReorder,
  feedbackTargetId,
  activeTab,
  onTabChange,
}: {
  user: AuthUser
  onReorder: (items: CartItem[]) => void
  feedbackTargetId?: string | null
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}) {
  const [orders,      setOrders]      = useState<OrderRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [spinning,    setSpinning]    = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore,     setHasMore]     = useState(false)
  const [offset,      setOffset]      = useState(0)
  // Auto-expand the feedback target order when it loads
  const [expanded,    setExpanded]    = useState<string | null>(feedbackTargetId ?? null)

  const loadHistory = useCallback(async (reset = true) => {
    const start = reset ? 0 : offset
    if (reset) { setSpinning(true); if (orders.length === 0) setLoading(true) }
    else setLoadingMore(true)

    try {
      const res  = await fetch(`/api/orders/history?offset=${start}&limit=${PAGE_SIZE}`)
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
        {/* Sub-navigation tabs */}
        <div className="px-4 pb-3.5 flex items-center gap-2">
          <button
            onClick={() => onTabChange('active')}
            className="flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all text-center"
            style={{
              background: activeTab === 'active' ? '#FEF9EE' : 'rgba(255,255,255,0.08)',
              color: activeTab === 'active' ? '#92400E' : 'rgba(255,255,255,0.75)',
              border: activeTab === 'active' ? '1px solid #FEF3C7' : '1px solid rgba(255,255,255,0.1)',
              boxShadow: activeTab === 'active' ? '0 4px 12px rgba(0,0,0,0.12)' : 'none',
            }}
          >
            Orders Placed
          </button>
          <button
            onClick={() => onTabChange('history')}
            className="flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all text-center"
            style={{
              background: activeTab === 'history' ? '#FEF9EE' : 'rgba(255,255,255,0.08)',
              color: activeTab === 'history' ? '#92400E' : 'rgba(255,255,255,0.75)',
              border: activeTab === 'history' ? '1px solid #FEF3C7' : '1px solid rgba(255,255,255,0.1)',
              boxShadow: activeTab === 'history' ? '0 4px 12px rgba(0,0,0,0.12)' : 'none',
            }}
          >
            Order History
          </button>
        </div>
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
                      highlight={feedbackTargetId === order.id}
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
