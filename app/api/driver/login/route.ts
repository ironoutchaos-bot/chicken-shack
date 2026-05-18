export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

function srvHeaders() {
  return {
    'apikey':        SUPA_SRV(),
    'Authorization': `Bearer ${SUPA_SRV()}`,
    'Content-Type':  'application/json',
  }
}

// POST /api/driver/login
export async function POST(req: NextRequest) {
  let body: { user_id?: string; password?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { user_id, password } = body
  if (!user_id?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'user_id and password are required' }, { status: 400 })
  }

  const res = await fetch(
    `${SUPA_URL()}/rest/v1/drivers?user_id=eq.${encodeURIComponent(user_id.trim())}&select=id,name,user_id,phone,is_active,password`,
    { headers: srvHeaders() }
  )

  if (!res.ok) return NextResponse.json({ error: 'DB error' }, { status: 500 })

  const drivers = await res.json()
  const driver = Array.isArray(drivers) ? drivers[0] : null

  if (!driver) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  if (!driver.is_active) return NextResponse.json({ error: 'Account is inactive. Contact admin.' }, { status: 403 })
  if (driver.password !== password.trim()) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

  const response = NextResponse.json({
    id: driver.id,
    name: driver.name,
    user_id: driver.user_id,
    phone: driver.phone,
  })

  // Set driver auth cookie (30 days)
  response.cookies.set('driver_token', driver.id, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  return response
}

// DELETE /api/driver/login — logout
export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set('driver_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
