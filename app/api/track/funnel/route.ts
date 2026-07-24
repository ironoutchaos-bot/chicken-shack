export const dynamic = 'force-dynamic'

import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

type FunnelEvent = 'checkout_started' | 'order_completed'

function srvHeaders() {
  return {
    apikey: SUPA_SRV(),
    Authorization: `Bearer ${SUPA_SRV()}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=ignore-duplicates,return=minimal',
  }
}

function todayIST(): string {
  return new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10)
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
    const eventName = event === 'checkout_started' ? 'starter' : 'completed'
    const hash = createHash('sha256').update(deviceId).digest('hex').slice(0, 20)
    const response = await fetch(
      `${SUPA_URL()}/rest/v1/settings?on_conflict=key`,
      {
        method: 'POST',
        headers: srvHeaders(),
        body: JSON.stringify({
          key: `analytics_event_${eventName}_${todayIST()}_${hash}`,
          value: { deviceId, at: Date.now() },
        }),
      },
    )

    if (!response.ok) {
      return NextResponse.json({ ok: false }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
