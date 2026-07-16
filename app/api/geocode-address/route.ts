import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type GeocodeBody = {
  query?: string
  houseNumber?: string
  streetAddress?: string
  landmark?: string
  pincode?: string
}

type NominatimResult = {
  lat: string
  lon: string
  display_name?: string
  importance?: number
  address?: {
    postcode?: string
  }
}

type GeocodeMatch = {
  lat: number
  lng: number
  query: string
  displayName: string
  provider: 'google' | 'openstreetmap'
  confidence: 'high' | 'medium' | 'low'
  pincodeMatched?: boolean
}

const GOOGLE_GEOCODE_KEY =
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ||
  ''

const BENGALURU_BOUNDS = {
  south: 12.80,
  west: 77.38,
  north: 13.18,
  east: 77.84,
}

function uniq(values: string[]) {
  return Array.from(new Set(values.map(v => v.trim()).filter(Boolean)))
}

function compact(parts: Array<string | undefined | null>) {
  return parts.map(p => p?.trim()).filter(Boolean) as string[]
}

function words(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3)
}

function specificWords(value: string) {
  const generic = new Set([
    'road',
    'rd',
    'street',
    'st',
    'main',
    'cross',
    'layout',
    'area',
    'phase',
    'near',
    'floor',
    'flat',
    'house',
    'no',
    'bengaluru',
    'bangalore',
    'karnataka',
    'india',
  ])
  return words(value).filter(w => !generic.has(w) && !/^\d+$/.test(w))
}

function cleanPin(value: string | undefined) {
  return value?.replace(/\D/g, '').slice(0, 6) ?? ''
}

function resultMatchesPincode(bodyPin: string | undefined, resultPin: string | undefined, label: string | undefined) {
  const pin = cleanPin(bodyPin)
  if (!pin) return true
  return cleanPin(resultPin) === pin || Boolean(label?.includes(pin))
}

function buildQueries(body: GeocodeBody) {
  const manualQuery = body.query?.trim() ?? ''
  const house = body.houseNumber?.trim() ?? ''
  const street = body.streetAddress?.trim() ?? ''
  const landmark = body.landmark?.trim() ?? ''
  const pin = body.pincode?.trim() ?? ''
  const streetParts = street.split(',').map(p => p.trim()).filter(Boolean)
  const locality = streetParts.at(-1) ?? street
  const firstStreetPart = streetParts.at(0) ?? street
  const city = 'Bengaluru'
  const cityAlias = 'Bangalore'
  const state = 'Karnataka'
  const country = 'India'

  return uniq([
    compact([manualQuery, pin, city, state, country]).join(', '),
    compact([house, street, landmark, pin, city, state, country]).join(', '),
    compact([house, street, pin, city, state, country]).join(', '),
    compact([house, firstStreetPart, locality, pin, city, state, country]).join(', '),
    compact([house, street, landmark, cityAlias, state, country]).join(', '),
    compact([landmark, street, pin, city, state, country]).join(', '),
    compact([street, landmark, pin, city, state, country]).join(', '),
    compact([street, pin, city, state, country]).join(', '),
    compact([locality, pin, city, state, country]).join(', '),
    compact([street, city, state, country]).join(', '),
    compact([locality, city, state, country]).join(', '),
    compact([landmark, street, city, state, country]).join(', '),
    compact([pin, city, state, country]).join(', '),
  ])
}

function scoreOsmResult(result: NominatimResult, body: GeocodeBody) {
  const label = result.display_name?.toLowerCase() ?? ''
  const queryTokens = words([
    body.query,
    body.houseNumber,
    body.streetAddress,
    body.landmark,
    body.pincode,
  ].filter(Boolean).join(' '))
  let score = result.importance ?? 0

  for (const token of queryTokens) {
    if (label.includes(token)) score += 0.4
  }
  for (const token of specificWords(body.houseNumber ?? '')) {
    if (label.includes(token)) score += 4
  }
  for (const token of specificWords(body.streetAddress ?? '')) {
    if (label.includes(token)) score += 3
  }
  for (const token of specificWords(body.landmark ?? '')) {
    if (label.includes(token)) score += 3
  }
  for (const token of specificWords(body.query ?? '')) {
    if (label.includes(token)) score += 2
  }
  if (body.pincode && label.includes(body.pincode)) score += 0.75
  if (label.includes('bengaluru') || label.includes('bangalore')) score += 1.5
  if (label.includes('karnataka')) score += 0.75

  const lat = Number(result.lat)
  const lng = Number(result.lon)
  if (
    lat >= BENGALURU_BOUNDS.south &&
    lat <= BENGALURU_BOUNDS.north &&
    lng >= BENGALURU_BOUNDS.west &&
    lng <= BENGALURU_BOUNDS.east
  ) {
    score += 1
  }

  return score
}

