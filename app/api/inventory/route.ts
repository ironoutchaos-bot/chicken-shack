export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

function srvHeaders() {
  return {
    'apikey':        SUPA_SRV(),
    'Authorization': `Bearer ${SUPA_SRV()}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=minimal',
  }
}

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_token')?.value === process.env.ADMIN_PASSWORD
}

// GET /api/inventory — full product rows for admin
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/products?select=*&order=name.asc`,
      { headers: { 'apikey': SUPA_SRV(), 'Authorization': `Bearer ${SUPA_SRV()}` } }
    )
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}

// POST /api/inventory — create a new product
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    id?: string; name?: string; price_per_kg?: number
    stock_quantity?: number; image_url?: string | null
  }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.id?.trim())   return NextResponse.json({ error: 'Missing id'   }, { status: 400 })
  if (!body.name?.trim()) return NextResponse.json({ error: 'Missing name' }, { status: 400 })

  const slug = body.id.trim().toLowerCase().replace(/\s+/g, '-')

  try {
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/products`,
      {
        method:  'POST',
        headers: { ...srvHeaders(), 'Prefer': 'return=representation' },
        body: JSON.stringify({
          id:             slug,
          name:           body.name.trim(),
          price_per_kg:   body.price_per_kg  ?? 0,
          stock_quantity: body.stock_quantity ?? 50,
          category:       'chicken',
          image_url:      body.image_url ?? null,
        }),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: 500 })
    }
    const data = await res.json()
    return NextResponse.json(Array.isArray(data) ? data[0] : data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// PATCH /api/inventory — update price, stock, name, image_url, category
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    id?: string; price_per_kg?: number; stock_quantity?: number
    name?: string; image_url?: string | null
  }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.price_per_kg   !== undefined) patch.price_per_kg   = body.price_per_kg
  if (body.stock_quantity !== undefined) patch.stock_quantity  = body.stock_quantity
  if (body.name           !== undefined) patch.name            = body.name
  if (body.image_url      !== undefined) patch.image_url       = body.image_url

  try {
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/products?id=eq.${encodeURIComponent(body.id)}`,
      { method: 'PATCH', headers: srvHeaders(), body: JSON.stringify(patch) }
    )
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE /api/inventory?id=xxx — remove a product
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
    await fetch(
      `${SUPA_URL()}/rest/v1/products?id=eq.${encodeURIComponent(id)}`,
      { method: 'DELETE', headers: srvHeaders() }
    )
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
