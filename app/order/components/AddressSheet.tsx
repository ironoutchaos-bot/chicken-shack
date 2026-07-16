'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, MapPin, Loader2, Home, Building2, CheckCircle2, AlertTriangle, XCircle, Phone, User, Crosshair } from 'lucide-react'
import { Input } from '@heroui/react'
import AddressMapPicker from './AddressMapPicker'

export interface DeliveryAddress {
  customerName:  string
  houseNumber:   string
  streetAddress: string
  landmark:      string
  pincode:       string
  lat:           number
  lng:           number
  mapsUrl:       string
  customerPhone: string
  deliveryDistanceKm?: number
  deliveryRadiusKm?:   number
  deliveryZoneCenter?: { lat: number; lng: number }
}

type DeliveryZoneResult = {
  deliverable: boolean
  distanceKm:  number
  radiusKm:    number
  center:      { lat: number; lng: number }
  pincodeAllowed?: boolean
  allowedPincodes?: readonly string[]
}

interface Props {
  open:          boolean
  onClose:       () => void
  onConfirm:     (address: DeliveryAddress) => void
  savedPincode?: string
}

const STORAGE_KEY = 'bf-delivery-address-v2'
const ALLOWED_PINCODES = ['560064', '560077', '560092']

function cleanPincode(value: string) {
  return value.replace(/\D/g, '').slice(0, 6)
}

function isAllowedPincode(value: string) {
  return ALLOWED_PINCODES.includes(cleanPincode(value))
}

// ─── Reusable styled field wrapper ────────────────────────────────────────────
function Field({
  label, required, hint, error, children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-[11px] font-black text-stone-500 uppercase tracking-[0.1em]">
        {label}
        {required && <span className="text-red-400 normal-case font-bold">*</span>}
      </label>
      {children}
      {error  && <p className="text-[11px] text-red-500 font-medium pl-1">{error}</p>}
      {!error && hint && <p className="text-[10px] text-stone-400 pl-1">{hint}</p>}
    </div>
  )
}

