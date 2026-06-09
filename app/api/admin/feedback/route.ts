export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/app/api/admin/login/route'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function srvHeaders() {
  return {
    'apikey':        SUPA_SRV(),
    'Authorization': `Bearer ${SUPA_SRV()}`,
  }
}

// GET /api/admin/feedback — all orders that have a feedback rating
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = await fetch(
    `${SUPA_URL()}/rest/v1/orders` +
    `?feedback_rating=not.is.null` +
    `&order=feedback_at.desc` +
    `&select=id,customer_name,customer_phone,total_amount,items,feedback_rating,feedback_comment,feedback_at,created_at`,
    { headers: srvHeaders() }
  )

  if (!res.ok) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const data = await res.json()
  return NextResponse.json(Array.isArray(data) ? data : [])
}
