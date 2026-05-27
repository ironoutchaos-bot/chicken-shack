export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

function srvHeaders(contentType = false) {
  return {
    'apikey':        SUPA_SRV(),
    'Authorization': `Bearer ${SUPA_SRV()}`,
    ...(contentType ? { 'Content-Type': 'application/json' } : {}),
  }
}

function isAdmin(req: NextRequest) {
  const token = req.headers.get('cookie')?.split(';')
    .find(c => c.trim().startsWith('admin_token='))
    ?.split('=')[1]?.trim()
  return token === process.env.ADMIN_PASSWORD
}

// Flatten rows [{key,value}] → {key: value, ...}
function flatten(rows: { key: string; value: unknown }[]): Record<string, unknown> {
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}

// GET /api/settings — public, returns all settings as flat object
export async function GET() {
  try {
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/settings?select=key,value`,
      { headers: srvHeaders() }
    )
    if (!res.ok) {
      // Table may not exist yet — return safe defaults
      return NextResponse.json(DEFAULTS)
    }
    const rows: { key: string; value: unknown }[] = await res.json()
    if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json(DEFAULTS)
    return NextResponse.json({ ...DEFAULTS, ...flatten(rows) })
  } catch {
    return NextResponse.json(DEFAULTS)
  }
}

// PATCH /api/settings — admin only, body: { key: string, value: unknown }
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { key?: string; value?: unknown }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.key) return NextResponse.json({ error: 'Missing key' }, { status: 400 })

  try {
    // Use Supabase upsert (POST + resolution=merge-duplicates) so it works whether
    // the row already exists or is brand new. The old PATCH approach silently did
    // nothing when a key was missing because Supabase returns 204 even for 0 updated rows.
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/settings`,
      {
        method:  'POST',
        headers: { ...srvHeaders(true), 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body:    JSON.stringify({ key: body.key, value: body.value }),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      console.error('[settings PATCH] Supabase error:', err)
      return NextResponse.json({ error: 'Failed to save setting', detail: err }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

const DEFAULTS = {
  cod_enabled:                 true,
  cashfree_enabled:            true,
  store_open:                  true,
  min_order_amount:            0,
  delivery_fee:                0,
  delivery_hours:              '8am – 8pm',
  announcement:                '',
  coupon_enabled:              false,
  coupon_code:                 '',
  coupon_discount_type:        'percent',   // 'percent' | 'fixed'
  coupon_discount_value:       10,
  coupon_max_uses_per_phone:   0,           // 0 = unlimited
}
