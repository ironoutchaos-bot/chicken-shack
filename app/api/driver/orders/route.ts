export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyDriverToken } from '@/app/api/driver/login/route'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

function srvHeaders() {
  return {
    'apikey':        SUPA_SRV(),
    'Authorization': `Bearer ${SUPA_SRV()}`,
  }
}

async function getDriverId(req: NextRequest): Promise<string | null> {
  const token    = req.cookies.get('driver_token')?.value ?? ''
  const driverId = verifyDriverToken(token)   // verifies HMAC signature
  if (!driverId) return null

  // Confirm driver still exists and is active
  const res = await fetch(
    `${SUPA_URL()}/rest/v1/drivers?id=eq.${encodeURIComponent(driverId)}&select=id,is_active`,
    { headers: srvHeaders() }
  )
  const drivers = await res.json()
  const driver  = Array.isArray(drivers) ? drivers[0] : null
  if (!driver?.is_active) return null
  return driverId
}

// GET /api/driver/orders — return orders assigned to this driver + all unassigned active orders
export async function GET(req: NextRequest) {
  const driverId = await getDriverId(req)
  if (!driverId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch both in parallel:
  // 1. Orders explicitly assigned to this driver (any status, including delivered history)
  // 2. Unassigned active orders (so driver sees new orders even if auto-assign didn't fire)
  const [assignedRes, unassignedRes] = await Promise.all([
    fetch(
      `${SUPA_URL()}/rest/v1/orders?driver_id=eq.${encodeURIComponent(driverId)}&order=created_at.desc&select=*`,
      { headers: srvHeaders() }
    ),
    fetch(
      `${SUPA_URL()}/rest/v1/orders?driver_id=is.null&order_status=not.in.(delivered,cancelled)&order=created_at.desc&select=*`,
      { headers: srvHeaders() }
    ),
  ])

  if (!assignedRes.ok || !unassignedRes.ok) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const assigned:   object[] = await assignedRes.json().catch(() => [])
  const unassigned: object[] = await unassignedRes.json().catch(() => [])

  // Merge, deduplicate by id, keep assigned first (they may overlap after trigger fires)
  const seen   = new Set<string>()
  const merged = [...assigned, ...unassigned].filter((o: object) => {
    const id = (o as { id: string }).id
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })

  return NextResponse.json(merged)
}
