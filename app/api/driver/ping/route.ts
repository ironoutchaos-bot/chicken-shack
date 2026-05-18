export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

function srvHeaders() {
  return {
    'apikey':        SUPA_SRV(),
    'Authorization': `Bearer ${SUPA_SRV()}`,
  }
}

// GET /api/driver/ping — validate driver session, return driver info
export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get('cookie') ?? ''
  const driverId = cookieHeader
    .split(';')
    .find(c => c.trim().startsWith('driver_token='))
    ?.split('=')[1]?.trim()

  if (!driverId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const res = await fetch(
    `${SUPA_URL()}/rest/v1/drivers?id=eq.${encodeURIComponent(driverId)}&select=id,name,user_id,phone,is_active`,
    { headers: srvHeaders() }
  )

  if (!res.ok) return NextResponse.json({ error: 'DB error' }, { status: 500 })

  const drivers = await res.json()
  const driver = Array.isArray(drivers) ? drivers[0] : null

  if (!driver) return NextResponse.json({ error: 'Not found' }, { status: 401 })
  if (!driver.is_active) return NextResponse.json({ error: 'Inactive' }, { status: 403 })

  return NextResponse.json(driver)
}
