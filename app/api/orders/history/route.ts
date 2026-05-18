export const dynamic = 'force-dynamic'

/**
 * GET /api/orders/history?user_id=<uuid>&offset=0&limit=10
 *
 * Returns paginated delivered orders for a user.
 * Uses service-role key to bypass RLS.
 */
import { NextRequest, NextResponse } from 'next/server'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)
  const limit  = parseInt(searchParams.get('limit')  ?? '10', 10)

  if (!userId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  }

  const rangeEnd = offset + Math.min(limit, 50) - 1  // cap at 50

  try {
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/orders?select=*` +
      `&user_id=eq.${encodeURIComponent(userId)}` +
      `&order_status=eq.delivered` +
      `&order=created_at.desc` +
      `&offset=${offset}&limit=${rangeEnd - offset + 1}`,
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
