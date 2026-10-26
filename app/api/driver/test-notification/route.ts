export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyDriverToken } from '@/app/api/driver/login/route'
import { notifyAllDrivers } from '@/lib/push-notify'

export async function POST(req: NextRequest) {
  const driverId = verifyDriverToken(req.cookies.get('driver_token')?.value ?? '')
  if (!driverId) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  let body: { endpoint?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  if (typeof body.endpoint !== 'string' || !body.endpoint || body.endpoint.length > 4096) {
    return NextResponse.json({ error: 'Enable alerts on this phone first.' }, { status: 400 })
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  try {
    const response = await fetch(`${url}/rest/v1/drivers?id=eq.${encodeURIComponent(driverId)}&select=is_active`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store',
    })
    if (!response.ok) throw new Error('Driver verification failed')
    const drivers = await response.json()
    if (!drivers[0]?.is_active) return NextResponse.json({ error: 'Driver account is inactive.' }, { status: 403 })
    const result = await notifyAllDrivers(`test-${Date.now()}`, true, { driverId, endpoint: body.endpoint })
    if (!result.sent) return NextResponse.json({ error: 'This phone could not receive the test. Tap Enable Alerts to register again.', ...result }, { status: 422 })
    return NextResponse.json({ ok: true, ...result })
  } catch {
    return NextResponse.json({ error: 'Could not send the test. Please try again.' }, { status: 503 })
  }
}
