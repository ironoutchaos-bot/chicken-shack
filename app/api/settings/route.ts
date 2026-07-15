export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/app/api/admin/login/route'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

function srvHeaders(contentType = false) {
  return {
    'apikey':        SUPA_SRV(),
    'Authorization': `Bearer ${SUPA_SRV()}`,
    ...(contentType ? { 'Content-Type': 'application/json' } : {}),
  }
}


// Flatten rows [{key,value}] → {key: value, ...}
function flatten(rows: { key: string; value: unknown }[]): Record<string, unknown> {
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}

/** Returns true if current IST time is within open hours (7:00 AM – 7:00 PM).
 *  Outside this window (7:00 PM → 6:59 AM) the store reads as closed. */
function isStoreOpenBySchedule(): boolean {
  const now = new Date()
  // IST = UTC + 5h 30m
  const istMinutes = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % (24 * 60)
  const openMinutes  = 7 * 60   // 7:00 AM IST
  const closeMinutes = 19 * 60  // 7:00 PM IST
  return istMinutes >= openMinutes && istMinutes < closeMinutes
}

// GET /api/settings — public, returns all settings as flat object
export async function GET() {
  try {
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/settings?select=key,value`,
      { headers: srvHeaders() }
    )
    if (!res.ok) return NextResponse.json(DEFAULTS)
    const rows: { key: string; value: unknown }[] = await res.json()
    if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json(DEFAULTS)

    const settings = { ...DEFAULTS, ...flatten(rows) }

    // If auto-schedule is enabled, override store_open with time-based value
    if (settings.auto_schedule) {
      settings.store_open = isStoreOpenBySchedule()
    }

    return NextResponse.json(settings)
  } catch {
    return NextResponse.json(DEFAULTS)
  }
}

// PATCH /api/settings — admin only, body: { key: string, value: unknown }
export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { key?: string; value?: unknown }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.key) return NextResponse.json({ error: 'Missing key' }, { status: 400 })

  try {
    // Step 1: try to update existing row — use return=representation so we can
    // detect "0 rows matched" (empty array) vs a real update
    const patch = await fetch(
      `${SUPA_URL()}/rest/v1/settings?key=eq.${encodeURIComponent(body.key)}`,
      {
        method:  'PATCH',
        headers: { ...srvHeaders(true), 'Prefer': 'return=representation' },
        body:    JSON.stringify({ value: body.value }),
      }
    )
    const patchBody = await patch.json().catch(() => [])
    const rowsUpdated = Array.isArray(patchBody) ? patchBody.length : (patch.ok ? 1 : 0)

    // Step 2: if no row existed, insert it
    if (rowsUpdated === 0) {
      const insert = await fetch(`${SUPA_URL()}/rest/v1/settings`, {
        method:  'POST',
        headers: { ...srvHeaders(true), 'Prefer': 'return=minimal' },
        body:    JSON.stringify({ key: body.key, value: body.value }),
      })
      if (!insert.ok) {
        const err = await insert.text()
        console.error('[settings insert] Supabase error:', err)
        return NextResponse.json({ error: 'Failed to save setting', detail: err }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

const DEFAULTS: Record<string, unknown> = {
  cod_enabled:                 true,
  cashfree_enabled:            true,
  store_open:                  true,
  out_of_stock:                false, // global "out of stock — order for morning delivery" banner
  product_order:               [],    // custom display order on the order page (array of product ids)
  product_units:               {},    // per-product display unit: { [id]: 'pc' | 'g' | 'kg' }
  auto_schedule:               false, // auto open 7:00 AM – close 7:00 PM IST
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
