export const dynamic = 'force-dynamic'

/**
 * POST /api/track/visit
 * Body: { device_id: string }
 *
 * - Increments shop_visits (total sessions)
 * - If device_id is new, also increments shop_unique_devices
 * - Stores seen device IDs in shop_device_ids (JSON object used as a set)
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

async function getSetting(key: string): Promise<unknown> {
  const res = await fetch(
    `${SUPA_URL()}/rest/v1/settings?key=eq.${encodeURIComponent(key)}&select=value`,
    { headers: srvHeaders(), signal: AbortSignal.timeout(6_000) }
  )
  const rows: { value: unknown }[] = await res.json().catch(() => [])
  return rows[0]?.value ?? null
}

async function setSetting(key: string, value: unknown) {
  const patch = await fetch(
    `${SUPA_URL()}/rest/v1/settings?key=eq.${encodeURIComponent(key)}`,
    {
      method:  'PATCH',
      headers: srvHeaders({ 'Prefer': 'return=representation' }),
      body:    JSON.stringify({ value }),
      signal:  AbortSignal.timeout(6_000),
    }
  )
  const rows = await patch.json().catch(() => [])
  if (!Array.isArray(rows) || rows.length === 0) {
    await fetch(`${SUPA_URL()}/rest/v1/settings`, {
      method:  'POST',
      headers: srvHeaders({ 'Prefer': 'return=minimal' }),
      body:    JSON.stringify({ key, value }),
      signal:  AbortSignal.timeout(6_000),
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const deviceId: string = typeof body.device_id === 'string' ? body.device_id : 'dev_unknown'

    // ── 1. Increment total session visits ─────────────────────────────────
    const currentVisits = typeof await getSetting('shop_visits') === 'number'
      ? (await getSetting('shop_visits') as number)
      : 0
    await setSetting('shop_visits', currentVisits + 1)

    // ── 2. Check if this device is new ────────────────────────────────────
    const deviceIds = (await getSetting('shop_device_ids') ?? {}) as Record<string, number>
    const isNewDevice = !deviceIds[deviceId]

    if (isNewDevice) {
      // Add device to known set
      deviceIds[deviceId] = Date.now()
      await setSetting('shop_device_ids', deviceIds)

      // Increment unique device count
      const currentUnique = typeof await getSetting('shop_unique_devices') === 'number'
        ? (await getSetting('shop_unique_devices') as number)
        : 0
      await setSetting('shop_unique_devices', currentUnique + 1)
    }

    return NextResponse.json({ ok: true, new_device: isNewDevice })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
