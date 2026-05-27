export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

export type Coupon = {
  id:                 string   // uuid generated client-side
  code:               string
  enabled:            boolean
  discount_type:      'percent' | 'fixed'
  discount_value:     number
  max_uses_per_phone: number   // 0 = unlimited
  applies_to:         'all' | 'specific'
  product_ids:        string[] // only used when applies_to = 'specific'
  created_at:         string
}

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

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

async function loadCoupons(): Promise<Coupon[]> {
  try {
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/settings?key=eq.coupons&select=value`,
      { headers: srvHeaders() }
    )
    if (!res.ok) return []
    const rows: { value: unknown }[] = await res.json()
    if (!rows.length) return []
    const v = rows[0].value
    return Array.isArray(v) ? v as Coupon[] : []
  } catch { return [] }
}

async function saveCoupons(coupons: Coupon[]) {
  const h = srvHeaders()
  const patch = await fetch(
    `${SUPA_URL()}/rest/v1/settings?key=eq.coupons`,
    {
      method:  'PATCH',
      headers: { ...h, 'Prefer': 'return=representation' },
      body:    JSON.stringify({ value: coupons }),
    }
  )
  const rows = await patch.json().catch(() => [])
  const updated = Array.isArray(rows) ? rows.length : (patch.ok ? 1 : 0)
  if (updated === 0) {
    await fetch(`${SUPA_URL()}/rest/v1/settings`, {
      method:  'POST',
      headers: { ...h, 'Prefer': 'return=minimal' },
      body:    JSON.stringify({ key: 'coupons', value: coupons }),
    })
  }
}

// GET /api/coupons — returns all coupons (admin only)
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const coupons = await loadCoupons()
  return NextResponse.json(coupons)
}

// POST /api/coupons — create a new coupon
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: Partial<Coupon>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.code?.trim()) return NextResponse.json({ error: 'Code is required' }, { status: 400 })

  const coupons = await loadCoupons()
  const code = body.code.trim().toUpperCase()

  if (coupons.some(c => c.code === code)) {
    return NextResponse.json({ error: 'A coupon with this code already exists' }, { status: 409 })
  }

  const newCoupon: Coupon = {
    id:                 crypto.randomUUID(),
    code,
    enabled:            body.enabled            ?? true,
    discount_type:      body.discount_type      ?? 'percent',
    discount_value:     body.discount_value     ?? 10,
    max_uses_per_phone: body.max_uses_per_phone ?? 0,
    applies_to:         body.applies_to         ?? 'all',
    product_ids:        body.product_ids        ?? [],
    created_at:         new Date().toISOString(),
  }

  await saveCoupons([...coupons, newCoupon])
  return NextResponse.json(newCoupon, { status: 201 })
}

// PATCH /api/coupons — update a coupon by id
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: Partial<Coupon> & { id: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const coupons = await loadCoupons()
  const idx = coupons.findIndex(c => c.id === body.id)
  if (idx === -1) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })

  // If code is being changed, check for duplicates
  if (body.code) {
    const newCode = body.code.trim().toUpperCase()
    if (coupons.some(c => c.code === newCode && c.id !== body.id)) {
      return NextResponse.json({ error: 'A coupon with this code already exists' }, { status: 409 })
    }
    body.code = newCode
  }

  coupons[idx] = { ...coupons[idx], ...body }
  await saveCoupons(coupons)
  return NextResponse.json(coupons[idx])
}

// DELETE /api/coupons?id=xxx — delete a coupon
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const coupons = await loadCoupons()
  const filtered = coupons.filter(c => c.id !== id)
  if (filtered.length === coupons.length) {
    return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
  }
  await saveCoupons(filtered)
  return NextResponse.json({ ok: true })
}
