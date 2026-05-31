'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Loader2, RotateCcw } from 'lucide-react'

interface Props {
  onVerified: (pincode: string, areaName: string) => void
}

const STORAGE_KEY      = 'bf-pincode'
const STORAGE_AREA_KEY = 'bf-area-name'

export default function PincodeGate({ onVerified }: Props) {
  const [pincode,   setPincode]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [status,    setStatus]    = useState<'idle' | 'not_found' | 'error'>('idle')
  const [checking,  setChecking]  = useState(false)  // kept for legacy; no longer blocks UI
  // Run-once guard: prevents the restore effect from firing a second time if
  // the parent re-renders and produces a new onVerified reference.
  const restoredRef = useRef(false)

  // On mount: restore saved pincode INSTANTLY from localStorage — no API call
  // needed on every refresh. The area name is also cached so the header shows
  // the right label straight away.
  //
  // We do a background re-verify (fire-and-forget) ONLY to handle the edge case
  // where a pincode was removed from the delivery zone. If it fails or the network
  // is unavailable, the user still gets into the app; invalid pincodes are caught
  // again at order placement time (AddressSheet validates before confirming).
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true

    const saved     = localStorage.getItem(STORAGE_KEY)
    const savedArea = localStorage.getItem(STORAGE_AREA_KEY) ?? ''

    if (!saved) { return }

    // Immediately unblock the UI with the cached values — zero network latency
    onVerified(saved, savedArea)

    // Background re-verify: silently clear the cache if the pincode is no longer
    // in the delivery zone (e.g. it was removed by admin). Non-blocking.
    fetch('/api/pincodes')
      .then(r => r.json())
      .then((list: { pincode: string; area_name: string }[]) => {
        const match = list.find(p => p.pincode === saved)
        if (!match) {
          // Pincode removed from zone — clear cache; next app open will show gate
          localStorage.removeItem(STORAGE_KEY)
          localStorage.removeItem(STORAGE_AREA_KEY)
        } else if (match.area_name !== savedArea) {
          // Area name changed — update the cache
          localStorage.setItem(STORAGE_AREA_KEY, match.area_name)
        }
      })
      .catch(() => { /* ignore — network may be unavailable */ })
  }, [onVerified])

  async function check() {
    const clean = pincode.replace(/\D/g, '').slice(0, 6)
    if (clean.length !== 6) { setStatus('error'); return }
    setLoading(true); setStatus('idle')
    try {
      const res = await fetch('/api/pincodes')
      const list: { pincode: string; area_name: string }[] = await res.json()
      const match = list.find(p => p.pincode === clean)
      if (match) {
        localStorage.setItem(STORAGE_KEY,      clean)
        localStorage.setItem(STORAGE_AREA_KEY, match.area_name)
        onVerified(match.pincode, match.area_name)
      } else {
        setStatus('not_found')
      }
    } catch {
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col" style={{ background: '#FDF8F0' }}>
      {/* Top brand bar */}
      <div
        style={{
          background: 'linear-gradient(180deg, #0D0601 0%, #180C02 100%)',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)',
        }}
        className="px-5 py-4 flex items-center gap-3"
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, #F59E0B, #D97706)',
            boxShadow: '0 0 16px rgba(251,191,36,0.45)',
          }}
        >
          <span className="text-[16px] leading-none">🐔</span>
        </div>
        <div>
          <span
            className="font-black text-sm tracking-widest block"
            style={{ color: '#F59E0B', letterSpacing: '0.12em' }}
          >
            B&apos;LURU FRESH
          </span>
          <span className="text-[10px] font-medium" style={{ color: '#6B5744' }}>Fresh Chicken Delivery</span>
        </div>
      </div>

      {status !== 'not_found' ? (
        /* ── Enter pincode ── */
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-7">
          {/* Hero */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
              style={{
                background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
                boxShadow: '0 8px 24px rgba(217,119,6,0.2)',
              }}
            >
              📍
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight" style={{ color: '#1C0F00' }}>
                Where should we deliver?
              </h2>
              <p className="text-sm mt-1.5 leading-snug" style={{ color: '#8B7355' }}>
                Enter your pincode and we&apos;ll check<br />if we deliver to your area.
              </p>
            </div>
          </div>

          <div className="w-full space-y-3">
            <input
              type="tel"
              inputMode="numeric"
              maxLength={6}
              value={pincode}
              onChange={e => { setPincode(e.target.value.replace(/\D/g, '')); setStatus('idle') }}
              onKeyDown={e => e.key === 'Enter' && check()}
              placeholder="6-digit pincode"
              autoFocus
              className="w-full text-center text-2xl font-black tracking-[0.3em] rounded-2xl px-4 py-4 outline-none transition-all placeholder:tracking-normal placeholder:text-base placeholder:font-normal"
              style={{
                background: '#FFFFFF',
                border: '2px solid #FDE68A',
                color: '#1C0F00',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#D97706'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(217,119,6,0.12)' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#FDE68A'; e.currentTarget.style.boxShadow = 'none' }}
            />

            {status === 'error' && (
              <p className="text-sm text-red-500 text-center font-medium">Enter a valid 6-digit pincode</p>
            )}

            <button
              onClick={check}
              disabled={loading || pincode.length !== 6}
              className="w-full text-white rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 55%, #B45309 100%)',
                boxShadow: '0 6px 24px rgba(217,119,6,0.4)',
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
              {loading ? 'Checking…' : 'Check Availability'}
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {['⚡ Delivery within 1 hour', '🥩 Farm fresh', '🔒 FSSAI Licensed'].map(tag => (
              <span
                key={tag}
                className="text-[10px] font-semibold px-2.5 py-1.5 rounded-full"
                style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      ) : (
        /* ── Not in delivery zone ── */
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 text-center">
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
            style={{ background: '#FEF3C7', boxShadow: '0 8px 24px rgba(217,119,6,0.15)' }}
          >
            🗺️
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black" style={{ color: '#1C0F00' }}>We&apos;ll be there soon!</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#8B7355' }}>
              We don&apos;t deliver to{' '}
              <span className="font-bold" style={{ color: '#1C0F00' }}>{pincode}</span> yet.<br />
              We&apos;re expanding fast — check back soon.
            </p>
          </div>

          <div className="w-full space-y-3">
            <div
              className="rounded-2xl px-4 py-3 text-sm"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#78350F' }}
            >
              Currently delivering in <strong>Yelahanka</strong> and nearby areas.
            </div>
            <button
              onClick={() => { setPincode(''); setStatus('idle') }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-sm active:scale-95 transition-all"
              style={{ background: '#FFF', border: '2px solid #FDE68A', color: '#78350F' }}
            >
              <RotateCcw size={15} />
              Try a different pincode
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
