'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, Building2, CheckCircle2, Crosshair, Home, Loader2, MapPin, Navigation, Phone, Search, User, X, XCircle } from 'lucide-react'
import AddressMapPicker from './AddressMapPicker'
import type { DeliveryAddress } from './AddressSheet'

type GeocodeResult = {
  lat: number
  lng: number
  displayName?: string
  streetAddress?: string
  postalCode?: string
  placeId?: string
  provider?: 'google' | 'openstreetmap'
}

type DeliveryZoneResult = {
  deliverable: boolean
  distanceKm: number
  radiusKm: number
  center: { lat: number; lng: number }
  pincodeAllowed?: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (address: DeliveryAddress) => void
  savedPincode?: string
}

const STORAGE_KEY = 'bf-delivery-address-v2'
const ALLOWED_PINCODES = ['560064', '560077', '560092']
const DELIVERY_CENTER = { lat: 13.088687, lng: 77.629187 }

function cleanPincode(value: string | undefined) {
  return (value ?? '').replace(/\D/g, '').slice(0, 6)
}

function isAllowedPincode(value: string | undefined) {
  return ALLOWED_PINCODES.includes(cleanPincode(value))
}

function Field({ label, required, hint, error, icon, children }: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.1em] text-stone-500">
        {label}{required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-stone-400">{icon}</span>
        {children}
      </div>
      {error ? <p className="pl-1 text-[11px] font-medium text-red-500">{error}</p> : hint ? <p className="pl-1 text-[10px] text-stone-400">{hint}</p> : null}
    </div>
  )
}

function Notice({ text, error = false, loading = false }: { text: string; error?: boolean; loading?: boolean }) {
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[11px] font-semibold leading-relaxed ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
      {loading ? <Loader2 size={14} className="mt-0.5 shrink-0 animate-spin" /> : error ? <AlertTriangle size={14} className="mt-0.5 shrink-0" /> : <MapPin size={14} className="mt-0.5 shrink-0" />}
      {text}
    </div>
  )
}

const fieldClass = 'h-[52px] w-full rounded-2xl border border-stone-200 bg-stone-50 pl-11 pr-4 text-[14px] font-semibold text-stone-950 outline-none placeholder:font-medium placeholder:text-stone-300 focus:border-purple-400 focus:bg-white'

