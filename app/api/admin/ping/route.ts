export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

// Returns 200 if admin cookie is valid, 401 otherwise
export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get('cookie') ?? ''
  const token = cookieHeader
    .split(';')
    .find(c => c.trim().startsWith('admin_token='))
    ?.split('=')[1]?.trim()

  if (token !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  return NextResponse.json({ ok: true })
}
