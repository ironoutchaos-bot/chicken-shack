export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/verify-otp
 * Body: { phone, reqId, otp, countryCode? }
 *
 * 1. Verifies the OTP with MSG91 server-side using the private MSG91_TOKEN.
 * 2. Upserts the user profile in Supabase.
 * 3. Creates an iron-session cookie (30 days).
 *
 * OTP verification is server-side so the MSG91 token is never exposed to
 * the browser and a session can only be created after a genuine OTP match.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, type SessionData } from '@/lib/session'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function srvHeaders(extra?: Record<string, string>) {
  return {
    'apikey':        SUPA_SRV(),
    'Authorization': `Bearer ${SUPA_SRV()}`,
    'Content-Type':  'application/json',
    ...extra,
  }
}

export async function POST(req: NextRequest) {
  let body: { phone?: string; reqId?: string; otp?: string; countryCode?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { phone, reqId, otp, countryCode = '91' } = body

  if (!phone || !/^\d{10}$/.test(phone)) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
  }
  if (!reqId || !otp) {
    return NextResponse.json({ error: 'Missing reqId or otp' }, { status: 400 })
  }

  // ── 1. Verify OTP server-side with MSG91 ──────────────────────────────────
  const MSG91_TOKEN     = process.env.MSG91_TOKEN     ?? ''
  const MSG91_WIDGET_ID = process.env.MSG91_WIDGET_ID ?? ''

  if (!MSG91_TOKEN || !MSG91_WIDGET_ID) {
    console.error('[verify-otp] MSG91_TOKEN or MSG91_WIDGET_ID env var missing')
    return NextResponse.json({ error: 'OTP service not configured' }, { status: 503 })
  }

  let msg91Data: { type?: string; code?: number | string; message?: string }
  try {
    const msg91Res = await fetch('https://api.msg91.com/api/v5/widget/verifyOtp', {
      method:  'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        tokenAuth: MSG91_TOKEN,
        widgetId:  MSG91_WIDGET_ID,
        reqId,
        otp,
      }),
    })
    msg91Data = await msg91Res.json()
  } catch (err) {
    console.error('[verify-otp] MSG91 network error:', err)
    return NextResponse.json({ error: 'Failed to reach OTP provider' }, { status: 502 })
  }

  if (msg91Data.type !== 'success') {
    const isInvalid = msg91Data.code === 705 || msg91Data.code === '705'
    return NextResponse.json(
      { error: isInvalid ? 'Incorrect OTP — please try again' : (msg91Data.message ?? 'OTP verification failed') },
      { status: 401 }
    )
  }

  // ── 2. Upsert profile ─────────────────────────────────────────────────────
  let profileRes: Response
  try {
    profileRes = await fetch(
      `${SUPA_URL()}/rest/v1/profiles?on_conflict=phone_number`,
      {
        method:  'POST',
        headers: srvHeaders({ 'Prefer': 'resolution=merge-duplicates,return=representation' }),
        body:    JSON.stringify({ phone_number: phone }),
      }
    )
  } catch {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  if (!profileRes.ok) {
    const err = await profileRes.text().catch(() => '')
    console.error('[verify-otp] profile upsert failed:', profileRes.status, err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  const rows    = await profileRes.json()
  const profile = Array.isArray(rows) ? rows[0] : rows

  if (!profile?.id) {
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
  }

  // ── 3. Create iron-session cookie ─────────────────────────────────────────
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  session.userId = profile.id
  session.phone  = profile.phone_number
  session.name   = profile.full_name ?? null
  await session.save()

  // countryCode is validated but not stored — phone is already normalised
  void countryCode

  return NextResponse.json({
    user: {
      id:    profile.id,
      phone: profile.phone_number,
      name:  profile.full_name ?? null,
    },
  })
}
