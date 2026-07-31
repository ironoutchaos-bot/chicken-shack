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

const CONFIRMED_PAYMENT_FILTER = 'payment_status=in.(cod,paid)'

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
  const [assignedRes, unassignedRes, productsRes, unitsRes] = await Promise.all([
    fetch(
      `${SUPA_URL()}/rest/v1/orders?driver_id=eq.${encodeURIComponent(driverId)}&${CONFIRMED_PAYMENT_FILTER}&order=created_at.desc&select=*`,
      { headers: srvHeaders() }
    ),
    fetch(
      `${SUPA_URL()}/rest/v1/orders?driver_id=is.null&order_status=not.in.(delivered,cancelled)&${CONFIRMED_PAYMENT_FILTER}&order=created_at.desc&select=*`,
      { headers: srvHeaders() }
    ),
    fetch(
      `${SUPA_URL()}/rest/v1/products?select=id,weight_per_unit`,
      { headers: srvHeaders() }
    ),
    fetch(
      `${SUPA_URL()}/rest/v1/settings?key=eq.product_units&select=value&limit=1`,
      { headers: srvHeaders() }
    ),
  ])

  if (!assignedRes.ok || !unassignedRes.ok) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const assigned:   object[] = await assignedRes.json().catch(() => [])
  const unassigned: object[] = await unassignedRes.json().catch(() => [])
  const products = productsRes.ok
    ? await productsRes.json().catch(() => []) as Array<{ id?: string; weight_per_unit?: number | null }>
    : []
  const unitRows = unitsRes.ok
    ? await unitsRes.json().catch(() => []) as Array<{ value?: Record<string, string> }>
    : []
  const productWeights = new Map(
    products
      .filter(product => typeof product.id === 'string')
      .map(product => [product.id as string, product.weight_per_unit ?? null])
  )
  const productUnits = unitRows[0]?.value && typeof unitRows[0].value === 'object'
    ? unitRows[0].value
    : {}

  // Merge, deduplicate by id, keep assigned first (they may overlap after trigger fires)
  const seen   = new Set<string>()
  const merged = [...assigned, ...unassigned].filter((o: object) => {
    const id = (o as { id: string }).id
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })

  const enriched = merged.map(rawOrder => {
    const order = rawOrder as {
      delivery_address?: Record<string, unknown> | null
      items?: Array<Record<string, unknown>>
    }
    const address = order.delivery_address
    const lat = typeof address?.lat === 'number' ? address.lat : Number(address?.lat)
    const lng = typeof address?.lng === 'number' ? address.lng : Number(address?.lng)
    const hasExactPin = Number.isFinite(lat)
      && lat >= -90
      && lat <= 90
      && Number.isFinite(lng)
      && lng >= -180
      && lng <= 180

    return {
      ...order,
      delivery_address: address && hasExactPin
        ? {
            ...address,
            lat,
            lng,
            mapsUrl: `https://maps.google.com/?q=${lat},${lng}`,
          }
        : address,
      items: Array.isArray(order.items)
        ? order.items.map(item => {
            const productId = typeof item.productId === 'string' ? item.productId : ''
            const savedWeight = Number(item.weightPerUnit)
            return {
              ...item,
              weightPerUnit: Number.isFinite(savedWeight) && savedWeight > 0
                ? savedWeight
                : productWeights.get(productId) ?? null,
              unit: typeof item.unit === 'string'
                ? item.unit
                : productUnits[productId] ?? 'g',
            }
          })
        : [],
    }
  })

  return NextResponse.json(enriched)
}
