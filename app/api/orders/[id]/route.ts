export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/app/api/admin/login/route'
import { notifyUserOrderStatus, notifyDriverAssignment } from '@/lib/push-notify'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

function srvHeaders() {
  return {
    'apikey':        SUPA_SRV(),
    'Authorization': `Bearer ${SUPA_SRV()}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=minimal',
  }
}


export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body: { order_status?: string; eta_minutes?: number | null; driver_id?: string | null; driver_name?: string | null; driver_phone?: string | null }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const allowed = ['placed', 'packed', 'on_the_way', 'delivered']
  if (body.order_status && !allowed.includes(body.order_status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.order_status !== undefined) patch.order_status = body.order_status
  if (body.eta_minutes  !== undefined) patch.eta_minutes  = body.eta_minutes
  if (body.driver_id    !== undefined) patch.driver_id    = body.driver_id
  if (body.driver_name  !== undefined) patch.driver_name  = body.driver_name
  if (body.driver_phone !== undefined) patch.driver_phone = body.driver_phone

  try {
    // Fetch the order first to get user_id and payment_status
    const orderRes = await fetch(
      `${SUPA_URL()}/rest/v1/orders?id=eq.${encodeURIComponent(id)}&select=user_id,payment_status`,
      { headers: { 'apikey': SUPA_SRV(), 'Authorization': `Bearer ${SUPA_SRV()}` } }
    )
    const orders = await orderRes.json()
    const userId: string | undefined = orders?.[0]?.user_id
    const paymentStatus: string | undefined = orders?.[0]?.payment_status

    // Block manual driver assignment if payment is not yet confirmed.
    // Fail-safe: if we couldn't read the status (undefined/null), block too.
    // Allowed: 'cod' (cash on delivery) or 'paid' (online payment confirmed).
    if (body.driver_id) {
      const confirmed = paymentStatus === 'cod' || paymentStatus === 'paid'
      if (!confirmed) {
        return NextResponse.json(
          { error: 'Cannot assign a driver until payment is confirmed (COD or paid online)' },
          { status: 422 }
        )
      }
    }

    // Update the order
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/orders?id=eq.${encodeURIComponent(id)}`,
      { method: 'PATCH', headers: srvHeaders(), body: JSON.stringify(patch) }
    )
    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: 500 })
    }

    // Notify customer if status changed
    if (body.order_status && userId) {
      notifyUserOrderStatus(userId, body.order_status).catch(() => {})
    }

    // Notify driver if they were just assigned
    if (body.driver_id) {
      notifyDriverAssignment(body.driver_id, id).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[orders PATCH]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const findRes = await fetch(
      `${SUPA_URL()}/rest/v1/orders?id=eq.${encodeURIComponent(id)}&select=order_status,delivery_address`,
      { headers: { 'apikey': SUPA_SRV(), 'Authorization': `Bearer ${SUPA_SRV()}` } }
    )
    if (!findRes.ok) {
      const err = await findRes.text()
      return NextResponse.json({ error: err || 'Failed to find order' }, { status: 500 })
    }

    const rows: { order_status?: string; delivery_address?: unknown }[] = await findRes.json()
    const order = rows[0]
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const previousAddress =
      order.delivery_address &&
      typeof order.delivery_address === 'object' &&
      !Array.isArray(order.delivery_address)
        ? order.delivery_address as Record<string, unknown>
        : {}
    const deletedAt = new Date().toISOString()
    const deliveryAddress = {
      ...previousAddress,
      adminDeleted: true,
      adminDeletedAt: deletedAt,
      adminDeletedFromStatus: previousAddress.adminDeletedFromStatus ?? order.order_status ?? null,
    }

    const res = await fetch(
      `${SUPA_URL()}/rest/v1/orders?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: { ...srvHeaders(), 'Prefer': 'return=representation' },
        body: JSON.stringify({
          order_status: 'cancelled',
          updated_at: deletedAt,
          delivery_address: deliveryAddress,
        }),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err || 'Failed to delete order' }, { status: 500 })
    }

    const updated = await res.json().catch(() => [])
    return NextResponse.json({ ok: true, deleted_at: deletedAt, order: updated?.[0] ?? null })
  } catch (err) {
    console.error('[orders DELETE]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
