export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, type SessionData } from '@/lib/session'
import { verifyDriverToken } from '@/app/api/driver/login/route'

async function handle(req: NextRequest, remove: boolean) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key)
    return NextResponse.json(
      { error: 'Notifications are not configured' },
      { status: 503 }
    )
  let body: { token?: unknown; role?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (
    typeof body.token !== 'string' ||
    body.token.length < 20 ||
    body.token.length > 4096 ||
    !['customer', 'driver'].includes(String(body.role))
  )
    return NextResponse.json(
      { error: 'Invalid device registration' },
      { status: 400 }
    )
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
  let recipientId: string | null = null
  if (body.role === 'customer') {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    )
    recipientId = session.userId || null
  } else {
    recipientId = verifyDriverToken(
      req.cookies.get('driver_token')?.value ?? ''
    )
    if (recipientId) {
      const result = await fetch(
        `${url}/rest/v1/drivers?id=eq.${encodeURIComponent(
          recipientId
        )}&is_active=eq.true&select=id`,
        { headers, cache: 'no-store', signal: AbortSignal.timeout(8000) }
      )
      if (!result.ok)
        return NextResponse.json(
          { error: 'Could not validate partner access' },
          { status: 503 }
        )
      const rows = await result.json()
      if (!Array.isArray(rows) || !rows.length) recipientId = null
    }
  }
  if (!recipientId)
    return NextResponse.json(
      { error: 'Sign in to register this device' },
      { status: 401 }
    )
  const endpoint = remove
    ? `${url}/rest/v1/mobile_push_devices?token=eq.${encodeURIComponent(
        body.token
      )}&role=eq.${body.role}&recipient_id=eq.${encodeURIComponent(
        recipientId
      )}`
    : `${url}/rest/v1/mobile_push_devices?on_conflict=token`
  try {
    const result = await fetch(endpoint, {
      method: remove ? 'DELETE' : 'POST',
      headers: {
        ...headers,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      ...(remove
        ? {}
        : {
            body: JSON.stringify({
              token: body.token,
              role: body.role,
              recipient_id: recipientId,
              updated_at: new Date().toISOString(),
            }),
          }),
      signal: AbortSignal.timeout(8000),
    })
    if (!result.ok)
      return NextResponse.json(
        { error: 'Device registration is not available yet' },
        { status: 503 }
      )
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: 'Device registration is temporarily unavailable' },
      { status: 503 }
    )
  }
}
export async function POST(req: NextRequest) {
  return handle(req, false)
}
export async function DELETE(req: NextRequest) {
  return handle(req, true)
}
