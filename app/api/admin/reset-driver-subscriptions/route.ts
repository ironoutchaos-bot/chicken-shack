export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/reset-driver-subscriptions
 *   Admin-only. Deletes ALL driver push subscriptions so stale/dead ones (from
 *   testing, reinstalls, desktop browsers) are cleared. Each real driver phone
 *   then re-registers a fresh subscription the next time it opens the app.
 */

import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/app/api/admin/login/route'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // PostgREST requires a filter to delete; id is never null → matches all rows.
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/driver_push_subscriptions?id=not.is.null`,
      {
        method: 'DELETE',
        headers: {
          'apikey':        SUPA_SRV(),
          'Authorization': `Bearer ${SUPA_SRV()}`,
          'Prefer':        'return=representation',
        },
      }
    )
    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: 500 })
    }
    const rows = await res.json().catch(() => [])
    const count = Array.isArray(rows) ? rows.length : 0
    return NextResponse.json({ ok: true, cleared: count })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
