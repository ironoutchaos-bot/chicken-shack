'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, MapPin, Loader2, Navigation, Home, Building2, CheckCircle2, AlertTriangle, XCircle, Phone, User } from 'lucide-react'
import { Input } from '@heroui/react'

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
}

interface Props {
  open:          boolean
  onClose:       () => void
  onConfirm:     (address: DeliveryAddress) => void
  savedPincode?: string
}

const STORAGE_KEY = 'bf-delivery-address-v2'

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

  const validPincodesRef = useRef<{ pincode: string; area_name: string }[] | null>(null)
  const cachedLatRef     = useRef<number | null>(null)
  const cachedLngRef     = useRef<number | null>(null)
  const cachedStreetRef  = useRef<string>('')
  const cachedPincodeRef = useRef<string>('')

  useEffect(() => {
    if (!open) return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const addr: Partial<DeliveryAddress> = JSON.parse(saved)
        setCustomerName(addr.customerName  ?? '')
        setHouseNumber(addr.houseNumber    ?? '')
        setLandmark(addr.landmark          ?? '')
        setPincode(addr.pincode            ?? savedPincode ?? '')
        setCustomerPhone(addr.customerPhone ?? '')
      } else if (savedPincode) {
        setPincode(savedPincode)
      }
    } catch {}
    setPincodeError('')

    if (cachedLatRef.current !== null && cachedLngRef.current !== null) {
      setLat(cachedLatRef.current)
      setLng(cachedLngRef.current)
      setStreetAddress(cachedStreetRef.current)
      if (cachedPincodeRef.current) setPincode(cachedPincodeRef.current)
    } else {
      triggerLocation()
    }

    if (!validPincodesRef.current) {
      fetch('/api/pincodes')
        .then(r => r.json())
        .then((list: { pincode: string; area_name: string }[]) => {
          validPincodesRef.current = Array.isArray(list) ? list : []
        })
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function triggerLocation() {
    if (!navigator.geolocation) {
      setLocError('Geolocation not supported. Please enter your area manually.')
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
      setLat(latitude); setLng(longitude)
      cachedLatRef.current = latitude; cachedLngRef.current = longitude

      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await r.json()
      const addr = data.address ?? {}
      const road   = addr.road ?? addr.pedestrian ?? addr.neighbourhood ?? addr.hamlet ?? ''
      const area   = addr.suburb ?? addr.quarter ?? addr.city_district ?? addr.village ?? ''
      const street = [road, area].filter(Boolean).join(', ')
      setStreetAddress(street)
      cachedStreetRef.current = street
      if (addr.postcode) { setPincode(addr.postcode); cachedPincodeRef.current = addr.postcode }
    } catch (err: unknown) {
      const geoErr = err as GeolocationPositionError
      if (geoErr?.code === 1) {
        setLocDenied(true)
        setLocError('Location access was denied. Please enable it in your browser settings.')
      } else {
        setLocError('Could not detect location. Please try again or enter your area manually.')
      }
    } finally {
      setLocating(false)
    }
  }

  const hasLocation = lat !== null && lng !== null
  const phoneValid  = customerPhone.replace(/\D/g, '').length >= 10
  const nameValid   = customerName.trim().length >= 2
  const canProceed  = nameValid && houseNumber.trim().length > 0 && hasLocation && phoneValid

  function scrollIntoView(e: React.FocusEvent<HTMLInputElement>) {
    setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350)
  }

  const handleConfirm = useCallback(async () => {
    if (!canProceed) return
    setPincodeError('')
    const cleanPin = pincode.trim()

    if (cleanPin.length === 6) {
      setValidating(true)
      try {
        let list = validPincodesRef.current
        if (!list) {
          const res = await fetch('/api/pincodes')
          list = await res.json()
          validPincodesRef.current = Array.isArray(list) ? list : []
        }
        const match = (list ?? []).find(p => p.pincode === cleanPin)
        if (!match) {
          setPincodeError(`Sorry, we don't deliver to ${cleanPin} yet.`)
          setValidating(false)
          return
        }
      } catch {}
      setValidating(false)
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
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        customerName:  addr.customerName,
        houseNumber:   addr.houseNumber,
        landmark:      addr.landmark,
        pincode:       addr.pincode,
        customerPhone: addr.customerPhone,
      }))
    } catch {}
    onConfirm(addr)
  }, [canProceed, customerName, pincode, houseNumber, streetAddress, landmark, lat, lng, customerPhone, onConfirm])

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

          {/* GPS Status Card */}
          <div className={`rounded-2xl p-3.5 transition-all ${
            hasLocation
              ? 'bg-emerald-50 border border-emerald-200'
              : locDenied
                ? 'bg-red-50 border border-red-200'
                : 'bg-amber-50 border border-amber-200 border-dashed'
          }`}>
            {hasLocation ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle2 size={17} className="text-white" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-emerald-800">Location captured ✓</p>
                  {streetAddress && <p className="text-xs text-emerald-700 mt-0.5 truncate">{streetAddress}</p>}
                  <p className="text-[10px] text-emerald-600 font-mono mt-0.5">{lat?.toFixed(5)}, {lng?.toFixed(5)}</p>
                </div>
                <button
                  onClick={triggerLocation}
                  disabled={locating}
                  className="shrink-0 text-[11px] font-bold text-emerald-700 bg-white border border-emerald-200 px-3 py-1.5 rounded-xl active:scale-95 transition-all shadow-sm"
                >
                  {locating ? <Loader2 size={12} className="animate-spin" /> : 'Refresh'}
                </button>
              </div>
            ) : locDenied ? (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                  <AlertTriangle size={17} className="text-red-500" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-red-700">Location access denied</p>
                  <p className="text-[11px] text-red-600 mt-0.5 leading-relaxed">Enable location in browser settings for accurate delivery.</p>
                  <button onClick={triggerLocation} className="mt-2 text-[11px] font-bold text-red-700 bg-red-100 px-3 py-1.5 rounded-xl active:scale-95 transition-all">
                    Try again
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                  {locating
                    ? <Loader2 size={16} className="text-amber-600 animate-spin" />
                    : <Navigation size={16} className="text-amber-600" />
                  }
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-800">
                    {locating ? 'Detecting your location…' : 'Location required'}
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    {locating ? 'Allow location access when prompted' : 'Needed for accurate delivery'}
                  </p>
                </div>
                {!locating && (
                  <button onClick={triggerLocation} className="shrink-0 text-[11px] font-bold text-amber-800 bg-amber-200 px-3 py-1.5 rounded-xl active:scale-95 transition-all">
                    Allow
                  </button>
                )}
              </div>
            )}
          </div>

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
          <Field label="Street / Area" hint="Auto-filled from GPS — you can edit if needed">
            <div className="relative">
              <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none z-10" />
              <Input
                type="text"
                placeholder="Detected automatically from GPS"
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
          <Field label="Pincode" error={pincodeError || undefined}>
            <div className="relative">
              <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none z-10" />
              <Input
                type="text" inputMode="numeric" maxLength={6} placeholder="560064"
                value={pincode}
                onChange={e => { setPincode(e.target.value.replace(/\D/g, '')); setPincodeError('') }}
                onFocus={scrollIntoView}
                className={`w-full pl-9 pr-4 py-3 rounded-2xl text-sm text-stone-900 outline-none bg-stone-50 border transition-colors placeholder:text-stone-300 ${
                  pincodeError ? 'border-red-400' : 'border-stone-200 focus:border-amber-400'
                }`}
              />
            </div>
          </Field>

          <div className="h-1" />
        </div>

        {/* CTA */}
        <div className="px-5 pt-3 pb-2 border-t border-stone-100 shrink-0 space-y-2.5">
          {/* Inline hints */}
          {!hasLocation && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <Navigation size={13} className="text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 font-medium">Allow location access above to proceed</p>
            </div>
          )}
          {hasLocation && !nameValid && customerName.length > 0 && (
            <p className="text-xs text-center text-stone-400">Enter your full name to continue</p>
          )}
          {hasLocation && !houseNumber.trim() && (
            <p className="text-xs text-center text-stone-400">Enter your house / flat number to continue</p>
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

          <button
            onClick={handleConfirm}
            disabled={!canProceed || validating}
            className="w-full bg-stone-900 text-white rounded-2xl py-4 font-bold text-[15px] flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all disabled:opacity-40"
            style={{ boxShadow: canProceed ? '0 4px 20px rgba(0,0,0,0.25)' : 'none' }}
          >
            {validating
              ? <><Loader2 size={17} className="animate-spin" />Checking area…</>
              : <><CheckCircle2 size={17} strokeWidth={2.2} />Confirm &amp; Proceed to Pay</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
