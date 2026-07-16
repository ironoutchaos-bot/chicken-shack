export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyDriverToken } from '@/app/api/driver/login/route'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

function srvHeaders(extras?: Record<string, string>) {
  return {
    'apikey':        SUPA_SRV(),
    'Authorization': `Bearer ${SUPA_SRV()}`,
    'Content-Type':  'application/json',
    ...extras,
  }
}

async function getDriverId(req: NextRequest): Promise<string | null> {
  const token    = req.cookies.get('driver_token')?.value ?? ''
  const driverId = verifyDriverToken(token) // decode signed UUID.hmac token
  if (!driverId) return null

  const res = await fetch(
    `${SUPA_URL()}/rest/v1/drivers?id=eq.${encodeURIComponent(driverId)}&select=id,is_active`,
    { headers: srvHeaders() }
  )
  const drivers = await res.json()
  const driver = Array.isArray(drivers) ? drivers[0] : null
  return driver?.is_active ? driverId : null
}

// POST /api/push/driver-subscribe — save push subscription for a driver
export async function POST(req: NextRequest) {
  const driverId = await getDriverId(req)
  if (!driverId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { subscription: PushSubscriptionJSON }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { subscription } = body
  if (!subscription?.endpoint) return NextResponse.json({ error: 'Missing subscription' }, { status: 400 })

  const keys = subscription.keys as { p256dh: string; auth: string } | undefined

  const res = await fetch(
    `${SUPA_URL()}/rest/v1/driver_push_subscriptions?on_conflict=endpoint`,
    {
      method: 'POST',
      headers: srvHeaders({ 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({
        driver_id: driverId,
        endpoint:  subscription.endpoint,
        p256dh:    keys?.p256dh ?? '',
        auth:      keys?.auth   ?? '',
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    console.error('[push/driver-subscribe] save failed:', res.status, err)
    return NextResponse.json({ error: err }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/push/driver-subscribe — remove subscription
export async function DELETE(req: NextRequest) {
  const driverId = await getDriverId(req)
  if (!driverId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const endpoint = searchParams.get('endpoint')
  if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })

  await fetch(
    `${SUPA_URL()}/rest/v1/driver_push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}&driver_id=eq.${encodeURIComponent(driverId)}`,
    { method: 'DELETE', headers: srvHeaders() }
  ).catch(() => {})

  return NextResponse.json({ ok: true })
}
