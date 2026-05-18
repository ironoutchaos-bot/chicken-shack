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

// POST /api/push/subscribe — save or refresh a push subscription for a user
export async function POST(req: NextRequest) {
  let body: { user_id: string; subscription: PushSubscriptionJSON }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { user_id, subscription } = body
  if (!user_id || !subscription?.endpoint) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const keys = subscription.keys as { p256dh: string; auth: string } | undefined

  // Upsert by endpoint — one subscription per browser
  const res = await fetch(
    `${SUPA_URL()}/rest/v1/push_subscriptions`,
    {
      method: 'POST',
      headers: { ...srvHeaders(), 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        user_id,
        endpoint: subscription.endpoint,
        p256dh:   keys?.p256dh ?? '',
        auth:     keys?.auth   ?? '',
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    console.error('[push/subscribe]', err)
    return NextResponse.json({ error: err }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/push/subscribe — remove a subscription
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const endpoint = searchParams.get('endpoint')
  if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })

  await fetch(
    `${SUPA_URL()}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
    { method: 'DELETE', headers: srvHeaders() }
  )

  return NextResponse.json({ ok: true })
}
