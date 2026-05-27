export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_token')?.value === process.env.ADMIN_PASSWORD
}

// GET /api/pincodes/admin — returns ALL pincodes (active + inactive) for admin panel
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const res = await fetch(
      `${SUPA_URL()}/rest/v1/pincodes?select=*&order=pincode.asc`,
      {
        headers: {
          'apikey':        SUPA_SRV(),
          'Authorization': `Bearer ${SUPA_SRV()}`,
        },
      }
    )
    const data = await res.json()
    return NextResponse.json(Array.isArray(data) ? data : [])
  } catch {
    return NextResponse.json([])
  }
}
