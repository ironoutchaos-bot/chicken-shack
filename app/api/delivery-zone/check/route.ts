export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { checkDeliveryZone } from '@/lib/delivery-zone'

export async function POST(req: NextRequest) {
  let body: { lat?: unknown; lng?: unknown; pincode?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = checkDeliveryZone(body.lat, body.lng, body.pincode)
  if (!result) {
    return NextResponse.json({ error: 'Valid latitude and longitude are required' }, { status: 400 })
  }

  return NextResponse.json(result)
}
