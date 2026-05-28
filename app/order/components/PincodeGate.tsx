'use client'

import { useState, useEffect } from 'react'
import { MapPin, Loader2, RotateCcw } from 'lucide-react'
import Image from 'next/image'

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

  useEffect(() => {
    const saved     = localStorage.getItem(STORAGE_KEY)
    const savedArea = localStorage.getItem(STORAGE_AREA_KEY) ?? ''

    if (!saved) { return }

    onVerified(saved, savedArea)

    fetch('/api/pincodes')
      .then(r => r.json())
      .then((list: { pincode: string; area_name: string }[]) => {
        const match = list.find(p => p.pincode === saved)
        if (!match) {
          localStorage.removeItem(STORAGE_KEY)
          localStorage.removeItem(STORAGE_AREA_KEY)
        } else if (match.area_name !== savedArea) {
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
      <div className="flex-1 flex items-center justify-center" style={{ background: '#FDF8F0' }}>
        <Loader2 size={28} className="animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-6"
      style={{
        background: '#FDF8F0',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
      }}
    >
      {status !== 'not_found' ? (
        <div className="w-full max-w-sm flex flex-col items-center gap-8">
          {/* Logo */}
          <Image
            src="/bluru_logo.png"
            alt="B'LURU Fresh"
            width={180}
            height={180}
            className="object-contain"
            priority
          />

          {/* Pincode input */}
          <div className="w-full space-y-3">
            <input
              type="tel"
              inputMode="numeric"
              maxLength={6}
              value={pincode}
              onChange={e => { setPincode(e.target.value.replace(/\D/g, '')); setStatus('idle') }}
              onKeyDown={e => e.key === 'Enter' && check()}
              placeholder="Enter your pincode"
              autoFocus
              className="w-full text-center text-2xl font-black tracking-[0.3em] rounded-2xl px-4 py-4 outline-none transition-all placeholder:tracking-normal placeholder:text-base placeholder:font-normal"
              style={{
                background: '#FFFFFF',
                border: '2px solid #FDE68A',
                color: '#1C0F00',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = '#D97706'
                e.currentTarget.style.boxShadow = '0 0 0 4px rgba(217,119,6,0.12)'
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = '#FDE68A'
                e.currentTarget.style.boxShadow = 'none'
              }}
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
        </div>
      ) : (
        /* ── Not in delivery zone ── */
        <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
          {/* Logo */}
          <Image
            src="/bluru_logo.png"
            alt="B'LURU Fresh"
            width={140}
            height={140}
            className="object-contain"
            priority
          />

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
