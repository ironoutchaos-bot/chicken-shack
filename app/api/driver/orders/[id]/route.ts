export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { notifyUserOrderStatus } from '@/lib/push-notify'
import { verifyDriverToken } from '@/app/api/driver/login/route'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

function srvHeaders(extras?: Record<string, string>) {
  return {
    'apikey':        SUPA_SRV(),
    'Authorization': `Bearer ${SUPA_SRV()}`,
    'Content-Type':  'application/json',
    ...extras,
  }
}

function getDriverId(req: NextRequest): string | null {
  return verifyDriverToken(req.cookies.get('driver_token')?.value ?? '')
}

// PATCH /api/driver/orders/[id] — driver updates order status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const driverId = getDriverId(req)
  if (!driverId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id: orderId } = await params

  let body: { order_status?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const allowed = ['packed', 'on_the_way', 'delivered']
  if (!body.order_status || !allowed.includes(body.order_status)) {
    return NextResponse.json({ error: 'Drivers can only set: packed, on_the_way, delivered' }, { status: 400 })
  }

  // ── Run driver-auth check and order-ownership fetch IN PARALLEL ────────────
  // Previously these were 3 sequential calls; now we do 2 in parallel, cutting
  // cold-start latency roughly in half.
  const [driverRes, orderRes] = await Promise.all([
    fetch(
      `${SUPA_URL()}/rest/v1/drivers?id=eq.${encodeURIComponent(driverId)}&select=id,is_active,name,phone`,
      { headers: srvHeaders() }
    ),
    // Look the order up by id only — drivers can act on unassigned orders too
    // (the dashboard shows the unassigned pool). Ownership is checked below.
    fetch(
      `${SUPA_URL()}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=id,order_status,payment_status,user_id,driver_id`,
      { headers: srvHeaders() }
    ),
  ])

  const [drivers, orders] = await Promise.all([
    driverRes.json(),
    orderRes.json(),
  ])

  const driver = Array.isArray(drivers) ? drivers[0] : null
  if (!driver?.is_active) {
    return NextResponse.json({ error: 'Driver account is inactive or not found' }, { status: 403 })
  }

  const order = Array.isArray(orders) ? orders[0] : null
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
  if (order.order_status === 'delivered' || order.order_status === 'cancelled') {
    return NextResponse.json({ error: 'This order is already closed' }, { status: 409 })
  }
  if (order.payment_status !== 'cod' && order.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Payment is not confirmed for this order yet' }, { status: 422 })
  }
  // Block only if the order is already claimed by a DIFFERENT driver.
  if (order.driver_id && order.driver_id !== driverId) {
    return NextResponse.json({ error: 'This order is already being handled by another driver' }, { status: 409 })
  }

  // ── Update the order — also claim it if it was unassigned ──────────────────
  const patch: Record<string, unknown> = {
    order_status: body.order_status,
    updated_at:   new Date().toISOString(),
  }
  if (!order.driver_id) {
    patch.driver_id    = driverId
    patch.driver_name  = driver.name  ?? null
    patch.driver_phone = driver.phone ?? null
  }

  const patchRes = await fetch(
    `${SUPA_URL()}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`,
    {
      method:  'PATCH',
      headers: srvHeaders({ 'Prefer': 'return=minimal' }),
      body:    JSON.stringify(patch),
    }
  )

  if (!patchRes.ok) {
    const err = await patchRes.text()
    return NextResponse.json({ error: err }, { status: 500 })
  }

  // ── Notify the customer (fire-and-forget, don't block the response) ───────
  if (order.user_id) {
    notifyUserOrderStatus(order.user_id, body.order_status).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
