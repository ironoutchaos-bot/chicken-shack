export const dynamic = 'force-dynamic'

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

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_token')?.value === process.env.ADMIN_PASSWORD
}

async function resetKey(key: string, defaultVal: unknown) {
  const patch = await fetch(
    `${SUPA_URL()}/rest/v1/settings?key=eq.${encodeURIComponent(key)}`,
    {
      method:  'PATCH',
      headers: srvHeaders({ 'Prefer': 'return=representation' }),
      body:    JSON.stringify({ value: defaultVal }),
    }
  )
  const rows = await patch.json().catch(() => [])
  if (!Array.isArray(rows) || rows.length === 0) {
    await fetch(`${SUPA_URL()}/rest/v1/settings`, {
      method:  'POST',
      headers: srvHeaders({ 'Prefer': 'return=minimal' }),
      body:    JSON.stringify({ key, value: defaultVal }),
    })
  }
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await resetKey('shop_visits',         0)
    await resetKey('shop_unique_devices', 0)
    await resetKey('shop_device_ids',     {})
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
