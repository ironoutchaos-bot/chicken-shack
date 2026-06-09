export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, type SessionData } from '@/lib/session'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function srvHeaders(extras?: Record<string, string>) {
  return {
    'apikey':        SUPA_SRV(),
    'Authorization': `Bearer ${SUPA_SRV()}`,
    'Content-Type':  'application/json',
    ...extras,
  }
}

// POST /api/orders/[id]/feedback — submit a rating + comment for a delivered order
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: orderId } = await params

  let body: { rating?: number; comment?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const rating = Number(body.rating)
  if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 })
  }
  const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 1000) : null

  // Verify the order belongs to this user and is delivered
  const findRes = await fetch(
    `${SUPA_URL()}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&user_id=eq.${encodeURIComponent(session.userId)}&order_status=eq.delivered&select=id,feedback_rating`,
    { headers: srvHeaders() }
  )
  const rows = await findRes.json().catch(() => [])
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Save feedback (allow updating — customer can change their mind)
  const patchRes = await fetch(
    `${SUPA_URL()}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`,
    {
      method:  'PATCH',
      headers: srvHeaders({ 'Prefer': 'return=minimal' }),
      body:    JSON.stringify({
        feedback_rating:  rating,
        feedback_comment: comment,
        feedback_at:      new Date().toISOString(),
      }),
    }
  )

  if (!patchRes.ok) {
    const err = await patchRes.text()
    return NextResponse.json({ error: err }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
