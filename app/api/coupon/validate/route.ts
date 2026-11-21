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
import { couponUnavailableMessage, loadCoupon, loadCouponUsage } from '@/lib/coupon-settings'
import { calculateCouponDiscount } from '@/lib/coupon-discount'
import { validateBogoPrices } from '@/lib/coupon-catalog'

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

  const entered = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : ''
  if (!entered) {
    return NextResponse.json({ valid: false, error: 'Please enter a coupon code' })
  }

  let coupon
  let tracker: Record<string, number> = {}
  try {
    coupon = await loadCoupon(entered)
    if (coupon?.enabled && coupon.max_uses_per_phone > 0) tracker = await loadCouponUsage()
  } catch (error) {
    console.error('[coupon/validate] Could not read coupon settings:', error)
    return NextResponse.json({ valid: false, error: couponUnavailableMessage }, { status: 503 })
  }

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
    const used    = couponUsageCount(tracker, coupon.code)
    if (used >= coupon.max_uses_per_phone) {
      return NextResponse.json({
        valid: false,
        error: `This coupon has reached its usage limit of ${coupon.max_uses_per_phone} order${coupon.max_uses_per_phone !== 1 ? 's' : ''}`,
      })
    }
  }

  try {
    const items = body.cart_items ?? []
    if (coupon.discount_type === 'bogo') await validateBogoPrices(items)
    const result = calculateCouponDiscount(coupon, items, Number(body.delivery_fee ?? 0))
    return NextResponse.json({ valid: true, ...result, coupon_id: coupon.id })
  } catch (error) {
    return NextResponse.json({ valid: false, error: error instanceof Error ? error.message : 'Could not validate coupon. Please try again.' })
  }
}
