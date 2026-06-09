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

/** Returns today's date string (YYYY-MM-DD) in IST (UTC+5:30) */
function getTodayIST(): string {
  const now = new Date(Date.now() + 330 * 60 * 1000)
  return now.toISOString().slice(0, 10)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    // Truncate device ID to prevent oversized keys in the device set JSON
    const deviceId: string = typeof body.device_id === 'string'
      ? body.device_id.slice(0, 64)
      : 'dev_unknown'

    // ── 1. Increment total session visits ─────────────────────────────────
    const currentVisits = typeof await getSetting('shop_visits') === 'number'
      ? (await getSetting('shop_visits') as number)
      : 0
    await setSetting('shop_visits', currentVisits + 1)

    // ── 2. Check if this device is new (all-time) ─────────────────────────
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

    // ── 3. Track today's visits & devices (resets at midnight IST) ────────
    const todayIST  = getTodayIST()
    const savedDate = (await getSetting('shop_visits_today_date')) as string | null
    const isNewDay  = savedDate !== todayIST

    if (isNewDay) {
      // New day — reset all daily counters
      await setSetting('shop_visits_today_date', todayIST)
      await setSetting('shop_visits_today',       1)
      await setSetting('shop_device_ids_today',   { [deviceId]: Date.now() })
    } else {
      // Same day — increment today's visit count
      const todayVisits = (await getSetting('shop_visits_today') as number | null) ?? 0
      await setSetting('shop_visits_today', todayVisits + 1)

      // Add device to today's set if it hasn't been seen today yet
      const todayDevices = ((await getSetting('shop_device_ids_today') ?? {}) as Record<string, number>)
      if (!todayDevices[deviceId]) {
        todayDevices[deviceId] = Date.now()
        await setSetting('shop_device_ids_today', todayDevices)
      }
    }

    return NextResponse.json({ ok: true, new_device: isNewDevice })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
