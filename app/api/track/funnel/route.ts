export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

type FunnelEvent = 'checkout_started' | 'order_completed'
type DailyAnalytics = {
  checkoutStarters?: Record<string, number>
  completedCustomers?: Record<string, number>
}

function srvHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: SUPA_SRV(),
    Authorization: `Bearer ${SUPA_SRV()}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

function todayIST(): string {
  return new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10)
}

async function getSetting(key: string): Promise<DailyAnalytics> {
  const res = await fetch(
    `${SUPA_URL()}/rest/v1/settings?key=eq.${encodeURIComponent(key)}&select=value`,
    { headers: srvHeaders(), cache: 'no-store' },
  )
  const rows: { value?: DailyAnalytics }[] = await res.json().catch(() => [])
  return rows[0]?.value ?? {}
}

async function setSetting(key: string, value: DailyAnalytics) {
  const patch = await fetch(
    `${SUPA_URL()}/rest/v1/settings?key=eq.${encodeURIComponent(key)}`,
    {
      method: 'PATCH',
      headers: srvHeaders({ Prefer: 'return=representation' }),
      body: JSON.stringify({ value }),
    },
  )
  const rows = await patch.json().catch(() => [])
  if (!Array.isArray(rows) || rows.length === 0) {
    await fetch(`${SUPA_URL()}/rest/v1/settings`, {
      method: 'POST',
      headers: srvHeaders({ Prefer: 'return=minimal' }),
      body: JSON.stringify({ key, value }),
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const event = body.event as FunnelEvent
    if (event !== 'checkout_started' && event !== 'order_completed') {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
    }

    const deviceId = typeof body.device_id === 'string'
      ? body.device_id.slice(0, 64)
      : 'dev_unknown'
    const key = event === 'checkout_started'
      ? `analytics_starters_day_${todayIST()}`
      : `analytics_completed_day_${todayIST()}`
    const daily = await getSetting(key)
    const now = Date.now()

    if (event === 'checkout_started') {
      daily.checkoutStarters = daily.checkoutStarters ?? {}
      daily.checkoutStarters[deviceId] = now
    } else {
      daily.completedCustomers = daily.completedCustomers ?? {}
      daily.completedCustomers[deviceId] = now
    }

    await setSetting(key, daily)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
