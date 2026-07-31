import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type GeocodeBody = {
  query?: string
  houseNumber?: string
  streetAddress?: string
  landmark?: string
  pincode?: string
  lat?: number
  lng?: number
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
  placeId?: string
  postalCode?: string
  provider: 'google' | 'openstreetmap'
  confidence: 'high' | 'medium' | 'low'
  pincodeMatched?: boolean
}

const GOOGLE_GEOCODE_KEY =
  process.env.GOOGLE_GEOCODING_API_KEY ||
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

function scoreGoogleLabel(label: string, body: GeocodeBody) {
  const normalized = label.toLowerCase()
  let score = 0

  for (const token of specificWords(body.query ?? '')) {
    if (normalized.includes(token)) score += 4
  }
  for (const token of specificWords(body.houseNumber ?? '')) {
    if (normalized.includes(token)) score += 4
  }
  for (const token of specificWords(body.streetAddress ?? '')) {
    if (normalized.includes(token)) score += 2.5
  }
  for (const token of specificWords(body.landmark ?? '')) {
    if (normalized.includes(token)) score += 3
  }
  if (body.pincode && normalized.includes(cleanPin(body.pincode))) score += 3
  if (normalized.includes('bengaluru') || normalized.includes('bangalore')) score += 1
  if (/^[a-z0-9]{4}\+[a-z0-9]{2,}/i.test(label.trim())) score -= 5

  return score
}

async function tryGooglePlacesSearch(queries: string[], body: GeocodeBody): Promise<GeocodeMatch | null> {
  if (!GOOGLE_GEOCODE_KEY) return null

  let bestMatch: (GeocodeMatch & { score: number }) | null = null
  const searchQueries = uniq([
    compact([body.query, 'Bengaluru']).join(', '),
    compact([body.houseNumber, body.streetAddress, body.landmark, 'Bengaluru']).join(', '),
    ...queries,
  ]).slice(0, 3)

  for (const query of searchQueries) {
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_GEOCODE_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.postalAddress,places.types',
        },
        body: JSON.stringify({
          textQuery: query,
          languageCode: 'en',
          regionCode: 'IN',
          maxResultCount: 5,
          locationBias: {
            rectangle: {
              low: { latitude: BENGALURU_BOUNDS.south, longitude: BENGALURU_BOUNDS.west },
              high: { latitude: BENGALURU_BOUNDS.north, longitude: BENGALURU_BOUNDS.east },
            },
          },
        }),
        signal: AbortSignal.timeout(8_000),
      })
      if (!res.ok) continue

      const data = await res.json() as {
        places?: Array<{
          id?: string
          displayName?: { text?: string }
          formattedAddress?: string
          location?: { latitude?: number; longitude?: number }
          postalAddress?: { postalCode?: string }
          types?: string[]
        }>
      }
      for (const place of data.places ?? []) {
        const lat = place.location?.latitude
        const lng = place.location?.longitude
        if (typeof lat !== 'number' || typeof lng !== 'number') continue
        if (
          lat < BENGALURU_BOUNDS.south || lat > BENGALURU_BOUNDS.north ||
          lng < BENGALURU_BOUNDS.west || lng > BENGALURU_BOUNDS.east
        ) continue

        const displayName = compact([place.displayName?.text, place.formattedAddress]).join(', ')
        const postalCode = cleanPin(place.postalAddress?.postalCode)
        if (!resultMatchesPincode(body.pincode, postalCode, displayName)) continue

        let score = scoreGoogleLabel(displayName, body)
        if (place.types?.some(type => ['premise', 'establishment', 'point_of_interest'].includes(type))) {
          score += 2
        }
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = {
            lat,
            lng,
            query,
            displayName,
            placeId: place.id ?? '',
            postalCode,
            provider: 'google',
            confidence: score >= 8 ? 'high' : 'medium',
            pincodeMatched: true,
            score,
          }
        }
      }

      if (bestMatch && bestMatch.score >= 10) break
    } catch {
      // Fall back to the Geocoding API below.
    }
  }

  if (!bestMatch) return null
  const { score: _score, ...match } = bestMatch
  return match
}

