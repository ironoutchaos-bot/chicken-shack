import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type GeocodeBody = {
  houseNumber?: string
  streetAddress?: string
  landmark?: string
  pincode?: string
}

type NominatimResult = {
  lat: string
  lon: string
  display_name?: string
}

function uniq(values: string[]) {
  return Array.from(new Set(values.map(v => v.trim()).filter(Boolean)))
}

function compact(parts: Array<string | undefined | null>) {
  return parts.map(p => p?.trim()).filter(Boolean) as string[]
}

function buildQueries(body: GeocodeBody) {
  const house = body.houseNumber?.trim() ?? ''
  const street = body.streetAddress?.trim() ?? ''
  const landmark = body.landmark?.trim() ?? ''
  const pin = body.pincode?.trim() ?? ''
  const streetParts = street.split(',').map(p => p.trim()).filter(Boolean)
  const locality = streetParts.at(-1) ?? street
  const city = 'Bengaluru'
  const state = 'Karnataka'
  const country = 'India'

  return uniq([
    compact([street, landmark, pin, city, state, country]).join(', '),
    compact([street, pin, city, state, country]).join(', '),
    compact([locality, pin, city, state, country]).join(', '),
    compact([street, city, state, country]).join(', '),
    compact([locality, city, state, country]).join(', '),
    compact([landmark, street, city, state, country]).join(', '),
    compact([house, street, city, state, country]).join(', '),
    compact([pin, city, state, country]).join(', '),
  ])
}

export async function POST(req: NextRequest) {
  let body: GeocodeBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const queries = buildQueries(body)
  if (queries.length === 0) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 })
  }

  for (const query of queries) {
    try {
      const url =
        'https://nominatim.openstreetmap.org/search?' +
        new URLSearchParams({
          format: 'json',
          limit: '1',
          countrycodes: 'in',
          addressdetails: '1',
          q: query,
        }).toString()

      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'Blurufresh/1.0 (https://www.blurufresh.com)',
        },
        signal: AbortSignal.timeout(8_000),
      })
      if (!res.ok) continue

      const rows = await res.json() as NominatimResult[]
      const best = Array.isArray(rows) ? rows[0] : null
      if (!best) continue

      return NextResponse.json({
        lat: Number(best.lat),
        lng: Number(best.lon),
        query,
        displayName: best.display_name ?? '',
      })
    } catch {
      // Try the next query candidate.
    }
  }

  return NextResponse.json({ error: 'Address not found', queries }, { status: 404 })
}
