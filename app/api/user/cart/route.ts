export const dynamic = 'force-dynamic'

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

interface CartItem {
  productId: string
  name: string
  pricePerKg: number
  quantity: number
  imageUrl: string
}

// POST /api/user/cart — save cart to user profile for abandoned cart tracking
export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let items: CartItem[]
  let updatedAt: string
  try {
    const body = await req.json()
    items = body.items
    updatedAt = body.updatedAt
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/profiles?id=eq.${encodeURIComponent(session.userId)}`,
      {
        method: 'PATCH',
        headers: srvHeaders({ 'Prefer': 'return=minimal' }),
        body: JSON.stringify({ cart_json: items, cart_updated_at: updatedAt }),
      }
    )

    // Best-effort: if columns don't exist yet, don't break the app
    if (!res.ok && (res.status === 400 || res.status >= 500)) {
      return NextResponse.json({ ok: true })
    }

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed' }, { status: res.status })
    }

    return NextResponse.json({ ok: true })
  } catch {
    // Best-effort: network/parse errors silently succeed
    return NextResponse.json({ ok: true })
  }
}
