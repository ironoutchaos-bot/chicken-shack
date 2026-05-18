export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { notifyUserOrderStatus } from '@/lib/push-notify'

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
  const cookieHeader = req.headers.get('cookie') ?? ''
  const driverId = cookieHeader
    .split(';')
    .find(c => c.trim().startsWith('driver_token='))
    ?.split('=')[1]?.trim()
  return driverId || null
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

  const allowed = ['on_the_way', 'delivered']
  if (!body.order_status || !allowed.includes(body.order_status)) {
    return NextResponse.json({ error: 'Drivers can only set: on_the_way, delivered' }, { status: 400 })
  }

  // ── Run driver-auth check and order-ownership fetch IN PARALLEL ────────────
  // Previously these were 3 sequential calls; now we do 2 in parallel, cutting
  // cold-start latency roughly in half.
  const [driverRes, orderRes] = await Promise.all([
    fetch(
      `${SUPA_URL()}/rest/v1/drivers?id=eq.${encodeURIComponent(driverId)}&select=id,is_active`,
      { headers: srvHeaders() }
    ),
    fetch(
      `${SUPA_URL()}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&driver_id=eq.${encodeURIComponent(driverId)}&select=id,order_status,user_id`,
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
    return NextResponse.json({ error: 'Order not found or not assigned to you' }, { status: 404 })
  }

  // ── Update the order ───────────────────────────────────────────────────────
  const patchRes = await fetch(
    `${SUPA_URL()}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`,
    {
      method:  'PATCH',
      headers: srvHeaders({ 'Prefer': 'return=minimal' }),
      body:    JSON.stringify({
        order_status: body.order_status,
        updated_at:   new Date().toISOString(),
      }),
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
