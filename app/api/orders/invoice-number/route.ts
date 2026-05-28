export const dynamic = 'force-dynamic'

/**
 * GET /api/orders/invoice-number?order_id=<uuid>
 *
 * Returns the sequential invoice number for an order.
 * Counts all orders placed on or before this one (by created_at ASC)
 * to produce a stable, consistent BLURU_NNN number.
 */
import { NextRequest, NextResponse } from 'next/server'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get('order_id')

  if (!orderId) {
    return NextResponse.json({ error: 'order_id is required' }, { status: 400 })
  }

  try {
    // Step 1: get this order's created_at
    const orderRes = await fetch(
      `${SUPA_URL()}/rest/v1/orders?select=created_at&id=eq.${encodeURIComponent(orderId)}&limit=1`,
      {
        headers: {
          'apikey':        SUPA_SRV(),
          'Authorization': `Bearer ${SUPA_SRV()}`,
        },
        signal: AbortSignal.timeout(8_000),
      }
    )
    if (!orderRes.ok) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    const [orderRow] = await orderRes.json()
    if (!orderRow) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    // Step 2: count how many orders were created before or at the same time (lte)
    const countRes = await fetch(
      `${SUPA_URL()}/rest/v1/orders?select=id&created_at=lte.${encodeURIComponent(orderRow.created_at)}&id=neq.${encodeURIComponent(orderId)}`,
      {
        headers: {
          'apikey':        SUPA_SRV(),
          'Authorization': `Bearer ${SUPA_SRV()}`,
          'Prefer':        'count=exact',
          'Range-Unit':    'items',
          'Range':         '0-0',
        },
        signal: AbortSignal.timeout(8_000),
      }
    )

    // PostgREST returns total count in Content-Range header: "0-0/42"
    const contentRange = countRes.headers.get('content-range') ?? ''
    const total        = parseInt(contentRange.split('/')[1] ?? '0', 10)
    const sequence     = (isNaN(total) ? 0 : total) + 1  // this order is #(count_before + 1)

    const invoiceNumber = `BF${String(sequence).padStart(5, '0')}`
    return NextResponse.json({ invoice_number: invoiceNumber })

  } catch (err) {
    console.error('[invoice-number] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
