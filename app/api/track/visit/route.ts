export const dynamic = 'force-dynamic'

/**
 * POST /api/track/visit
 *
 * Public endpoint — increments the shop visitor counter stored in the
 * settings table under the key `shop_visits`.
 * The client fires this once per browser session (guarded by sessionStorage).
 */

import { NextResponse } from 'next/server'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function srvHeaders(extra: Record<string, string> = {}) {
  return {
    'apikey':        SUPA_SRV(),
    'Authorization': `Bearer ${SUPA_SRV()}`,
    'Content-Type':  'application/json',
    ...extra,
  }
}

export async function POST() {
  try {
    // Read current count
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/settings?key=eq.shop_visits&select=value`,
      { headers: srvHeaders() }
    )
    const rows: { value: unknown }[] = await res.json().catch(() => [])
    const current  = typeof rows[0]?.value === 'number' ? rows[0].value : 0
    const newCount = current + 1

    // Try PATCH first (update existing row)
    const patch = await fetch(
      `${SUPA_URL()}/rest/v1/settings?key=eq.shop_visits`,
      {
        method:  'PATCH',
        headers: srvHeaders({ 'Prefer': 'return=representation' }),
        body:    JSON.stringify({ value: newCount }),
      }
    )
    const patchBody = await patch.json().catch(() => [])
    const updated   = Array.isArray(patchBody) ? patchBody.length : (patch.ok ? 1 : 0)

    // INSERT if row didn't exist yet
    if (updated === 0) {
      await fetch(`${SUPA_URL()}/rest/v1/settings`, {
        method:  'POST',
        headers: srvHeaders({ 'Prefer': 'return=minimal' }),
        body:    JSON.stringify({ key: 'shop_visits', value: 1 }),
      })
    }

    return NextResponse.json({ ok: true })
  } catch {
    // Silently fail — don't break the user experience for analytics
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