async function tryGoogleGeocode(queries: string[]): Promise<GeocodeMatch | null> {
  if (!GOOGLE_GEOCODE_KEY) return null

  for (const query of queries) {
    try {
      const url =
        'https://maps.googleapis.com/maps/api/geocode/json?' +
        new URLSearchParams({
          address: query,
          bounds: `${BENGALURU_BOUNDS.south},${BENGALURU_BOUNDS.west}|${BENGALURU_BOUNDS.north},${BENGALURU_BOUNDS.east}`,
          region: 'in',
          key: GOOGLE_GEOCODE_KEY,
        }).toString()

      const res = await fetch(url, { signal: AbortSignal.timeout(8_000) })
      if (!res.ok) continue
      const data = await res.json() as {
        status?: string
        results?: Array<{
          formatted_address?: string
          address_components?: Array<{
            long_name?: string
            short_name?: string
            types?: string[]
          }>
          geometry?: {
            location?: { lat?: number; lng?: number }
            location_type?: string
          }
        }>
      }
      for (const candidate of data.results ?? []) {
        const point = candidate.geometry?.location
        if (!point || typeof point.lat !== 'number' || typeof point.lng !== 'number') continue
        const postalCode = candidate.address_components?.find(c => c.types?.includes('postal_code'))
        const formattedAddress = candidate.formatted_address ?? ''
        const pincodeMatched = resultMatchesPincode(
          query.match(/\b\d{6}\b/)?.[0],
          postalCode?.long_name ?? postalCode?.short_name,
          formattedAddress
        )
        if (!pincodeMatched) continue

        const locationType = candidate.geometry?.location_type
        return {
          lat: point.lat,
          lng: point.lng,
          query,
          displayName: formattedAddress,
          provider: 'google',
          confidence: locationType === 'ROOFTOP' || locationType === 'RANGE_INTERPOLATED' ? 'high' : 'medium',
          pincodeMatched,
        }
      }
    } catch {
      // Try the next query candidate.
    }
  }

  return null
}

async function tryOpenStreetMapGeocode(queries: string[], body: GeocodeBody): Promise<GeocodeMatch | null> {
  let bestMatch: (GeocodeMatch & { score: number }) | null = null

  for (const query of queries) {
    try {
      const url =
        'https://nominatim.openstreetmap.org/search?' +
        new URLSearchParams({
          format: 'json',
          limit: '5',
          countrycodes: 'in',
          addressdetails: '1',
          viewbox: `${BENGALURU_BOUNDS.west},${BENGALURU_BOUNDS.north},${BENGALURU_BOUNDS.east},${BENGALURU_BOUNDS.south}`,
          bounded: '1',
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
      for (const row of Array.isArray(rows) ? rows : []) {
        const lat = Number(row.lat)
        const lng = Number(row.lon)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
        if (!resultMatchesPincode(body.pincode, row.address?.postcode, row.display_name)) continue

        const score = scoreOsmResult(row, body)
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = {
            lat,
            lng,
            query,
            displayName: row.display_name ?? '',
            provider: 'openstreetmap',
            confidence: score >= 6 ? 'medium' : 'low',
            pincodeMatched: true,
            score,
          }
        }
      }

      if (bestMatch && bestMatch.score >= 7) break
    } catch {
      // Try the next query candidate.
    }
  }

  if (!bestMatch) return null
  const { score: _score, ...match } = bestMatch
  return match
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

  const googleMatch = await tryGoogleGeocode(queries)
  if (googleMatch) return NextResponse.json(googleMatch)

  const osmMatch = await tryOpenStreetMapGeocode(queries, body)
  if (osmMatch) return NextResponse.json(osmMatch)

  return NextResponse.json({ error: 'Address not found', queries }, { status: 404 })
}
