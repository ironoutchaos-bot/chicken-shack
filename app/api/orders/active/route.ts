export const dynamic = 'force-dynamic'

/**
 * GET /api/orders/active
 *
 * Returns all non-delivered, non-cancelled orders for the authenticated user.
 * Requires a valid iron-session cookie — user_id is read from the session,
 * not from a query param, so one user cannot access another's orders.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, type SessionData } from '@/lib/session'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const AUTO_PACKING_AFTER_MS = 25 * 60 * 1000

export async function GET(_req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const statuses = 'placed,packed,on_the_way'

  try {
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/orders?select=*` +
      `&user_id=eq.${encodeURIComponent(session.userId)}` +
      `&order_status=in.(${statuses})` +
      `&payment_status=neq.pending` +
      `&order=created_at.desc`,
      {
        headers: {
          'apikey':        SUPA_SRV(),
          'Authorization': `Bearer ${SUPA_SRV()}`,
        },
        signal: AbortSignal.timeout(10_000),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      console.error('[orders/active] Supabase error:', err)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    const data = await res.json()
    const rows = Array.isArray(data) ? data : []
    const now = Date.now()

    await Promise.all(rows.map(async (order: { id?: string; order_status?: string; created_at?: string }) => {
      if (order.order_status !== 'placed' || !order.id || !order.created_at) return
      const createdAt = new Date(order.created_at).getTime()
      if (!Number.isFinite(createdAt) || now - createdAt < AUTO_PACKING_AFTER_MS) return

      try {
        const promote = await fetch(
          `${SUPA_URL()}/rest/v1/orders?id=eq.${encodeURIComponent(order.id)}&order_status=eq.placed`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPA_SRV(),
              'Authorization': `Bearer ${SUPA_SRV()}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ order_status: 'packed' }),
            signal: AbortSignal.timeout(8_000),
          },
        )
        if (promote.ok) order.order_status = 'packed'
      } catch {
        // Keep returning the order; the next background sync will retry promotion.
      }
    }))

    return NextResponse.json(rows)
  } catch (err) {
    console.error('[orders/active] fetch error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
