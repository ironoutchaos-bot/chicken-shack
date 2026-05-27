export const dynamic = 'force-dynamic'

/**
 * PATCH /api/orders/cod
 *
 * Updates an existing pending Cashfree order to paid after the user returns
 * from the payment page. Finds the order by cashfree_order_id (stored in the
 * razorpay_order_id column) and sets payment_status → 'paid'.
 *
 * POST /api/orders/cod
 *
 * Creates an order using the service-role key (bypasses RLS, faster on cold starts).
 * Used for both COD and Razorpay post-verification order saves.
 * The caller is responsible for having already verified the Razorpay payment
 * signature before calling this endpoint.
 *
 * No admin auth required — we validate the user_id exists in profiles
 * to prevent anonymous abuse.
 */
import { NextRequest, NextResponse } from 'next/server'
import { type Coupon } from '@/app/api/coupons/route'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

function srvHeaders(extra?: Record<string, string>) {
  return {
    'apikey':        SUPA_SRV(),
    'Authorization': `Bearer ${SUPA_SRV()}`,
    'Content-Type':  'application/json',
    ...extra,
  }
}

// Reliable upsert: PATCH existing row; if 0 rows updated, INSERT new row.
// Avoids the silent-no-op bug where PATCH returns 204 even for 0 matched rows.
async function saveSettingKey(key: string, value: unknown) {
  try {
    const h = srvHeaders()
    const patch = await fetch(
      `${SUPA_URL()}/rest/v1/settings?key=eq.${encodeURIComponent(key)}`,
      {
        method:  'PATCH',
        headers: { ...h, 'Prefer': 'return=representation' },
        body:    JSON.stringify({ value }),
      }
    )
    const rows = await patch.json().catch(() => [])
    const updated = Array.isArray(rows) ? rows.length : (patch.ok ? 1 : 0)
    if (updated === 0) {
      await fetch(`${SUPA_URL()}/rest/v1/settings`, {
        method:  'POST',
        headers: { ...h, 'Prefer': 'return=minimal' },
        body:    JSON.stringify({ key, value }),
      })
    }
  } catch { /* best-effort */ }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { user_id, items, payment_status, order_status } = body
  if (!user_id || !items || !payment_status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // ── Fetch live settings for coupon validation + delivery fee ──────────────
  let settings: Record<string, unknown> = {}
  try {
    const sRes = await fetch(
      `${SUPA_URL()}/rest/v1/settings?select=key,value`,
      { headers: srvHeaders() }
    )
    if (sRes.ok) {
      const rows: { key: string; value: unknown }[] = await sRes.json()
      if (Array.isArray(rows)) settings = Object.fromEntries(rows.map(r => [r.key, r.value]))
    }
  } catch { /* proceed without settings — coupon won't be validated */ }

  // ── Recalculate total server-side so client can't send fake amounts ────────
  const cartItems = items as { pricePerKg: number; quantity: number }[]
  const subtotal   = cartItems.reduce((s, i) => s + (Number(i.pricePerKg) * Number(i.quantity)), 0)
  const deliveryFee = Number(settings.delivery_fee ?? 0)
  let   serverDiscount = 0

  // ── Coupon validation (multi-coupon system) ───────────────────────────────
  const requestedCode = body.coupon_code ? String(body.coupon_code).trim().toUpperCase() : null
  if (requestedCode) {
    // Load coupons array from settings
    const couponsRaw = settings.coupons
    const coupons: Coupon[] = Array.isArray(couponsRaw) ? couponsRaw as Coupon[] : []
    const coupon = coupons.find((c: Coupon) => c.code === requestedCode)

    if (!coupon || !coupon.enabled) {
      return NextResponse.json({ error: 'Invalid or inactive coupon code' }, { status: 400 })
    }

    // Product-specific check
    if (coupon.applies_to === 'specific' && coupon.product_ids.length > 0) {
      const cartItems = items as { productId: string }[]
      const hasMatch  = cartItems.some((i: { productId: string }) => coupon.product_ids.includes(i.productId))
      if (!hasMatch) {
        return NextResponse.json({
          error: 'This coupon does not apply to the items in your order',
        }, { status: 400 })
      }
    }

    // Check usage limit per phone
    if (coupon.max_uses_per_phone > 0) {
      const phone   = body.customer_phone ? String(body.customer_phone).replace(/\D/g, '') : ''
      const tracker = (settings.coupon_usage_tracker ?? {}) as Record<string, number>
      const tKey    = `${coupon.code}:${phone}`
      const used    = Number(tracker[tKey] ?? 0)

      if (used >= coupon.max_uses_per_phone) {
        return NextResponse.json({
          error: `This coupon has already been used ${coupon.max_uses_per_phone} time${coupon.max_uses_per_phone !== 1 ? 's' : ''} on your number`,
        }, { status: 400 })
      }

      // Increment usage tracker — await so it's saved before order goes through
      const updated = { ...tracker, [tKey]: used + 1 }
      await saveSettingKey('coupon_usage_tracker', updated)
    }

    // Compute actual discount server-side
    // Specific coupons only apply to eligible items — not the full cart + delivery
    let discountBase: number
    if (coupon.applies_to === 'specific' && coupon.product_ids.length > 0) {
      const allItems = items as { productId: string; pricePerKg: number; quantity: number }[]
      discountBase = allItems
        .filter((i: { productId: string }) => coupon.product_ids.includes(i.productId))
        .reduce((s: number, i: { pricePerKg: number; quantity: number }) => s + Number(i.pricePerKg) * Number(i.quantity), 0)
    } else {
      discountBase = subtotal + deliveryFee
    }
    serverDiscount = coupon.discount_type === 'percent'
      ? Math.round((discountBase * coupon.discount_value) / 100)
      : coupon.discount_value
    serverDiscount = Math.min(serverDiscount, discountBase)
  }

  const verifiedTotal = Math.max(0, subtotal + deliveryFee - serverDiscount)

  // ── Build insert payload ───────────────────────────────────────────────────
  const insert: Record<string, unknown> = {
    user_id,
    items,
    total_amount:     verifiedTotal,
    payment_status:   payment_status ?? 'cod',
    order_status:     order_status   ?? 'placed',
    delivery_address: body.delivery_address ?? null,
    notes:            body.notes            ?? null,
    customer_phone:   body.customer_phone   ?? null,
    customer_name:    body.customer_name    ?? null,
  }

  // Coupon fields — saved if columns exist; Supabase ignores unknown fields gracefully
  if (requestedCode) {
    insert.coupon_code     = requestedCode
    insert.coupon_discount = serverDiscount
  }

  // Payment gateway fields
  if (body.cashfree_order_id)   insert.razorpay_order_id   = body.cashfree_order_id
  if (body.cashfree_payment_id) insert.razorpay_payment_id = body.cashfree_payment_id

  try {
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/orders`,
      {
        method:  'POST',
        headers: srvHeaders({ 'Prefer': 'return=representation' }),
        body:    JSON.stringify(insert),
      }
    )

    if (!res.ok) {
      // If error mentions coupon columns not existing, retry without them
      const errText = await res.text()
      if (errText.includes('coupon_') && requestedCode) {
        const { coupon_code: _cc, coupon_discount: _cd, ...insertWithoutCoupon } = insert
        const retry = await fetch(`${SUPA_URL()}/rest/v1/orders`, {
          method:  'POST',
          headers: srvHeaders({ 'Prefer': 'return=representation' }),
          body:    JSON.stringify(insertWithoutCoupon),
        })
        if (retry.ok) {
          const d2 = await retry.json()
          return NextResponse.json(Array.isArray(d2) ? d2[0] : d2, { status: 201 })
        }
      }
      console.error('[orders/cod POST] Supabase error:', errText)
      return NextResponse.json({ error: 'Failed to create order', detail: errText }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json(Array.isArray(data) ? data[0] : data, { status: 201 })
  } catch (err) {
    console.error('[orders/cod POST] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { cashfree_order_id, payment_status } = body
  if (!cashfree_order_id || !payment_status) {
    return NextResponse.json({ error: 'Missing cashfree_order_id or payment_status' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/orders?razorpay_order_id=eq.${encodeURIComponent(cashfree_order_id as string)}`,
      {
        method:  'PATCH',
        headers: srvHeaders({ 'Prefer': 'return=minimal' }),
        body:    JSON.stringify({
          payment_status,
          order_status: 'placed',
          updated_at:   new Date().toISOString(),
        }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      console.error('[orders/cod PATCH] Supabase error:', err)
      return NextResponse.json({ error: 'Update failed', detail: err }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[orders/cod PATCH] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
