export const dynamic = 'force-dynamic'

/**
 * GET /api/orders/active?user_id=<uuid>
 *
 * Returns all non-delivered, non-cancelled orders for a user.
 * Uses the service-role key so this works regardless of whether Supabase
 * RLS SELECT policies are configured on the orders table.
 *
 * Security: user_id is a non-guessable UUID. The endpoint is intentionally
 * public (no auth cookie required) because the customer app uses the anon
 * Supabase client and there is no server-side session token to validate.
 */
import { NextRequest, NextResponse } from 'next/server'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')

  if (!userId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  }

  // Use PostgREST `in` filter with unquoted values — most compatible syntax
  const statuses = 'placed,packed,on_the_way'

  try {
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/orders?select=*` +
      `&user_id=eq.${encodeURIComponent(userId)}` +
      `&order_status=in.(${statuses})` +
      `&payment_status=neq.pending` +
      `&order=created_at.desc`,
      {
        headers: {
          'apikey':        SUPA_SRV(),
          'Authorization': `Bearer ${SUPA_SRV()}`,
        },
        // 10-second timeout via AbortSignal (Node 18+)
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
