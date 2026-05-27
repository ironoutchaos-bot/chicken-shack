export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_KEY = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? SUPA_KEY()

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_token')?.value === process.env.ADMIN_PASSWORD
}

// GET /api/pincodes — public: returns active pincodes for client-side check
export async function GET() {
  try {
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/pincodes?select=pincode,area_name&is_active=eq.true&order=pincode.asc`,
      {
        headers: {
          'apikey':        SUPA_KEY(),
          'Authorization': `Bearer ${SUPA_KEY()}`,
        },
      }
    )
    if (!res.ok) return NextResponse.json([])
    const data = await res.json()
    return NextResponse.json(Array.isArray(data) ? data : [])
  } catch {
    return NextResponse.json([])
  }
}

// POST /api/pincodes — admin: add a pincode
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: { pincode?: string; area_name?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!body.pincode?.trim()) return NextResponse.json({ error: 'pincode required' }, { status: 400 })

  try {
    const res = await fetch(`${SUPA_URL()}/rest/v1/pincodes`, {
      method:  'POST',
      headers: {
        'apikey':        SUPA_SRV(),
        'Authorization': `Bearer ${SUPA_SRV()}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=representation',
      },
      body: JSON.stringify({
        pincode:   body.pincode.trim(),
        area_name: body.area_name?.trim() ?? '',
        is_active: true,
      }),
    })
    if (!res.ok) { const e = await res.text(); return NextResponse.json({ error: e }, { status: 500 }) }
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch { return NextResponse.json({ error: 'DB error' }, { status: 500 }) }
}

// PATCH /api/pincodes — admin: toggle is_active
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: { id?: string; is_active?: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    const res = await fetch(`${SUPA_URL()}/rest/v1/pincodes?id=eq.${encodeURIComponent(body.id)}`, {
      method:  'PATCH',
      headers: {
        'apikey':        SUPA_SRV(),
        'Authorization': `Bearer ${SUPA_SRV()}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({ is_active: body.is_active }),
    })
    if (!res.ok) { const e = await res.text(); return NextResponse.json({ error: e }, { status: 500 }) }
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: 'DB error' }, { status: 500 }) }
}

// DELETE /api/pincodes — admin: delete a pincode
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    const res = await fetch(`${SUPA_URL()}/rest/v1/pincodes?id=eq.${encodeURIComponent(id)}`, {
      method:  'DELETE',
      headers: {
        'apikey':        SUPA_SRV(),
        'Authorization': `Bearer ${SUPA_SRV()}`,
        'Prefer':        'return=minimal',
      },
    })
    if (!res.ok) { const e = await res.text(); return NextResponse.json({ error: e }, { status: 500 }) }
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: 'DB error' }, { status: 500 }) }
}