export default function AddressSheet({ open, onClose, onConfirm, savedPincode }: Props) {
  const [customerName,  setCustomerName]  = useState('')
  const [houseNumber,   setHouseNumber]   = useState('')
  const [streetAddress, setStreetAddress] = useState('')
  const [landmark,      setLandmark]      = useState('')
  const [pincode,       setPincode]       = useState(savedPincode ?? '')
  const [customerPhone, setCustomerPhone] = useState('')
  const [lat,           setLat]           = useState<number | null>(null)
  const [lng,           setLng]           = useState<number | null>(null)
  const [locating,      setLocating]      = useState(false)
  const [locError,      setLocError]      = useState('')
  const [locDenied,     setLocDenied]     = useState(false)
  const [pincodeError,  setPincodeError]  = useState('')
  const [validating,    setValidating]    = useState(false)
  const [resolvingMap,  setResolvingMap]  = useState(false)
  const [mapOpen,       setMapOpen]       = useState(false)
  const [step,          setStep]          = useState<'details' | 'map'>('details')
  const [pinTouched,    setPinTouched]    = useState(false)
  const [mapHint,       setMapHint]       = useState('')
  const [mapSearch,     setMapSearch]     = useState('')
  const [mapSearching,  setMapSearching]  = useState(false)
  const [zoneChecking,  setZoneChecking]  = useState(false)
  const [zoneResult,    setZoneResult]    = useState<DeliveryZoneResult | null>(null)

  useEffect(() => {
    if (!open) return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const addr: Partial<DeliveryAddress> = JSON.parse(saved)
        setCustomerName(addr.customerName  ?? '')
        setHouseNumber(addr.houseNumber    ?? '')
        setStreetAddress(addr.streetAddress ?? '')
        setLandmark(addr.landmark          ?? '')
        setPincode(addr.pincode            ?? savedPincode ?? '')
        setCustomerPhone(addr.customerPhone ?? '')
        setLat(typeof addr.lat === 'number' ? addr.lat : null)
        setLng(typeof addr.lng === 'number' ? addr.lng : null)
        setMapOpen(typeof addr.lat === 'number' && typeof addr.lng === 'number')
        setPinTouched(typeof addr.lat === 'number' && typeof addr.lng === 'number')
        setZoneResult(null)
        setMapSearch([addr.houseNumber, addr.streetAddress, addr.landmark, addr.pincode].filter(Boolean).join(', '))
      } else if (savedPincode) {
        setPincode(savedPincode)
        setLat(null)
        setLng(null)
        setMapOpen(false)
        setPinTouched(false)
        setZoneResult(null)
      } else {
        setLat(null)
        setLng(null)
        setMapOpen(false)
        setPinTouched(false)
        setZoneResult(null)
      }
    } catch {}
    setStep('details')
    setMapHint('')
    setPincodeError('')
    setLocError('')       // always clear previous error on open
    setLocDenied(false)   // always clear denied state on open
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const checkDeliveryZoneForPin = useCallback(async (nextLat: number, nextLng: number) => {
    setZoneChecking(true)
    try {
      const res = await fetch('/api/delivery-zone/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: nextLat, lng: nextLng, pincode: cleanPincode(pincode) }),
      })
      const data = await res.json().catch(() => null) as DeliveryZoneResult | null
      if (!res.ok || !data) throw new Error('zone check failed')

      setZoneResult(data)
      if (data.pincodeAllowed === false) {
        setMapHint(`Delivery is available only for ${ALLOWED_PINCODES.join(', ')}.`)
      } else if (data.deliverable) {
        setMapHint(`Delivery available. This pin is ${data.distanceKm.toFixed(1)} km from our store.`)
      } else {
        setMapHint(`Delivery not available in your area. This pin is ${data.distanceKm.toFixed(1)} km away; our delivery radius is ${data.radiusKm.toFixed(1)} km.`)
      }
      return data
    } catch {
      setZoneResult(null)
      setMapHint('Could not check the delivery radius. Please try moving the map pin again.')
      return null
    } finally {
      setZoneChecking(false)
    }
  }, [pincode])

  async function openExactPinMap() {
    const cleanPin = pincode.trim()
    setPincodeError('')
    setLocError('')
    setMapHint('')

    if (!nameValid || !phoneValid || !houseNumber.trim() || !streetAddress.trim()) {
      setLocError('Enter name, phone, house/flat, and street/area before placing the delivery pin.')
      return
    }
    if (cleanPin.length !== 6) {
      setPincodeError('Enter a valid 6-digit pincode.')
      return
    }
    if (!isAllowedPincode(cleanPin)) {
      setPincodeError(`Sorry, we deliver only to ${ALLOWED_PINCODES.join(', ')} right now.`)
      return
    }

    setResolvingMap(true)
    setLocDenied(false)
    const searchText = [houseNumber, streetAddress, landmark, cleanPin].map(v => v.trim()).filter(Boolean).join(', ')
    setMapSearch(searchText)
    try {
      const r = await fetch('/api/geocode-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          houseNumber: houseNumber.trim(),
          streetAddress: streetAddress.trim(),
          landmark: landmark.trim(),
          pincode: cleanPin,
        }),
      })
      const best = await r.json().catch(() => null) as { lat?: number; lng?: number; provider?: string; confidence?: string; displayName?: string } | null
      const found = r.ok && typeof best?.lat === 'number' && typeof best?.lng === 'number'
      if (!found) {
        setLocError('Could not match this exact address in the selected pincode. Add apartment name, road, or nearby landmark, then continue again.')
        setMapOpen(false)
        setStep('details')
        setPinTouched(false)
        setZoneResult(null)
        return
      }

      const nextLat = best.lat!
      const nextLng = best.lng!
      setLat(nextLat)
      setLng(nextLng)
      setMapOpen(true)
      setStep('map')
      setPinTouched(false)
      setZoneResult(null)
      const source = best.provider === 'google' ? 'Google Maps' : 'map search'
      setMapHint(
        best.confidence === 'high'
          ? `Found this address from ${source}. Confirm the fixed pin is on the exact gate or building entrance.`
          : `Found the closest match from ${source}. Move the map only if the pin is not on the exact gate.`
      )
    } catch {
      setLocError('Could not detect this address on the map. Add apartment name, road, or a nearby landmark, then continue again.')
      setMapOpen(false)
      setStep('details')
      setPinTouched(false)
      setZoneResult(null)
    } finally {
      setResolvingMap(false)
    }
  }

  async function searchMapAddress() {
    const cleanPin = pincode.trim()
    const cleanSearch = mapSearch.trim()
    if (!cleanSearch) {
      setMapHint('Type a building, road, or landmark to search on the map.')
      return
    }
    if (!isAllowedPincode(cleanPin)) {
      setMapHint(`Delivery is available only for ${ALLOWED_PINCODES.join(', ')}.`)
      return
    }

    setMapSearching(true)
    setMapHint('')
    try {
      const r = await fetch('/api/geocode-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: cleanSearch,
          houseNumber: houseNumber.trim(),
          streetAddress: streetAddress.trim(),
          landmark: landmark.trim(),
          pincode: cleanPin,
        }),
      })
      const best = await r.json().catch(() => null) as { lat?: number; lng?: number; provider?: string; confidence?: string } | null
      const found = r.ok && typeof best?.lat === 'number' && typeof best?.lng === 'number'
      if (!found) {
        setMapHint('Could not match that place in this pincode. Try the apartment, road, shop, or nearby landmark name.')
        return
      }

      setLat(best.lat!)
      setLng(best.lng!)
      setPinTouched(false)
      setZoneResult(null)
      const source = best.provider === 'google' ? 'Google Maps' : 'map search'
      setMapHint(
        best.confidence === 'high'
          ? `Found an exact-looking match from ${source}. Check the fixed pin before payment.`
          : `Found the nearest match from ${source}. Move the map if the pin is not on the exact gate.`
      )
    } catch {
      setMapHint('Could not search the map right now. Please move the map manually to the exact delivery point.')
    } finally {
      setMapSearching(false)
    }
  }

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocError('Geolocation not supported on this device.')
      return
    }
    setLocating(true)
    setLocError('')
    setLocDenied(false)
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 12_000, enableHighAccuracy: true })
      )
      const { latitude, longitude } = pos.coords
      setLat(latitude)
      setLng(longitude)
      setMapOpen(true)
      setStep('map')
      setPinTouched(true)
      await checkDeliveryZoneForPin(latitude, longitude)

      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          { headers: { 'Accept-Language': 'en' }, signal: AbortSignal.timeout(8_000) }
        )
        const data = await r.json()
        const addr = data.address ?? {}
        const road   = addr.road ?? addr.pedestrian ?? addr.neighbourhood ?? addr.hamlet ?? ''
        const area   = addr.suburb ?? addr.quarter ?? addr.city_district ?? addr.village ?? ''
        const street = [road, area].filter(Boolean).join(', ')
        if (!streetAddress.trim()) setStreetAddress(street)
        if (!pincode.trim() && addr.postcode) setPincode(addr.postcode)
      } catch {
        // Reverse geocode is optional; the map pin is already set.
      }
    } catch (err: unknown) {
      const geoErr = err as GeolocationPositionError
      if (geoErr?.code === 1) {
        setLocDenied(true)
        setLocError('Location access was denied. You can still find the delivery address from the typed address.')
      } else {
        setLocError('Could not detect current location. Please use the typed address search.')
      }
    } finally {
      setLocating(false)
    }
  }

  const hasLocation = lat !== null && lng !== null
  const phoneValid  = customerPhone.replace(/\D/g, '').length >= 10
  const nameValid   = customerName.trim().length >= 2
  const pinValid    = pincode.trim().length === 6 && isAllowedPincode(pincode)
  const detailsValid = nameValid && houseNumber.trim().length > 0 && streetAddress.trim().length > 0 && phoneValid && pinValid
  const canProceed  = detailsValid && hasLocation && pinTouched && zoneResult?.deliverable === true && !zoneChecking

  function scrollIntoView(e: React.FocusEvent<HTMLInputElement>) {
    setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350)
  }

  const handleConfirm = useCallback(async () => {
    if (!canProceed) return
    setPincodeError('')
    const cleanPin = pincode.trim()

    if (cleanPin.length !== 6) {
      setPincodeError('Enter a valid 6-digit pincode.')
      return
    }
    if (!isAllowedPincode(cleanPin)) {
      setPincodeError(`Sorry, we deliver only to ${ALLOWED_PINCODES.join(', ')} right now.`)
      setStep('details')
      return
    }

    if (!pinTouched || lat === null || lng === null) {
      setMapHint('Move the map until the fixed pin is on the exact delivery location before payment.')
      setStep('map')
      return
    }

    setValidating(true)
    const zone = await checkDeliveryZoneForPin(lat, lng)
    setValidating(false)
    if (!zone?.deliverable) {
      setStep('map')
      return
    }

    const addr: DeliveryAddress = {
      customerName:  customerName.trim(),
      houseNumber:   houseNumber.trim(),
      streetAddress: streetAddress.trim(),
      landmark:      landmark.trim(),
      pincode:       cleanPin,
      lat:           lat!,
      lng:           lng!,
      mapsUrl:       `https://maps.google.com/?q=${lat},${lng}`,
      customerPhone: customerPhone.replace(/\D/g, ''),
      deliveryDistanceKm: zone.distanceKm,
      deliveryRadiusKm:   zone.radiusKm,
      deliveryZoneCenter: zone.center,
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        customerName:  addr.customerName,
        houseNumber:   addr.houseNumber,
        streetAddress: addr.streetAddress,
        landmark:      addr.landmark,
        pincode:       addr.pincode,
        lat:           addr.lat,
        lng:           addr.lng,
        customerPhone: addr.customerPhone,
        deliveryDistanceKm: addr.deliveryDistanceKm,
        deliveryRadiusKm:   addr.deliveryRadiusKm,
        deliveryZoneCenter: addr.deliveryZoneCenter,
      }))
    } catch {}
    onConfirm(addr)
  }, [canProceed, customerName, pincode, houseNumber, streetAddress, landmark, lat, lng, customerPhone, onConfirm, pinTouched, checkDeliveryZoneForPin])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

      <div
        className="relative w-full max-w-[430px] bg-white rounded-t-[32px] shadow-2xl animate-slide-up max-h-[94vh] flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 1.5rem)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 shrink-0">
          <div className="w-10 h-1 bg-stone-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center shadow-sm">
              <MapPin size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-[17px] font-black text-stone-900 leading-tight">Delivery Address</h2>
              <p className="text-[11px] text-stone-400 mt-0.5">Where should we deliver?</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center active:scale-90 active:bg-stone-200 transition-all"
          >
            <X size={16} className="text-stone-500" strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 space-y-4 pb-2">
          {step === 'details' ? (
            <>
              {locError && !locDenied && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 leading-relaxed">{locError}</p>
              )}

          {/* ── Name ── */}
          <Field label="Your Name" required hint="So we know who to deliver to">
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none z-10" />
              <Input
                type="text"
                placeholder="e.g. Priya Sharma"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                onFocus={scrollIntoView}
                className="w-full pl-9 pr-4 py-3 rounded-2xl text-sm text-stone-900 outline-none bg-stone-50 border border-stone-200 focus:border-amber-400 transition-colors placeholder:text-stone-300"
              />
            </div>
          </Field>

          {/* ── House / Flat ── */}
          <Field label="House No / Flat / Floor" required hint="GPS won't overwrite this — entered only by you">
            <div className="relative">
              <Home size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none z-10" />
              <Input
                type="text"
                placeholder="#42, 3rd Floor, Sunrise Apts"
                value={houseNumber}
                onChange={e => setHouseNumber(e.target.value)}
                onFocus={scrollIntoView}
                className="w-full pl-9 pr-4 py-3 rounded-2xl text-sm text-stone-900 outline-none bg-stone-50 border border-stone-200 focus:border-amber-400 transition-colors placeholder:text-stone-300"
              />
            </div>
          </Field>

          {/* ── Mobile number ── */}
          <Field
            label="Mobile Number"
            required
            hint="Our delivery team will call you on this number"
            error={customerPhone.length > 0 && !phoneValid ? 'Enter a valid 10-digit number' : undefined}
          >
            <div className="relative">
              <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none z-10" />
              <Input
                type="tel" inputMode="numeric" maxLength={12} placeholder="9876543210"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value.replace(/[^\d+\-\s]/g, ''))}
                onFocus={scrollIntoView}
                className={`w-full pl-9 pr-4 py-3 rounded-2xl text-sm text-stone-900 outline-none bg-stone-50 border transition-colors placeholder:text-stone-300 ${
                  customerPhone.length > 0 && !phoneValid
                    ? 'border-red-400 focus:border-red-400'
                    : 'border-stone-200 focus:border-amber-400'
                }`}
              />
            </div>
          </Field>

          {/* ── Street / Area ── */}
          <Field label="Street / Area" hint="Type the delivery area's road, apartment, or locality">
            <div className="relative">
              <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none z-10" />
              <Input
                type="text"
                placeholder="Yelahanka New Town, 4th Phase"
                value={streetAddress}
                onChange={e => setStreetAddress(e.target.value)}
                onFocus={scrollIntoView}
                className="w-full pl-9 pr-4 py-3 rounded-2xl text-sm text-stone-900 outline-none bg-stone-50 border border-stone-200 focus:border-amber-400 transition-colors placeholder:text-stone-300"
              />
            </div>
          </Field>

          {/* ── Landmark ── */}
          <Field label="Landmark" hint="Optional — helps driver find you faster">
            <div className="relative">
              <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none z-10" />
              <Input
                type="text"
                placeholder="Near Decathlon, Yelahanka"
                value={landmark}
                onChange={e => setLandmark(e.target.value)}
                onFocus={scrollIntoView}
                className="w-full pl-9 pr-4 py-3 rounded-2xl text-sm text-stone-900 outline-none bg-stone-50 border border-stone-200 focus:border-amber-400 transition-colors placeholder:text-stone-300"
              />
            </div>
          </Field>

          {/* ── Pincode ── */}
          <Field label="Pincode" required hint={`We deliver only to ${ALLOWED_PINCODES.join(', ')}`} error={pincodeError || undefined}>
            <div className="relative">
              <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none z-10" />
              <Input
                type="text" inputMode="numeric" maxLength={6} placeholder="560064"
                value={pincode}
                onChange={e => { setPincode(cleanPincode(e.target.value)); setPincodeError('') }}
                onFocus={scrollIntoView}
                className={`w-full pl-9 pr-4 py-3 rounded-2xl text-sm text-stone-900 outline-none bg-stone-50 border transition-colors placeholder:text-stone-300 ${
                  pincodeError ? 'border-red-400' : 'border-stone-200 focus:border-amber-400'
                }`}
              />
            </div>
          </Field>

              <div className="h-1" />
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                <p className="text-xs font-black text-amber-900">Point the exact delivery location</p>
                <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                  {mapHint || 'Tap the map or move it until the fixed pin is on your gate, apartment entrance, or exact drop point.'}
                </p>
              </div>

              <button
                onClick={useCurrentLocation}
                disabled={locating}
                className="w-full flex items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-4 py-4 text-[15px] font-black text-white shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
                  {locating ? <Loader2 size={22} className="animate-spin" /> : <Crosshair size={22} strokeWidth={2.6} />}
                </span>
                <span className="flex min-w-0 flex-col items-start text-left leading-tight">
                  <span>{locating ? 'Detecting Your Location...' : 'Use My Current Location'}</span>
                  <span className="text-[11px] font-bold text-white/85">Best when you are at the delivery address</span>
                </span>
              </button>

              {locDenied && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-3">
                  <AlertTriangle size={17} className="text-red-500 shrink-0 mt-0.5" strokeWidth={2} />
                  <p className="text-[11px] text-red-600 leading-relaxed">
                    Location access was denied. You can still move the map manually to place the fixed pin.
                  </p>
                </div>
              )}

              {mapOpen && hasLocation && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black text-stone-500 uppercase tracking-[0.1em]">Exact Delivery Pin</p>
                    <span className="text-[10px] font-mono text-stone-400">{lat?.toFixed(5)}, {lng?.toFixed(5)}</span>
                  </div>
                  <div className="flex gap-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-sm">
                    <Input
                      type="text"
                      value={mapSearch}
                      onChange={e => setMapSearch(e.target.value)}
                      placeholder="Search building, road, or landmark"
                      className="min-w-0 flex-1 rounded-xl bg-stone-50 text-xs text-stone-900 outline-none"
                    />
                    <button
                      type="button"
                      onClick={searchMapAddress}
                      disabled={mapSearching}
                      className="shrink-0 rounded-xl bg-stone-900 px-3 text-[11px] font-black text-white active:scale-[0.98] disabled:opacity-50"
                    >
                      {mapSearching ? 'Finding' : 'Find'}
                    </button>
                  </div>
                  <AddressMapPicker
                    lat={lat!}
                    lng={lng!}
                    onChange={(nextLat, nextLng) => {
                      setLat(nextLat)
                      setLng(nextLng)
                      setPinTouched(true)
                      void checkDeliveryZoneForPin(nextLat, nextLng)
                    }}
                  />
                </div>
              )}

              <button
                onClick={() => setStep('details')}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-[11px] font-bold text-stone-600 active:scale-[0.98] transition-all"
              >
                Edit address details
              </button>

              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-3.5 py-3">
                <p className="text-[11px] font-black text-stone-500 uppercase tracking-[0.1em]">Delivery Address</p>
                <p className="text-xs font-bold text-stone-800 mt-1">{houseNumber}</p>
                <p className="text-xs text-stone-600">{[streetAddress, landmark, pincode].filter(Boolean).join(', ')}</p>
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="px-5 pt-3 pb-2 border-t border-stone-100 shrink-0 space-y-2.5">
          {step === 'map' && !pinTouched && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <MapPin size={13} className="text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 font-medium">Tap anywhere or move the map until the fixed pin is on the exact delivery point to continue</p>
            </div>
          )}
          {step === 'map' && pinTouched && zoneChecking && (
            <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5">
              <Loader2 size={13} className="text-stone-500 shrink-0 animate-spin" />
              <p className="text-xs text-stone-600 font-medium">Checking 5.5 km delivery radius...</p>
            </div>
          )}
          {step === 'map' && pinTouched && zoneResult && !zoneResult.deliverable && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3">
              <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <p className="text-xs font-bold text-red-700">Delivery not available here</p>
                <p className="text-[11px] text-red-600 mt-0.5 leading-relaxed">
                  {zoneResult.pincodeAllowed === false
                    ? `We deliver only to ${ALLOWED_PINCODES.join(', ')}.`
                    : `This pin is ${zoneResult.distanceKm.toFixed(1)} km away. Current delivery radius is ${zoneResult.radiusKm.toFixed(1)} km.`
                  }
                </p>
              </div>
            </div>
          )}
          {pincodeError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3">
              <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <p className="text-xs font-bold text-red-700">Area not in delivery zone</p>
                <p className="text-[11px] text-red-600 mt-0.5 leading-relaxed">{pincodeError}</p>
              </div>
            </div>
          )}

          {step === 'details' ? (
            <button
              onClick={openExactPinMap}
              disabled={validating || resolvingMap}
              className="w-full bg-stone-900 text-white rounded-2xl py-4 font-bold text-[15px] flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all disabled:opacity-40"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}
            >
              {validating || resolvingMap
                ? <><Loader2 size={17} className="animate-spin" />Opening map…</>
                : <><MapPin size={17} strokeWidth={2.2} />Continue to Exact Location</>
              }
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={!canProceed || validating}
              className="w-full bg-stone-900 text-white rounded-2xl py-4 font-bold text-[15px] flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all disabled:opacity-40"
              style={{ boxShadow: canProceed ? '0 4px 20px rgba(0,0,0,0.25)' : 'none' }}
            >
              {validating
                ? <><Loader2 size={17} className="animate-spin" />Checking area…</>
                : <><CheckCircle2 size={17} strokeWidth={2.2} />Confirm Pin &amp; Proceed to Pay</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
