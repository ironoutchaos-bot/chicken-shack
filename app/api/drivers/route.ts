export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

function srvHeaders(extras?: Record<string, string>) {
  return {
    'apikey':        SUPA_SRV(),
    'Authorization': `Bearer ${SUPA_SRV()}`,
    'Content-Type':  'application/json',
    ...extras,
  }
}

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_token')?.value === process.env.ADMIN_PASSWORD
}

// GET /api/drivers — list all drivers (admin only)
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await fetch(
    `${SUPA_URL()}/rest/v1/drivers?select=id,name,user_id,phone,is_active,created_at&order=created_at.desc`,
    { headers: srvHeaders() }
  )
  const data = await res.json()
  return NextResponse.json(Array.isArray(data) ? data : [])
}

// POST /api/drivers — create a driver (admin only)
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { name?: string; user_id?: string; password?: string; phone?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, user_id, password, phone } = body
  if (!name?.trim() || !user_id?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'name, user_id, and password are required' }, { status: 400 })
  }

  const res = await fetch(
    `${SUPA_URL()}/rest/v1/drivers`,
    {
      method: 'POST',
      headers: srvHeaders({ 'Prefer': 'return=representation' }),
      body: JSON.stringify({ name: name.trim(), user_id: user_id.trim(), password: password.trim(), phone: phone?.trim() || null, is_active: true }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    if (err.includes('unique') || err.includes('duplicate')) {
      return NextResponse.json({ error: 'User ID already taken' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create driver' }, { status: 500 })
  }

  const data = await res.json()
  return NextResponse.json(Array.isArray(data) ? data[0] : data, { status: 201 })
}
