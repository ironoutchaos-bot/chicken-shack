export const DELIVERY_ZONE_CENTER = {
  lat: 13.088687,
  lng: 77.629187,
} as const

export const DELIVERY_ZONE_RADIUS_KM = 6
export const ALLOWED_DELIVERY_PINCODES = ['560064', '560077', '560092'] as const

export type DeliveryZoneResult = {
  deliverable: boolean
  distanceKm: number
  radiusKm: number
  center: typeof DELIVERY_ZONE_CENTER
  pincodeAllowed?: boolean
  allowedPincodes?: readonly string[]
}

function toFiniteNumber(value: unknown) {
  if (value === null || value === undefined || typeof value === 'boolean') return null
  if (typeof value === 'string' && value.trim() === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function normalizePincode(value: unknown) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 6)
}

export function isAllowedDeliveryPincode(value: unknown) {
  const pin = normalizePincode(value)
  return ALLOWED_DELIVERY_PINCODES.includes(pin as typeof ALLOWED_DELIVERY_PINCODES[number])
}

export function distanceBetweenKm(latA: number, lngA: number, latB: number, lngB: number) {
  const earthRadiusKm = 6371
  const toRad = (degrees: number) => degrees * Math.PI / 180
  const dLat = toRad(latB - latA)
  const dLng = toRad(lngB - lngA)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLng / 2) ** 2
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function checkDeliveryZone(lat: unknown, lng: unknown, pincode?: unknown): DeliveryZoneResult | null {
  const latitude = toFiniteNumber(lat)
  const longitude = toFiniteNumber(lng)
  if (
    latitude === null || longitude === null ||
    latitude < -90 || latitude > 90 ||
    longitude < -180 || longitude > 180
  ) return null

  const distanceKm = distanceBetweenKm(
    DELIVERY_ZONE_CENTER.lat,
    DELIVERY_ZONE_CENTER.lng,
    latitude,
    longitude
  )

  const hasPincode = pincode !== undefined
  const pincodeAllowed = hasPincode ? isAllowedDeliveryPincode(pincode) : undefined
  const radiusAllowed = distanceKm <= DELIVERY_ZONE_RADIUS_KM

  return {
    deliverable: radiusAllowed && (pincodeAllowed ?? true),
    distanceKm: Number(distanceKm.toFixed(3)),
    radiusKm: DELIVERY_ZONE_RADIUS_KM,
    center: DELIVERY_ZONE_CENTER,
    ...(hasPincode ? { pincodeAllowed, allowedPincodes: ALLOWED_DELIVERY_PINCODES } : {}),
  }
}
