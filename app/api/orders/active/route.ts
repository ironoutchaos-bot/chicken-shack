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
    return NextResponse.json(Array.isArray(data) ? data : [])
  } catch (err) {
    console.error('[orders/active] fetch error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
