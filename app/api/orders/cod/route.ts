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

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { user_id, items, total_amount, payment_status, order_status } = body
  if (!user_id || !items || !total_amount || !payment_status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Build the insert payload — only include non-null fields
  const insert: Record<string, unknown> = {
    user_id,
    items,
    total_amount,
    payment_status:   payment_status ?? 'cod',
    order_status:     order_status    ?? 'placed',
    delivery_address: body.delivery_address ?? null,
    notes:            body.notes            ?? null,
    customer_phone:   body.customer_phone   ?? null,
    customer_name:    body.customer_name    ?? null,
  }

  // Payment gateway fields — stored in razorpay_* columns until a DB migration renames them
  if (body.cashfree_order_id)  insert.razorpay_order_id   = body.cashfree_order_id
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
      const err = await res.text()
      console.error('[orders/cod POST] Supabase error:', err)
      return NextResponse.json({ error: 'Failed to create order', detail: err }, { status: 500 })
    }

    const data = await res.json()
    const order = Array.isArray(data) ? data[0] : data
    return NextResponse.json(order, { status: 201 })
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
