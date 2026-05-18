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

async function getDriverId(req: NextRequest): Promise<string | null> {
  const cookieHeader = req.headers.get('cookie') ?? ''
  const driverId = cookieHeader
    .split(';')
    .find(c => c.trim().startsWith('driver_token='))
    ?.split('=')[1]?.trim()

  if (!driverId) return null

  // Validate the driver exists and is active
  const res = await fetch(
    `${SUPA_URL()}/rest/v1/drivers?id=eq.${encodeURIComponent(driverId)}&select=id,is_active`,
    { headers: srvHeaders() }
  )
  const drivers = await res.json()
  const driver = Array.isArray(drivers) ? drivers[0] : null
  if (!driver?.is_active) return null
  return driverId
}

// GET /api/driver/orders — return orders assigned to this driver
export async function GET(req: NextRequest) {
  const driverId = await getDriverId(req)
  if (!driverId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await fetch(
    `${SUPA_URL()}/rest/v1/orders?driver_id=eq.${encodeURIComponent(driverId)}&order=created_at.desc&select=*`,
    { headers: srvHeaders() }
  )

  if (!res.ok) return NextResponse.json({ error: 'DB error' }, { status: 500 })

  const data = await res.json()
  return NextResponse.json(Array.isArray(data) ? data : [])
}
