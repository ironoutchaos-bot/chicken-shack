export const dynamic = 'force-dynamic'

/**
 * Admin login — sets a signed session token rather than storing the raw
 * password as the cookie value, so interception of the cookie does not
 * reveal the admin password.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

/** Derives a short HMAC token from the admin password so the password itself
 *  is never stored in the cookie. */
function makeAdminToken(password: string): string {
  return createHmac('sha256', password).update('admin-session-v1').digest('hex')
}

/** Constant-time comparison to resist timing attacks. */
function safeEqual(a: string, b: string): boolean {
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

export function isAdminRequest(req: NextRequest): boolean {
  const token    = req.cookies.get('admin_token')?.value ?? ''
  const expected = makeAdminToken(process.env.ADMIN_PASSWORD ?? '')
  return !!token && safeEqual(token, expected)
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()
    if (!safeEqual(String(password ?? ''), process.env.ADMIN_PASSWORD ?? '')) {
      return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
    }
    const res = NextResponse.json({ ok: true })
    res.cookies.set('admin_token', makeAdminToken(process.env.ADMIN_PASSWORD!), {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path:     '/',
      maxAge:   60 * 60 * 8, // 8 hours
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('admin_token')
  return res
}
