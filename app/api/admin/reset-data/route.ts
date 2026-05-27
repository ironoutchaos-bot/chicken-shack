export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/reset-data
 *
 * Pre-launch cleanup: deletes ALL orders, ALL customer profiles,
 * ALL Supabase auth users, and resets the coupon usage tracker.
 * Admin-only. Irreversible.
 */

import { NextRequest, NextResponse } from 'next/server'

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

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_token')?.value === process.env.ADMIN_PASSWORD
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, string> = {}

  // ── 1. Delete all orders ────────────────────────────────────────────────
  try {
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/orders?id=not.is.null`,
      { method: 'DELETE', headers: srvHeaders({ 'Prefer': 'return=minimal' }) }
    )
    results.orders = res.ok ? 'cleared' : `failed (${res.status}): ${await res.text()}`
  } catch (e) {
    results.orders = `error: ${e}`
  }

  // ── 2. Delete all profiles ──────────────────────────────────────────────
  try {
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/profiles?id=not.is.null`,
      { method: 'DELETE', headers: srvHeaders({ 'Prefer': 'return=minimal' }) }
    )
    results.profiles = res.ok ? 'cleared' : `failed (${res.status}): ${await res.text()}`
  } catch (e) {
    results.profiles = `error: ${e}`
  }

  // ── 3. Delete all Supabase auth users ───────────────────────────────────
  try {
    // List all auth users (up to 1000)
    const listRes = await fetch(
      `${SUPA_URL()}/auth/v1/admin/users?page=1&per_page=1000`,
      { headers: srvHeaders() }
    )
    if (!listRes.ok) {
      results.auth_users = `list failed (${listRes.status}): ${await listRes.text()}`
    } else {
      const data = await listRes.json()
      const users: { id: string }[] = data.users ?? (Array.isArray(data) ? data : [])

      let deleted = 0
      let failed  = 0
      for (const user of users) {
        const del = await fetch(
          `${SUPA_URL()}/auth/v1/admin/users/${user.id}`,
          { method: 'DELETE', headers: srvHeaders() }
        )
        if (del.ok) deleted++
        else failed++
      }
      results.auth_users = `${deleted} deleted${failed > 0 ? `, ${failed} failed` : ''}`
    }
  } catch (e) {
    results.auth_users = `error: ${e}`
  }

  // ── 4. Reset coupon usage tracker ──────────────────────────────────────
  try {
    // PATCH to empty object — same reliable upsert pattern
    const patch = await fetch(
      `${SUPA_URL()}/rest/v1/settings?key=eq.coupon_usage_tracker`,
      {
        method:  'PATCH',
        headers: srvHeaders({ 'Prefer': 'return=minimal' }),
        body:    JSON.stringify({ value: {} }),
      }
    )
    results.coupon_tracker = patch.ok ? 'reset' : `failed (${patch.status})`
  } catch (e) {
    results.coupon_tracker = `error: ${e}`
  }

  return NextResponse.json({ ok: true, results })
}
