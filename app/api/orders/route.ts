export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/app/api/admin/login/route'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SUPA_KEY = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

function srvHeaders() {
  return {
    'apikey':        SUPA_SRV(),
    'Authorization': `Bearer ${SUPA_SRV()}`,
    'Content-Type':  'application/json',
  }
}

// GET /api/orders?user_id=xxx  — returns all orders for a user (non-delivered)
// GET /api/orders              — returns ALL orders (admin only, requires cookie)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')

  // Admin: fetch all orders
  if (!userId) {
    if (!isAdminRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      const res = await fetch(
        `${SUPA_URL()}/rest/v1/orders?select=*&order=created_at.desc`,
        { headers: srvHeaders() }
      )
      const data = await res.json()
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }
  }

  // User: fetch their orders
  try {
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/orders?select=*&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`,
      {
        headers: {
          'apikey':        SUPA_KEY(),
          'Authorization': `Bearer ${SUPA_KEY()}`,
        },
      }
    )
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}

// POST /api/orders — create order after payment verified
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const required = ['user_id', 'items', 'total_amount', 'razorpay_order_id', 'razorpay_payment_id']
  for (const k of required) {
    if (!body[k]) return NextResponse.json({ error: `Missing: ${k}` }, { status: 400 })
  }

  try {
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/orders`,
      {
        method: 'POST',
        headers: { ...srvHeaders(), 'Prefer': 'return=representation' },
        body: JSON.stringify({
          user_id:             body.user_id,
          items:               body.items,
          total_amount:        body.total_amount,
          payment_status:      'paid',
          order_status:        'placed',
          razorpay_order_id:   body.razorpay_order_id,
          razorpay_payment_id: body.razorpay_payment_id,
          notes:               body.notes ?? null,
          delivery_address:    body.delivery_address ?? null,
        }),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: 500 })
    }
    const data = await res.json()
    const order = data[0] ?? data

    // Decrement stock for each ordered item
    const items = body.items as { id: string; quantity: number }[]
    if (Array.isArray(items)) {
      await Promise.all(items.map(item =>
        fetch(
          `${SUPA_URL()}/rest/v1/rpc/decrement_stock`,
          {
            method: 'POST',
            headers: { ...srvHeaders() },
            body: JSON.stringify({ product_id: item.id, qty: item.quantity }),
          }
        ).catch(() => {})
      ))
    }

    return NextResponse.json(order, { status: 201 })
  } catch (err) {
    console.error('[orders POST]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