async function tryGoogleGeocode(queries: string[], body: GeocodeBody): Promise<GeocodeMatch | null> {
  if (!GOOGLE_GEOCODE_KEY) return null

  let bestMatch: (GeocodeMatch & { score: number }) | null = null

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
          place_id?: string
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
        let score = scoreGoogleLabel(formattedAddress, body)
        if (locationType === 'ROOFTOP') score += 3
        else if (locationType === 'RANGE_INTERPOLATED') score += 2
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = {
            lat: point.lat,
            lng: point.lng,
            query,
            displayName: formattedAddress,
            placeId: candidate.place_id ?? '',
            postalCode: postalCode?.long_name ?? postalCode?.short_name ?? '',
            provider: 'google',
            confidence: score >= 8 ? 'high' : 'medium',
            pincodeMatched,
            score,
          }
        }
      }
      if (bestMatch && bestMatch.score >= 10) break
    } catch {
      // Try the next query candidate.
    }
  }

  if (!bestMatch) return null
  const { score: _score, ...match } = bestMatch
  return match
}

type GoogleAddressComponent = {
  long_name?: string
  short_name?: string
  types?: string[]
}

function googleComponent(
  components: GoogleAddressComponent[] | undefined,
  ...types: string[]
) {
  return components?.find(component =>
    types.some(type => component.types?.includes(type))
  )?.long_name ?? ''
}

async function tryGoogleReverseGeocode(lat: number, lng: number) {
  if (!GOOGLE_GEOCODE_KEY) return null

  const url =
    'https://maps.googleapis.com/maps/api/geocode/json?' +
    new URLSearchParams({
      latlng: `${lat},${lng}`,
      language: 'en',
      region: 'in',
      key: GOOGLE_GEOCODE_KEY,
    }).toString()

  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) })
  if (!res.ok) return null

  const data = await res.json() as {
    status?: string
    error_message?: string
    results?: Array<{
      place_id?: string
      formatted_address?: string
      types?: string[]
      address_components?: GoogleAddressComponent[]
      geometry?: { location_type?: string }
    }>
  }
  if (data.status !== 'OK' || !data.results?.length) return null

  const preferredTypes = ['street_address', 'premise', 'subpremise', 'establishment', 'point_of_interest']
  const result = data.results.find(candidate =>
    preferredTypes.some(type => candidate.types?.includes(type))
  ) ?? data.results[0]
  const components = result.address_components

  const streetNumber = googleComponent(components, 'street_number')
  const route = googleComponent(components, 'route')
  const premise = googleComponent(components, 'premise', 'establishment', 'point_of_interest')
  const sublocality = googleComponent(
    components,
    'sublocality_level_1',
    'sublocality',
    'neighborhood',
  )
  const locality = googleComponent(components, 'locality', 'administrative_area_level_2')
  const postalCode = googleComponent(components, 'postal_code')
  const streetAddress = uniq([
    compact([streetNumber, route]).join(' '),
    premise,
    sublocality,
    locality,
  ]).join(', ')

  return {
    lat,
    lng,
    displayName: result.formatted_address ?? streetAddress,
    streetAddress,
    postalCode,
    placeId: result.place_id ?? '',
    provider: 'google' as const,
    confidence: result.geometry?.location_type === 'ROOFTOP'
      ? 'high' as const
      : 'medium' as const,
  }
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
            postalCode: cleanPin(row.address?.postcode),
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

  const lat = Number(body.lat)
  const lng = Number(body.lng)
  if (Number.isFinite(lat) || Number.isFinite(lng)) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return NextResponse.json({ error: 'Valid latitude and longitude are required' }, { status: 400 })
    }
    if (!GOOGLE_GEOCODE_KEY) {
      return NextResponse.json({ error: 'Google reverse geocoding is not configured' }, { status: 503 })
    }
    try {
      const match = await tryGoogleReverseGeocode(lat, lng)
      if (match) return NextResponse.json(match)
      return NextResponse.json({ error: 'No Google address found for this pin' }, { status: 404 })
    } catch {
      return NextResponse.json({ error: 'Google reverse geocoding is temporarily unavailable' }, { status: 502 })
    }
  }

  const queries = buildQueries(body)
  if (queries.length === 0) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 })
  }

  const googlePlacesMatch = await tryGooglePlacesSearch(queries, body)
  if (googlePlacesMatch) return NextResponse.json(googlePlacesMatch)

  const googleMatch = await tryGoogleGeocode(queries, body)
  if (googleMatch) return NextResponse.json(googleMatch)

  const osmMatch = await tryOpenStreetMapGeocode(queries, body)
  if (osmMatch) return NextResponse.json(osmMatch)

  return NextResponse.json({ error: 'Address not found', queries }, { status: 404 })
}
