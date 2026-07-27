export const dynamic = 'force-dynamic'

/**
 * POST /api/cashfree/webhook
 *
 * Receives Cashfree payment webhooks and marks the corresponding order as paid.
 * This handles the case where the user closes the browser before being redirected
 * back to the app after payment.
 *
 * Register this URL in the Cashfree dashboard:
 *   https://blurufresh.com/api/cashfree/webhook
 *
 * Signature verification:
 *   HMAC-SHA256(x-webhook-timestamp + rawBody, CASHFREE_SECRET_KEY) → base64
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { notifyAllDrivers } from '@/lib/push-notify'
import { sendOrderConfirmationOnce, summarizeItems } from '@/lib/aisensy'

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

type WebhookOrder = {
  id: string
  customer_phone?: string | null
  customer_name?: string | null
  items?: unknown
  total_amount?: number | null
  delivery_address?: unknown
}

// Safety net for the customer's WhatsApp order confirmation. sendOrderConfirmationOnce
// de-duplicates against the order row, so this is a no-op when the return-URL
// flow already sent the message.
async function sendConfirmation(order: WebhookOrder) {
  if (!order?.id || !order.customer_phone) return
  await sendOrderConfirmationOnce({
    phone: order.customer_phone,
    name: order.customer_name || 'Customer',
    orderId: order.id,
    itemsText: summarizeItems(order.items),
    total: order.total_amount ?? 0,
    paymentMode: 'PREPAID',
    address: order.delivery_address,
  })
}

export async function POST(req: NextRequest) {
  // Read raw body first — needed for signature verification
  const rawBody = await req.text()

  const timestamp   = req.headers.get('x-webhook-timestamp') ?? ''
  const receivedSig = req.headers.get('x-webhook-signature') ?? ''

  const SECRET = process.env.CASHFREE_SECRET_KEY
  if (!SECRET) {
    console.error('[cashfree/webhook] CASHFREE_SECRET_KEY not set')
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }

  // Verify HMAC-SHA256 signature
  const computed = createHmac('sha256', SECRET)
    .update(timestamp + rawBody)
    .digest('base64')

  if (computed !== receivedSig) {
    console.error('[cashfree/webhook] Signature mismatch — possible spoofed request')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const type = event.type as string
  console.log('[cashfree/webhook] Received event:', type)

  // Only handle successful payments
  // Cashfree may use 'PAYMENT_SUCCESS_WEBHOOK' (2023-08-01) or 'PAYMENT_SUCCESS' (2022-09-01)
  if (!type?.startsWith('PAYMENT_SUCCESS')) {
    // Acknowledge other event types without processing
    return NextResponse.json({ ok: true })
  }

  const data    = event.data as Record<string, unknown> | undefined
  const order   = data?.order   as Record<string, unknown> | undefined
  const payment = data?.payment as Record<string, unknown> | undefined

  const cfOrderId  = order?.order_id   as string | undefined
  const cfPaymentId = payment?.cf_payment_id as string | number | undefined

  if (!cfOrderId) {
    console.error('[cashfree/webhook] Missing order_id in payload')
    return NextResponse.json({ error: 'Missing order_id' }, { status: 400 })
  }

  try {
    // Find the order by cashfree_order_id (stored in razorpay_order_id column)
    const findRes = await fetch(
      `${SUPA_URL()}/rest/v1/orders?razorpay_order_id=eq.${encodeURIComponent(cfOrderId)}&select=id,payment_status,order_status,customer_phone,customer_name,items,total_amount,delivery_address`,
      { headers: srvHeaders() }
    )

    if (!findRes.ok) {
      const err = await findRes.text()
      console.error('[cashfree/webhook] DB find error:', err)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    const rows = await findRes.json() as (WebhookOrder & { payment_status: string; order_status?: string | null })[]

    if (!rows.length) {
      // Order not found — could mean the user was redirected back and created the
      // order via the return-URL flow before the webhook arrived. Return 200 so
      // Cashfree doesn't keep retrying, but log it for investigation.
      console.warn('[cashfree/webhook] No DB order found for cf_order_id:', cfOrderId)
      return NextResponse.json({ ok: true })
    }

    const dbOrder = rows[0]

    // Idempotency guard — already marked paid (by return-URL flow or previous webhook)
    if (dbOrder.payment_status === 'paid') {
      console.log('[cashfree/webhook] Order already paid, skipping:', dbOrder.id)
      await sendConfirmation(dbOrder)
      return NextResponse.json({ ok: true })
    }

    // Mark order as paid
    const patch: Record<string, unknown> = {
      payment_status: 'paid',
      updated_at:     new Date().toISOString(),
    }
    if (cfPaymentId) {
      patch.razorpay_payment_id = String(cfPaymentId)
    }

    const patchRes = await fetch(
      `${SUPA_URL()}/rest/v1/orders?id=eq.${encodeURIComponent(dbOrder.id)}`,
      {
        method:  'PATCH',
        headers: srvHeaders({ 'Prefer': 'return=minimal' }),
        body:    JSON.stringify(patch),
      }
    )

    if (!patchRes.ok) {
      const err = await patchRes.text()
      console.error('[cashfree/webhook] Patch failed:', err)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    console.log('[cashfree/webhook] ✓ Order marked paid:', dbOrder.id, '| cf_order:', cfOrderId)

    // Online payment confirmed → the order is now live. Alert all drivers so a
    // loud notification pops for every order, assigned or not.
    if (dbOrder.order_status !== 'delivered' && dbOrder.order_status !== 'cancelled') {
      notifyAllDrivers(dbOrder.id).catch(() => {})
    }

    await sendConfirmation(dbOrder)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[cashfree/webhook] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
