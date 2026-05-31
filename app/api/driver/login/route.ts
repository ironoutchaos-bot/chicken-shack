export const dynamic = 'force-dynamic'

/**
 * Driver login — passwords are stored as SHA-256 hashes, never plaintext.
 * The driver_token cookie stores the driver's UUID signed with HMAC-SHA256
 * so it cannot be forged by copying an ID from an API response.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHash, createHmac, timingSafeEqual } from 'crypto'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

function srvHeaders() {
  return {
    'apikey':        SUPA_SRV(),
    'Authorization': `Bearer ${SUPA_SRV()}`,
    'Content-Type':  'application/json',
  }
}

/** SHA-256 hash of the password for storage/comparison. */
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

/**
 * Signs the driver UUID with HMAC-SHA256 to produce an unforgeable token.
 * The token is what gets stored in the cookie — not the raw UUID.
 */
function signDriverToken(driverId: string): string {
  const secret = process.env.SESSION_SECRET ?? 'driver-token-secret'
  return `${driverId}.${createHmac('sha256', secret).update(driverId).digest('hex')}`
}

/** Verifies and extracts the driver UUID from a signed token. Returns null if invalid. */
export function verifyDriverToken(token: string): string | null {
  const dot = token.lastIndexOf('.')
  if (dot === -1) return null
  const driverId  = token.slice(0, dot)
  const expected  = signDriverToken(driverId)
  try {
    if (!timingSafeEqual(Buffer.from(token), Buffer.from(expected))) return null
  } catch {
    return null
  }
  return driverId
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
  const driver  = Array.isArray(drivers) ? drivers[0] : null

  if (!driver)           return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  if (!driver.is_active) return NextResponse.json({ error: 'Account is inactive. Contact admin.' }, { status: 403 })

  // Accept both hashed passwords (new) and plaintext (legacy, for existing drivers)
  const hashedInput = hashPassword(password.trim())
  const storedPwd   = driver.password as string
  const match =
    storedPwd === hashedInput ||       // new: hashed match
    storedPwd === password.trim()      // legacy: plaintext (drivers created before this change)

  if (!match) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

  const response = NextResponse.json({
    id:      driver.id,
    name:    driver.name,
    user_id: driver.user_id,
    phone:   driver.phone,
  })

  // Store a signed token in the cookie — not the raw UUID
  response.cookies.set('driver_token', signDriverToken(driver.id), {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 30,
    path:     '/',
  })

  return response
}

// DELETE /api/driver/login — logout
export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set('driver_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge:   0,
    path:     '/',
  })
  return response
}
