export const dynamic = 'force-dynamic'

/**
 * /api/user/addresses
 *
 * GET    ?user_id=<uuid>          — fetch all addresses for a user
 * POST                            — create a new address  { user_id, ...fields }
 * PATCH  ?id=<uuid>&user_id=<uuid> — update an address
 * DELETE ?id=<uuid>&user_id=<uuid> — delete an address
 *
 * user_id is validated on every mutating request so one user cannot
 * touch another user's addresses. No auth cookie required — RN app
 * passes user_id from its local authStore (UUID from profiles table).
 */

import { NextRequest, NextResponse } from 'next/server'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function srvHeaders(extra?: Record<string, string>) {
  return {
    'apikey':        SUPA_SRV(),
    'Authorization': `Bearer ${SUPA_SRV()}`,
    'Content-Type':  'application/json',
    ...extra,
  }
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const res = await fetch(
    `${SUPA_URL()}/rest/v1/user_addresses?user_id=eq.${encodeURIComponent(userId)}&order=created_at.asc`,
    { headers: srvHeaders() },
  )
  if (!res.ok) return NextResponse.json({ error: 'DB error' }, { status: 500 })
  return NextResponse.json(await res.json())
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { user_id, label, custom_label, customer_name, house_number,
          street_address, landmark, pincode, area_name, lat, lng, customer_phone } = body

  if (!user_id || !customer_name || !house_number || !pincode || !customer_phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const res = await fetch(
    `${SUPA_URL()}/rest/v1/user_addresses`,
    {
      method: 'POST',
      headers: srvHeaders({ 'Prefer': 'return=representation' }),
      body: JSON.stringify({
        user_id, label: label ?? 'Home', custom_label: custom_label ?? null,
        customer_name, house_number, street_address: street_address ?? '',
        landmark: landmark ?? '', pincode, area_name: area_name ?? '',
        lat: lat ?? null, lng: lng ?? null, customer_phone,
      }),
    },
  )
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    console.error('[addresses POST]', res.status, err)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
  const rows = await res.json()
  return NextResponse.json(Array.isArray(rows) ? rows[0] : rows, { status: 201 })
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id     = searchParams.get('id')
  const userId = searchParams.get('user_id')
  if (!id || !userId) return NextResponse.json({ error: 'id and user_id required' }, { status: 400 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  // Whitelist updatable fields
  const allowed = ['label','custom_label','customer_name','house_number','street_address',
                   'landmark','pincode','area_name','lat','lng','customer_phone','is_selected']
  const patch: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) patch[key] = body[key]
  }

  const res = await fetch(
    `${SUPA_URL()}/rest/v1/user_addresses?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`,
    {
      method: 'PATCH',
      headers: srvHeaders({ 'Prefer': 'return=representation' }),
      body: JSON.stringify(patch),
    },
  )
  if (!res.ok) return NextResponse.json({ error: 'DB error' }, { status: 500 })
  const rows = await res.json()
  return NextResponse.json(Array.isArray(rows) ? rows[0] : rows)
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id     = searchParams.get('id')
  const userId = searchParams.get('user_id')
  if (!id || !userId) return NextResponse.json({ error: 'id and user_id required' }, { status: 400 })

  const res = await fetch(
    `${SUPA_URL()}/rest/v1/user_addresses?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`,
    { method: 'DELETE', headers: srvHeaders() },
  )
  if (!res.ok) return NextResponse.json({ error: 'DB error' }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
