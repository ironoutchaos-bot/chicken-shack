export const dynamic = 'force-dynamic'

/**
 * POST /api/coupon/validate
 *
 * Validates a coupon code against the cart and total coupon usage.
 * Returns discount amount on success, or an error string on failure.
 *
 * Body: {
 *   code:            string        — coupon code to test
 *   cart_items:      { productId: string; pricePerKg: number; quantity: number }[]
 *   customer_phone?: string
 *   subtotal?:       number        — if omitted, calculated from cart_items
 *   delivery_fee?:   number
 * }
 *
 * Success: { valid: true, discount: number, label: string, coupon_id: string }
 * Failure: { valid: false, error: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { type Coupon } from '@/app/api/coupons/route'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

function srvHeaders() {
  return {
    'apikey':        SUPA_SRV(),
    'Authorization': `Bearer ${SUPA_SRV()}`,
    'Content-Type':  'application/json',
  }
}

async function loadCoupons(): Promise<Coupon[]> {
  try {
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/settings?key=eq.coupons&select=value`,
      { headers: srvHeaders() }
    )
    if (!res.ok) return []
    const rows: { value: unknown }[] = await res.json()
    if (!rows.length) return []
    const v = rows[0].value
    return Array.isArray(v) ? v as Coupon[] : []
  } catch { return [] }
}

async function loadUsageTracker(): Promise<Record<string, number>> {
  try {
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/settings?key=eq.coupon_usage_tracker&select=value`,
      { headers: srvHeaders() }
    )
    if (!res.ok) return {}
    const rows: { value: unknown }[] = await res.json()
    if (!rows.length) return {}
    return (rows[0].value ?? {}) as Record<string, number>
  } catch { return {} }
}

function couponUsageCount(tracker: Record<string, number>, code: string): number {
  return Object.entries(tracker)
    .filter(([key]) => key === `${code}:__total` || key.startsWith(`${code}:`))
    .reduce((sum, [, value]) => sum + Number(value ?? 0), 0)
}

export async function POST(req: NextRequest) {
  let body: {
    code?: string
    cart_items?: { productId: string; pricePerKg: number; quantity: number }[]
    customer_phone?: string
    subtotal?: number
    delivery_fee?: number
  }

  try { body = await req.json() } catch {
    return NextResponse.json({ valid: false, error: 'Invalid request' }, { status: 400 })
  }

  const entered = (body.code ?? '').trim().toUpperCase()
  if (!entered) {
    return NextResponse.json({ valid: false, error: 'Please enter a coupon code' })
  }

  // Load all coupons
  const coupons = await loadCoupons()
  const coupon  = coupons.find(c => c.code === entered)

  if (!coupon) {
    return NextResponse.json({ valid: false, error: 'Invalid coupon code' })
  }
  if (!coupon.enabled) {
    return NextResponse.json({ valid: false, error: 'This coupon is not active' })
  }

  // Product-specific check
  if (coupon.applies_to === 'specific' && coupon.product_ids.length > 0) {
    const cartItems = body.cart_items ?? []
    const hasMatch = cartItems.some(i => coupon.product_ids.includes(i.productId))
    if (!hasMatch) {
      return NextResponse.json({
        valid: false,
        error: 'This coupon does not apply to the items in your cart',
      })
    }
  }

  // Total usage limit
  if (coupon.max_uses_per_phone > 0) {
    const tracker = await loadUsageTracker()
    const used    = couponUsageCount(tracker, coupon.code)
    if (used >= coupon.max_uses_per_phone) {
      return NextResponse.json({
        valid: false,
        error: `This coupon has reached its usage limit of ${coupon.max_uses_per_phone} order${coupon.max_uses_per_phone !== 1 ? 's' : ''}`,
      })
    }
  }

  // Calculate discount — specific coupons only discount eligible items, not the full cart
  const cartItems   = body.cart_items ?? []
  const deliveryFee = Number(body.delivery_fee ?? 0)

  let discountBase: number
  if (coupon.applies_to === 'specific' && coupon.product_ids.length > 0) {
    // Only sum up eligible items — delivery fee and other items are excluded
    discountBase = cartItems
      .filter(i => coupon.product_ids.includes(i.productId))
      .reduce((s, i) => s + Number(i.pricePerKg) * Number(i.quantity), 0)
  } else {
    const subtotal = body.subtotal ?? cartItems.reduce((s, i) => s + Number(i.pricePerKg) * Number(i.quantity), 0)
    discountBase = subtotal + deliveryFee
  }

  let discount = coupon.discount_type === 'percent'
    ? Math.round((discountBase * coupon.discount_value) / 100)
    : coupon.discount_value
  discount = Math.min(discount, discountBase)

  const label = coupon.discount_type === 'percent'
    ? `${coupon.discount_value}% off`
    : `₹${coupon.discount_value} off`

  return NextResponse.json({
    valid:      true,
    discount,
    label,
    coupon_id:  coupon.id,
  })
}
