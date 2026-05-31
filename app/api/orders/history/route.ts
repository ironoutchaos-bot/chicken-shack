export const dynamic = 'force-dynamic'

/**
 * GET /api/orders/history?offset=0&limit=10
 *
 * Returns paginated delivered orders for the authenticated user.
 * user_id is read from the iron-session cookie — not from the query string.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, type SessionData } from '@/lib/session'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export async function GET(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const offset  = parseInt(searchParams.get('offset') ?? '0', 10)
  const limit   = Math.min(parseInt(searchParams.get('limit') ?? '10', 10), 50)
  const rangeEnd = offset + limit - 1

  try {
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/orders?select=*` +
      `&user_id=eq.${encodeURIComponent(session.userId)}` +
      `&order_status=eq.delivered` +
      `&order=created_at.desc` +
      `&offset=${offset}&limit=${limit}`,
      {
        headers: {
          'apikey':        SUPA_SRV(),
          'Authorization': `Bearer ${SUPA_SRV()}`,
          'Range-Unit':    'items',
          'Range':         `${offset}-${rangeEnd}`,
          'Prefer':        'count=none',
        },
        signal: AbortSignal.timeout(10_000),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      console.error('[orders/history] Supabase error:', err)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json(Array.isArray(data) ? data : [])
  } catch (err) {
    console.error('[orders/history] fetch error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
