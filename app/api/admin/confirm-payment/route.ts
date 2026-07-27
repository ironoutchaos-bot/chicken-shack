export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/confirm-payment
 * Body: { order_id: string }
 *
 * Manually marks a pending online payment as paid and triggers driver auto-assignment.
 * Used when webhook/client-side verify fails and admin needs to confirm manually.
 */
import { NextRequest, NextResponse } from 'next/server'
import { notifyDriverAssignment } from '@/lib/push-notify'
import { sendOrderConfirmationOnce, summarizeItems } from '@/lib/aisensy'
import { isAdminRequest } from '@/app/api/admin/login/route'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function srvHeaders(extra?: Record<string, string>) {
  return {
    'apikey':        SUPA_SRV(),
    'Authorization': `Bearer ${SUPA_SRV()}`,
    'Content-Type':  'application/json',
    ...extra,
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { order_id } = await req.json().catch(() => ({}))
  if (!order_id) return NextResponse.json({ error: 'Missing order_id' }, { status: 400 })

  // Update payment_status → 'paid' (this triggers the DB auto-assign driver trigger)
  const patchRes = await fetch(
    `${SUPA_URL()}/rest/v1/orders?id=eq.${encodeURIComponent(order_id)}`,
    {
      method:  'PATCH',
      headers: srvHeaders({ 'Prefer': 'return=representation' }),
      body:    JSON.stringify({
        payment_status: 'paid',
        updated_at:     new Date().toISOString(),
      }),
    }
  )

  if (!patchRes.ok) {
    const err = await patchRes.text()
    return NextResponse.json({ error: `DB error: ${err}` }, { status: 500 })
  }

  const rows = await patchRes.json()
  const updated = Array.isArray(rows) ? rows[0] : rows

  // Notify driver if auto-assigned by trigger
  if (updated?.driver_id && updated?.id) {
    notifyDriverAssignment(updated.driver_id, updated.id).catch(() => {})
  }

  // Same WhatsApp confirmation the customer would have received automatically.
  // sendOrderConfirmationOnce de-duplicates, so a manual confirm can never send
  // a second copy of a message that already went out.
  if (updated?.id && updated?.customer_phone) {
    await sendOrderConfirmationOnce({
      phone: updated.customer_phone,
      name: updated.customer_name || 'Customer',
      orderId: updated.id,
      itemsText: summarizeItems(updated.items),
      total: updated.total_amount ?? 0,
      paymentMode: 'PREPAID',
      address: updated.delivery_address,
    })
  }

  return NextResponse.json({ ok: true, order: updated })
}