export default function AddressSheetV2({ open, onClose, onConfirm, savedPincode }: Props) {
  const [step, setStep] = useState<'choice' | 'map' | 'details'>('choice')
  const [locationMode, setLocationMode] = useState<'current' | 'away' | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [houseNumber, setHouseNumber] = useState('')
  const [streetAddress, setStreetAddress] = useState('')
  const [landmark, setLandmark] = useState('')
  const [pincode, setPincode] = useState(savedPincode ?? '')
  const [customerPhone, setCustomerPhone] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [pinTouched, setPinTouched] = useState(false)
  const [mapSearch, setMapSearch] = useState('')
  const [mapHint, setMapHint] = useState('')
  const [pinAddress, setPinAddress] = useState('')
  const [pinPostalCode, setPinPostalCode] = useState('')
  const [googlePlaceId, setGooglePlaceId] = useState('')
  const [zoneResult, setZoneResult] = useState<DeliveryZoneResult | null>(null)
  const [locating, setLocating] = useState(false)
  const [mapSearching, setMapSearching] = useState(false)
  const [zoneChecking, setZoneChecking] = useState(false)
  const [reverseChecking, setReverseChecking] = useState(false)
  const [validating, setValidating] = useState(false)
  const [locError, setLocError] = useState('')
  const [pincodeError, setPincodeError] = useState('')
  const reverseRequestRef = useRef(0)

  useEffect(() => {
    if (!open) return
    document.body.classList.add('bf-address-sheet-open')
    return () => document.body.classList.remove('bf-address-sheet-open')
  }, [open])

  useEffect(() => {
    if (!open) return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const address = JSON.parse(saved) as Partial<DeliveryAddress>
        setCustomerName(address.customerName ?? '')
        setHouseNumber(address.houseNumber ?? '')
        setStreetAddress(address.streetAddress ?? '')
        setLandmark(address.landmark ?? '')
        setPincode(address.pincode ?? savedPincode ?? '')
        setCustomerPhone(address.customerPhone ?? '')
        setLat(typeof address.lat === 'number' ? address.lat : null)
        setLng(typeof address.lng === 'number' ? address.lng : null)
      } else {
        setPincode(savedPincode ?? '')
        setLat(null)
        setLng(null)
      }
    } catch {
      setPincode(savedPincode ?? '')
    }
    setMapHint('')
    setStep('choice')
    setLocationMode(null)
    setMapOpen(false)
    setPinTouched(false)
    setZoneResult(null)
    setPinAddress('')
    setPinPostalCode('')
    setGooglePlaceId('')
    setLocError('')
    setPincodeError('')
  }, [open, savedPincode])

  const checkDeliveryZone = useCallback(async (nextLat: number, nextLng: number, pinOverride?: string) => {
    setZoneChecking(true)
    try {
      const pin = cleanPincode(pinOverride ?? pincode)
      const response = await fetch('/api/delivery-zone/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: nextLat, lng: nextLng, ...(pin ? { pincode: pin } : {}) }),
      })
      const result = await response.json().catch(() => null) as DeliveryZoneResult | null
      if (!response.ok || !result) throw new Error('zone check failed')
      setZoneResult(result)
      if (result.pincodeAllowed === false) setMapHint(`Delivery is available only for ${ALLOWED_PINCODES.join(', ')}.`)
      else if (result.deliverable) setMapHint(`Delivery available. This location is ${result.distanceKm.toFixed(1)} km from our store.`)
      else setMapHint(`Delivery is not available here. This location is ${result.distanceKm.toFixed(1)} km away.`)
      return result
    } catch {
      setZoneResult(null)
      setMapHint('Could not check the delivery area. Move the map slightly and try again.')
      return null
    } finally {
      setZoneChecking(false)
    }
  }, [pincode])

  const reverseGeocodePin = useCallback(async (nextLat: number, nextLng: number) => {
    const requestId = ++reverseRequestRef.current
    setReverseChecking(true)
    try {
      const response = await fetch('/api/geocode-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: nextLat, lng: nextLng }),
      })
      const result = await response.json().catch(() => null) as GeocodeResult | null
      if (requestId !== reverseRequestRef.current || !response.ok || result?.provider !== 'google') return null
      const resolvedPin = cleanPincode(result.postalCode)
      setPinAddress(result.displayName ?? '')
      setPinPostalCode(resolvedPin)
      setGooglePlaceId(result.placeId ?? '')
      if (resolvedPin) setPincode(resolvedPin)
      if (!streetAddress.trim() && result.streetAddress) setStreetAddress(result.streetAddress)
      return result
    } catch {
      return null
    } finally {
      if (requestId === reverseRequestRef.current) setReverseChecking(false)
    }
  }, [streetAddress])

  async function resolveMovedPin(nextLat: number, nextLng: number) {
    setLat(nextLat)
    setLng(nextLng)
    setPinTouched(true)
    const address = await reverseGeocodePin(nextLat, nextLng)
    await checkDeliveryZone(nextLat, nextLng, cleanPincode(address?.postalCode))
  }

  function openAwayFromLocation() {
    setLocationMode('away')
    setStep('map')
    setMapOpen(true)
    setLat(DELIVERY_CENTER.lat)
    setLng(DELIVERY_CENTER.lng)
    setPincode('')
    setPinTouched(false)
    setPinAddress('')
    setPinPostalCode('')
    setGooglePlaceId('')
    setZoneResult(null)
    setLocError('')
    setMapSearch('')
    setMapHint('Search for the delivery area, building, street, or landmark.')
  }

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocError('Current location is not supported on this device. Search for the address instead.')
      return
    }
    setLocating(true)
    setLocError('')
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 12_000, enableHighAccuracy: true, maximumAge: 0 })
      })
      const nextLat = position.coords.latitude
      const nextLng = position.coords.longitude
      setLocationMode('current')
      setStep('map')
      setMapOpen(true)
      setLat(nextLat)
      setLng(nextLng)
      setPinTouched(true)
      setMapHint('Your current location is pinned. Adjust the map only if the pin is not on the delivery entrance.')
      const address = await reverseGeocodePin(nextLat, nextLng)
      await checkDeliveryZone(nextLat, nextLng, cleanPincode(address?.postalCode))
    } catch (error) {
      const geoError = error as GeolocationPositionError
      setLocError(geoError?.code === 1 ? 'Location access was denied. Choose "Away from my location" and search for the address.' : 'We could not detect your current location. Search for the address instead.')
    } finally {
      setLocating(false)
    }
  }

  async function searchMapAddress() {
    const query = mapSearch.trim()
    if (!query) {
      setMapHint('Type an area, apartment, street, shop, or landmark to search.')
      return
    }
    const requestId = ++reverseRequestRef.current
    setMapSearching(true)
    setLocError('')
    setMapHint('Searching Google Maps...')
    try {
      const response = await fetch('/api/geocode-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const result = await response.json().catch(() => null) as GeocodeResult | null
      if (requestId !== reverseRequestRef.current) return
      if (!response.ok || typeof result?.lat !== 'number' || typeof result?.lng !== 'number') {
        setMapHint('We could not find that place. Try the building, road, shop, or nearby landmark name.')
        return
      }
      const resultPin = cleanPincode(result.postalCode)
      setLat(result.lat)
      setLng(result.lng)
      setPinTouched(true)
      setPinAddress(result.displayName ?? '')
      setPinPostalCode(resultPin)
      setGooglePlaceId(result.placeId ?? '')
      if (resultPin) setPincode(resultPin)
      setMapHint('Location found. Adjust the map if the fixed pin is not on the exact entrance.')
      await checkDeliveryZone(result.lat, result.lng, resultPin)
    } catch {
      setMapHint('Google Maps search is temporarily unavailable. Please try again.')
    } finally {
      setMapSearching(false)
    }
  }

  const hasLocation = lat !== null && lng !== null
  const phoneValid = customerPhone.replace(/\D/g, '').length >= 10
  const detailsValid = customerName.trim().length >= 2 && houseNumber.trim().length > 0 && streetAddress.trim().length > 0 && phoneValid && isAllowedPincode(pincode)
  const googlePincodeMatches = !pinPostalCode || pinPostalCode === cleanPincode(pincode)
  const canConfirmPin = hasLocation && pinTouched && isAllowedPincode(pinPostalCode) && zoneResult?.deliverable === true && !zoneChecking && !reverseChecking
  const canProceed = detailsValid && hasLocation && pinTouched && googlePincodeMatches && zoneResult?.deliverable === true && !zoneChecking

  function scrollInput(event: React.FocusEvent<HTMLInputElement>) {
    setTimeout(() => event.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350)
  }

  const handleConfirm = useCallback(async () => {
    if (!canProceed || lat === null || lng === null) return
    const cleanPin = cleanPincode(pincode)
    if (!isAllowedPincode(cleanPin)) {
      setPincodeError(`Sorry, we deliver only to ${ALLOWED_PINCODES.join(', ')} right now.`)
      return
    }
    setValidating(true)
    const zone = await checkDeliveryZone(lat, lng, cleanPin)
    setValidating(false)
    if (!zone?.deliverable) {
      setStep('map')
      return
    }
    const address: DeliveryAddress = {
      customerName: customerName.trim(),
      houseNumber: houseNumber.trim(),
      streetAddress: streetAddress.trim(),
      landmark: landmark.trim(),
      pincode: cleanPin,
      lat,
      lng,
      mapsUrl: `https://maps.google.com/?q=${lat},${lng}`,
      customerPhone: customerPhone.replace(/\D/g, ''),
      deliveryDistanceKm: zone.distanceKm,
      deliveryRadiusKm: zone.radiusKm,
      deliveryZoneCenter: zone.center,
      formattedAddress: pinAddress || undefined,
      googlePlaceId: googlePlaceId || undefined,
    }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(address)) } catch {}
    onConfirm(address)
  }, [canProceed, lat, lng, pincode, customerName, houseNumber, streetAddress, landmark, customerPhone, pinAddress, googlePlaceId, checkDeliveryZone, onConfirm])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[2147483000] flex items-end justify-center" onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative flex max-h-[96vh] w-full flex-col rounded-t-[30px] bg-white shadow-2xl sm:mb-5 sm:max-w-[560px] sm:rounded-[28px]">
        <div className="flex justify-center pt-3"><div className="h-1 w-10 rounded-full bg-stone-200" /></div>
        <header className="flex shrink-0 items-center justify-between border-b border-stone-100 px-5 pb-4 pt-3">
          <div className="flex items-center gap-3">
            {step !== 'choice' && <button type="button" onClick={() => setStep(step === 'details' ? 'map' : 'choice')} className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200" aria-label="Go back"><ArrowLeft size={20} /></button>}
            <div>
              <h2 className="text-[19px] font-black text-stone-950">{step === 'choice' ? 'Delivery location' : step === 'map' ? 'Choose exact location' : 'Add address details'}</h2>
              <p className="text-[11px] font-medium text-stone-400">{step === 'choice' ? 'Where should we deliver?' : step === 'map' ? 'Place the pin on the delivery entrance' : 'Complete the delivery details'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100" aria-label="Close address"><X size={18} /></button>
        </header>

        <main className="flex-1 overflow-y-auto px-5 pb-3 pt-4">
          {step === 'choice' && (
            <section className="space-y-5 pb-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-orange-100 text-orange-600"><Navigation size={29} /></div>
              <div><h3 className="text-[25px] font-black leading-[1.18] text-stone-950 sm:text-[28px]">Where do you want us to deliver the order?</h3><p className="mt-2 text-[14px] font-medium text-stone-500">This helps us open the map at the right delivery location.</p></div>
              {locError && <Notice text={locError} error />}
              <div className="space-y-3 pt-1">
                <button type="button" onClick={openAwayFromLocation} className="min-h-16 w-full rounded-2xl bg-[#6510a8] px-5 py-4 text-[16px] font-black text-white shadow-lg shadow-purple-700/20">Away from my location</button>
                <button type="button" onClick={useCurrentLocation} disabled={locating} className="flex min-h-16 w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-[#6510a8] px-5 py-4 text-[16px] font-black text-[#6510a8] disabled:opacity-60">{locating ? <Loader2 size={21} className="animate-spin" /> : <Crosshair size={22} />}{locating ? 'Detecting current location...' : 'Use current location'}</button>
              </div>
            </section>
          )}

          {step === 'map' && (
            <section className="space-y-3">
              <div className="rounded-[22px] border border-stone-200 bg-white p-2 shadow-lg shadow-stone-900/10">
                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-1"><Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" /><input type="search" value={mapSearch} onChange={event => setMapSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void searchMapAddress() } }} placeholder="Search by area, name, street..." autoFocus={locationMode === 'away'} className="h-[58px] w-full rounded-2xl bg-stone-50 pl-12 pr-3 text-[15px] font-semibold text-stone-950 outline-none placeholder:font-medium placeholder:text-stone-400" /></div>
                  <button type="button" onClick={searchMapAddress} disabled={mapSearching} className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-2xl bg-stone-950 text-white disabled:opacity-50" aria-label="Search location">{mapSearching ? <Loader2 size={21} className="animate-spin" /> : <Search size={21} />}</button>
                </div>
              </div>
              <button type="button" onClick={useCurrentLocation} disabled={locating} className="flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-[14px] font-black text-[#6510a8] disabled:opacity-60">{locating ? <Loader2 size={19} className="animate-spin" /> : <Crosshair size={20} />}{locating ? 'Detecting current location...' : 'Use my current location'}</button>
              {locError && <Notice text={locError} error />}
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3"><p className="text-[12px] font-black text-amber-950">Place the pin on the exact delivery location</p><p className="mt-1 text-[11px] font-medium leading-relaxed text-amber-800">{mapHint}</p></div>
              {mapOpen && hasLocation && (
                <>
                  <AddressMapPicker lat={lat} lng={lng} onChange={(nextLat, nextLng) => { void resolveMovedPin(nextLat, nextLng) }} />
                  <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3.5 shadow-sm"><div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-[#6510a8]">{reverseChecking ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}</span><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.1em] text-stone-400">Deliver to</p><p className="mt-1 text-[12px] font-bold leading-relaxed text-stone-800">{pinAddress || (reverseChecking ? 'Finding this address...' : 'Search or move the map to choose a location')}</p>{pinPostalCode && <p className="mt-1 text-[11px] font-semibold text-stone-500">Pincode {pinPostalCode}</p>}</div></div></div>
                </>
              )}
            </section>
          )}

          {step === 'details' && (
            <section className="space-y-4">
              <div className="rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3.5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#6510a8]">Selected delivery location</p><p className="mt-1 text-[12px] font-bold leading-relaxed text-stone-800">{pinAddress}</p></div><button type="button" onClick={() => setStep('map')} className="shrink-0 rounded-xl border border-[#6510a8] bg-white px-3 py-2 text-[11px] font-black text-[#6510a8]">Change</button></div></div>
              <Field icon={<User size={16} />} label="Your Name" required hint="So we know who to deliver to"><input className={fieldClass} value={customerName} onChange={event => setCustomerName(event.target.value)} onFocus={scrollInput} placeholder="e.g. Priya Sharma" /></Field>
              <Field icon={<Home size={16} />} label="House No / Flat / Floor" required hint="Entered by you so the driver reaches the right door"><input className={fieldClass} value={houseNumber} onChange={event => setHouseNumber(event.target.value)} onFocus={scrollInput} placeholder="#42, 3rd Floor, Sunrise Apts" /></Field>
              <Field icon={<Phone size={16} />} label="Mobile Number" required hint="Our delivery team will call you on this number" error={customerPhone.length > 0 && !phoneValid ? 'Enter a valid 10-digit number' : undefined}><input type="tel" inputMode="numeric" maxLength={12} className={fieldClass} value={customerPhone} onChange={event => setCustomerPhone(event.target.value.replace(/[^\d+\-\s]/g, ''))} onFocus={scrollInput} placeholder="9876543210" /></Field>
              <Field icon={<MapPin size={16} />} label="Street / Area" required hint="Google address is filled when available"><input className={fieldClass} value={streetAddress} onChange={event => setStreetAddress(event.target.value)} onFocus={scrollInput} placeholder="Road, area, or locality" /></Field>
              <Field icon={<Building2 size={16} />} label="Landmark" hint="Optional - helps the driver find you faster"><input className={fieldClass} value={landmark} onChange={event => setLandmark(event.target.value)} onFocus={scrollInput} placeholder="Near a shop, school, or apartment gate" /></Field>
              <Field icon={<MapPin size={16} />} label="Pincode" required hint={`Delivery is available only in ${ALLOWED_PINCODES.join(', ')}`} error={pincodeError || (!googlePincodeMatches ? 'This pincode does not match the selected map pin.' : undefined)}><input type="text" inputMode="numeric" maxLength={6} className={fieldClass} value={pincode} onChange={event => { setPincode(cleanPincode(event.target.value)); setPincodeError('') }} onFocus={scrollInput} placeholder="560064" /></Field>
            </section>
          )}
        </main>

        {step !== 'choice' && (
          <footer className="shrink-0 space-y-2.5 border-t border-stone-100 px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">
            {step === 'map' && !pinTouched && <Notice text="Search, tap, or move the map to place the pin before continuing." />}
            {step === 'map' && pinTouched && zoneChecking && <Notice text="Checking the delivery area..." loading />}
            {step === 'map' && pinTouched && zoneResult && !zoneResult.deliverable && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3"><XCircle size={15} className="mt-0.5 shrink-0 text-red-500" /><div><p className="text-xs font-bold text-red-700">Delivery not available here</p><p className="mt-0.5 text-[11px] text-red-600">{zoneResult.pincodeAllowed === false ? `We deliver only to ${ALLOWED_PINCODES.join(', ')}.` : `This location is ${zoneResult.distanceKm.toFixed(1)} km away. Our radius is ${zoneResult.radiusKm.toFixed(1)} km.`}</p></div></div>}
            {step === 'map' ? <button type="button" onClick={() => setStep('details')} disabled={!canConfirmPin} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6510a8] py-4 text-[15px] font-black text-white shadow-lg shadow-purple-700/20 disabled:bg-stone-300 disabled:shadow-none"><CheckCircle2 size={18} />Confirm this location</button> : <button type="button" onClick={handleConfirm} disabled={!canProceed || validating} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-950 py-4 text-[15px] font-black text-white shadow-lg shadow-stone-900/20 disabled:bg-stone-300 disabled:shadow-none">{validating ? <><Loader2 size={18} className="animate-spin" />Checking delivery area...</> : <><CheckCircle2 size={18} />Confirm address &amp; proceed to pay</>}</button>}
          </footer>
        )}
      </div>
    </div>
  )
}
