export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, type SessionData } from '@/lib/session'

// NOTE: OTP verification with MSG91 is done on the browser side (avoids server IP block).
// This route only handles: Supabase profile upsert + iron-session cookie creation.

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
  let body: { phone?: string; countryCode?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { phone, countryCode = '91' } = body

  if (!phone || !/^\d{10}$/.test(phone)) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
  }

  // Upsert profile — creates on first login, updates timestamp on subsequent logins
  let profileRes: Response
  try {
    profileRes = await fetch(
      `${SUPA_URL()}/rest/v1/profiles?on_conflict=phone_number`,
      {
        method: 'POST',
        headers: srvHeaders({ 'Prefer': 'resolution=merge-duplicates,return=representation' }),
        body: JSON.stringify({ phone_number: phone }),
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

  const rows = await profileRes.json()
  const profile = Array.isArray(rows) ? rows[0] : rows

  if (!profile?.id) {
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
  }

  // Create iron-session — encrypted httpOnly cookie, 30 days
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  session.userId = profile.id
  session.phone  = profile.phone_number
  session.name   = profile.full_name ?? null
  await session.save()

  return NextResponse.json({
    user: {
      id:    profile.id,
      phone: profile.phone_number,
      name:  profile.full_name ?? null,
    },
  })
}
