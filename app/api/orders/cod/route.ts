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
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, type SessionData } from '@/lib/session'
import { type Coupon } from '@/app/api/coupons/route'
import { notifyDriverAssignment, notifyAllDrivers } from '@/lib/push-notify'
import { sendOrderConfirmation, summarizeItems } from '@/lib/aisensy'
import { ALLOWED_DELIVERY_PINCODES, checkDeliveryZone, isAllowedDeliveryPincode, normalizePincode } from '@/lib/delivery-zone'

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

function validateDeliveryAddressForZone(value: unknown):
  | { ok: true; address: Record<string, unknown> }
  | { ok: false; response: NextResponse } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Exact delivery location is required' }, { status: 400 }),
    }
  }

  const address = value as Record<string, unknown>
  const pincode = normalizePincode(address.pincode)
  if (pincode.length !== 6 || !isAllowedDeliveryPincode(pincode)) {
    return {
      ok: false,
      response: NextResponse.json({
        error: `Delivery is available only for ${ALLOWED_DELIVERY_PINCODES.join(', ')}`,
        allowedPincodes: ALLOWED_DELIVERY_PINCODES,
      }, { status: 400 }),
    }
  }

  const zone = checkDeliveryZone(address.lat, address.lng, pincode)
  if (!zone) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Exact delivery pin is required' }, { status: 400 }),
    }
  }
  if (!zone.deliverable) {
    return {
      ok: false,
      response: NextResponse.json({
        error: 'Delivery not available in your area',
        distanceKm: zone.distanceKm,
        radiusKm: zone.radiusKm,
      }, { status: 400 }),
    }
  }

  return {
    ok: true,
    address: {
      ...address,
      pincode,
      deliveryDistanceKm: zone.distanceKm,
      deliveryRadiusKm:   zone.radiusKm,
      deliveryZoneCenter: zone.center,
    },
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

function couponUsageCount(tracker: Record<string, number>, code: string): number {
  return Object.entries(tracker)
    .filter(([key]) => key === `${code}:__total` || key.startsWith(`${code}:`))
    .reduce((sum, [, value]) => sum + Number(value ?? 0), 0)
}

export async function POST(req: NextRequest) {
  // Enforce authenticated user — read user_id from session, ignore body value
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Override any client-supplied user_id with the authenticated session value
  const user_id      = session.userId
  const { items, payment_status, order_status } = body
  if (!items || !payment_status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const deliveryAddressCheck = validateDeliveryAddressForZone(body.delivery_address)
  if (!deliveryAddressCheck.ok) return deliveryAddressCheck.response

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

    // Check total usage limit
    if (coupon.max_uses_per_phone > 0) {
      const tracker = (settings.coupon_usage_tracker ?? {}) as Record<string, number>
      const tKey    = `${coupon.code}:__total`
      const used    = couponUsageCount(tracker, coupon.code)

      if (used >= coupon.max_uses_per_phone) {
        return NextResponse.json({
          error: `This coupon has reached its usage limit of ${coupon.max_uses_per_phone} order${coupon.max_uses_per_phone !== 1 ? 's' : ''}`,
        }, { status: 400 })
      }

      // Increment usage tracker — await so it's saved before order goes through
      if (payment_status !== 'pending') {
        const updated = { ...tracker, [tKey]: Number(tracker[tKey] ?? 0) + 1 }
        await saveSettingKey('coupon_usage_tracker', updated)
      }
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

  // ── Ensure profile exists (guards against FK violation after DB reset) ──────
  try {
    const profileCheck = await fetch(
      `${SUPA_URL()}/rest/v1/profiles?id=eq.${encodeURIComponent(String(user_id))}&select=id&limit=1`,
      { headers: srvHeaders(), signal: AbortSignal.timeout(6_000) }
    )
    if (profileCheck.ok) {
      const rows = await profileCheck.json()
      if (!Array.isArray(rows) || rows.length === 0) {
        // Profile missing — create a minimal one so the FK constraint passes
        await fetch(`${SUPA_URL()}/rest/v1/profiles`, {
          method:  'POST',
          headers: srvHeaders({ 'Prefer': 'return=minimal' }),
          body: JSON.stringify({
            id:           user_id,
            phone_number: body.customer_phone ?? '',
            full_name:    body.customer_name  ?? '',
          }),
        })
      }
    }
  } catch { /* best-effort — insert will surface the FK error if it still fails */ }

  // ── Build insert payload ───────────────────────────────────────────────────
  const insert: Record<string, unknown> = {
    user_id,
    items,
    total_amount:     verifiedTotal,
    payment_status:   payment_status ?? 'cod',
    order_status:     order_status   ?? 'placed',
    delivery_address: deliveryAddressCheck.address,
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
          const order2 = Array.isArray(d2) ? d2[0] : d2
          return NextResponse.json({ id: order2.id }, { status: 201 })
        }
      }
      console.error('[orders/cod POST] Supabase error:', errText)
      return NextResponse.json({ error: 'Failed to create order', detail: errText }, { status: 500 })
    }

    const data = await res.json()
    const order = Array.isArray(data) ? data[0] : data

    // Alert all drivers the moment a live order is placed. COD orders are
    // actionable immediately; online orders only become live once paid (handled
    // in the PATCH / webhook below), so don't double-alert for them here.
    if (order?.id && (order.payment_status === 'cod' || order.payment_status === 'paid')) {
      notifyAllDrivers(order.id).catch(() => {})
    } else if (order?.driver_id && order?.id) {
      notifyDriverAssignment(order.driver_id, order.id).catch(() => {})
    }

    if (order?.id && order.customer_phone) {
      sendOrderConfirmation({
        phone: order.customer_phone,
        name: order.customer_name || 'Customer',
        orderId: order.id,
        itemsText: summarizeItems(order.items),
        total: order.total_amount,
        paymentMode: order.payment_status === 'cod' ? 'COD' : 'PREPAID',
        address: order.delivery_address,
      }).catch((err) => console.error('[aisensy] order confirmation failed', err))
    }

    return NextResponse.json({ id: order.id }, { status: 201 })
  } catch (err) {
    console.error('[orders/cod POST] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  // Require authenticated session — prevents anonymous payment status manipulation
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { cashfree_order_id, payment_status } = body
  if (!cashfree_order_id || !payment_status) {
    return NextResponse.json({ error: 'Missing cashfree_order_id or payment_status' }, { status: 400 })
  }

  let previousOrder: {
    id?: string
    customer_name?: string | null
    payment_status?: string | null
    coupon_code?: string | null
    customer_phone?: string | null
  } | null = null

  try {
    const existing = await fetch(
      `${SUPA_URL()}/rest/v1/orders?razorpay_order_id=eq.${encodeURIComponent(cashfree_order_id as string)}&select=id,payment_status,coupon_code,customer_phone,customer_name&limit=1`,
      { headers: srvHeaders() }
    )
    if (existing.ok) {
      const rows = await existing.json()
      previousOrder = rows?.[0] ?? null
    }
  } catch { /* best-effort; update below will still decide the final result */ }

  // When marking as paid, verify with Cashfree server-side first
  if (payment_status === 'paid') {
    const APP_ID = process.env.CASHFREE_APP_ID
    const SECRET = process.env.CASHFREE_SECRET_KEY
    if (APP_ID && SECRET) {
      try {
        const cfRes = await fetch(`https://api.cashfree.com/pg/orders/${cashfree_order_id}`, {
          headers: { 'x-api-version': '2023-08-01', 'x-client-id': APP_ID, 'x-client-secret': SECRET },
        })
        if (cfRes.ok) {
          const cfData = await cfRes.json()
          if (cfData.order_status !== 'PAID') {
            return NextResponse.json({ error: 'Payment not confirmed by Cashfree' }, { status: 400 })
          }
        }
      } catch { /* If Cashfree is unreachable, proceed — webhook is the safety net */ }
    }
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

    if (
      payment_status === 'paid' &&
      previousOrder?.coupon_code &&
      previousOrder.payment_status !== 'paid'
    ) {
      try {
        const sRes = await fetch(
          `${SUPA_URL()}/rest/v1/settings?select=key,value`,
          { headers: srvHeaders() }
        )
        if (sRes.ok) {
          const rows: { key: string; value: unknown }[] = await sRes.json()
          const settings = Object.fromEntries(rows.map(r => [r.key, r.value]))
          const couponsRaw = settings.coupons
          const coupons: Coupon[] = Array.isArray(couponsRaw) ? couponsRaw as Coupon[] : []
          const coupon = coupons.find(c => c.code === previousOrder?.coupon_code)
          if (coupon && coupon.max_uses_per_phone > 0) {
            const tracker = (settings.coupon_usage_tracker ?? {}) as Record<string, number>
            const tKey = `${coupon.code}:__total`
            await saveSettingKey('coupon_usage_tracker', { ...tracker, [tKey]: Number(tracker[tKey] ?? 0) + 1 })
          }
        }
      } catch { /* coupon tracking should never block a confirmed paid order */ }
    }

    let confirmedOrder: {
      id?: string
      driver_id?: string | null
      total_amount?: number | null
      items?: unknown
      coupon_code?: string | null
      razorpay_order_id?: string | null
    } | null = null

    // Fetch the updated order to check if DB trigger auto-assigned a driver
    try {
      const updated = await fetch(
        `${SUPA_URL()}/rest/v1/orders?razorpay_order_id=eq.${encodeURIComponent(cashfree_order_id as string)}&select=id,driver_id,total_amount,items,coupon_code,razorpay_order_id`,
        { headers: srvHeaders() }
      )
      if (updated.ok) {
        const rows = await updated.json()
        const order = rows?.[0]
        confirmedOrder = order ?? null
        // Online payment just confirmed → the order is now live. Alert all drivers.
        if (order?.id) {
          notifyAllDrivers(order.id).catch(() => {})
        }
      }
    } catch { /* notification is best-effort */ }

    if (payment_status === 'paid' && previousOrder?.customer_phone) {
      sendOrderConfirmation({
        phone: previousOrder.customer_phone,
        name: previousOrder.customer_name || 'Customer',
        orderId: (confirmedOrder?.id ?? previousOrder.id) as string,
        itemsText: summarizeItems(confirmedOrder?.items),
        total: confirmedOrder?.total_amount ?? 0,
        paymentMode: 'PREPAID',
      }).catch((err) => console.error('[aisensy] order confirmation failed', err))
    }

    return NextResponse.json({ ok: true, order: confirmedOrder })
  } catch (err) {
    console.error('[orders/cod PATCH] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
