'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronLeft, Loader2, RefreshCw } from 'lucide-react'
import { Button, InputOTP } from '@heroui/react'
import type { AuthUser } from '@/lib/auth-types'

// Locked to India — only Indian numbers supported
const COUNTRY_CODE = '91'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: (user: AuthUser) => void
}

type Step = 'phone' | 'otp'
const RESEND_SECONDS = 30
const OTP_LEN = 4

function otpErrorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== 'object') return fallback
  const body = data as { error?: unknown; detail?: { message?: unknown; code?: unknown } }
  if (typeof body.error === 'string' && body.error.trim()) return body.error
  if (typeof body.detail?.message === 'string' && body.detail.message.trim()) {
    const code = body.detail.code !== undefined ? ` (${String(body.detail.code)})` : ''
    return `${body.detail.message}${code}`
  }
  return fallback
}

export default function LoginDrawer({ open, onClose, onSuccess }: Props) {
  const [step,        setStep]        = useState<Step>('phone')
  const [phone,       setPhone]       = useState('')
  const [otp,         setOtp]         = useState('')
  const [reqId,       setReqId]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [countdown,   setCountdown]   = useState(0)
  const phoneRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function scrollIntoView(e: React.FocusEvent<HTMLInputElement>) {
    setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350)
  }

  useEffect(() => {
    if (!open) return
    setStep('phone'); setPhone(''); setOtp(''); setReqId('')
    setError(''); setLoading(false); setCountdown(0)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [open])

  function startResendTimer() {
    setCountdown(RESEND_SECONDS)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0 }
        return prev - 1
      })
    }, 1_000)
  }

  // All OTP calls go through server routes — MSG91 credentials are never
  // sent to the browser or included in the compiled JS bundle.

  async function handleSendOtp() {
    setError('')
    if (!/^\d{10}$/.test(phone.trim())) { setError('Enter a valid 10-digit number'); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/send-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone: phone.trim(), countryCode: COUNTRY_CODE }),
      })
      const data = await res.json()
      if (!res.ok) { setError(otpErrorMessage(data, 'Failed to send OTP')); return }
      setReqId(data.reqId); setStep('otp'); startResendTimer()
    } catch { setError('Network error — please try again') }
    finally { setLoading(false) }
  }

  async function handleVerifyOtp(otpOverride?: string) {
    const otpValue = otpOverride ?? otp
    setError('')
    if (otpValue.length < OTP_LEN) { setError('Enter the OTP sent to your phone'); return }
    setLoading(true)
    try {
      // Server verifies OTP with MSG91 and creates the session in one secure call
      const res  = await fetch('/api/auth/verify-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone: phone.trim(), countryCode: COUNTRY_CODE, reqId, otp: otpValue }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Sign in failed'); return }
      if (timerRef.current) clearInterval(timerRef.current)
      onSuccess(data.user as AuthUser)
    } catch { setError('Network error — please try again') }
    finally { setLoading(false) }
  }

  async function handleResend() {
    if (countdown > 0) return
    setError(''); setOtp(''); setLoading(true)
    try {
      const res  = await fetch('/api/auth/send-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone: phone.trim(), countryCode: COUNTRY_CODE }),
      })
      const data = await res.json()
      if (!res.ok) { setError(otpErrorMessage(data, 'Failed to resend OTP')); return }
      setReqId(data.reqId); startResendTimer()
    } catch { setError('Network error — please try again') }
    finally { setLoading(false) }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

      <div
        className="relative w-full max-w-[430px] bg-white rounded-t-[2rem] shadow-sheet animate-slide-up overflow-hidden"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1.5rem)' }}
      >
        {/* Amber accent line */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400" />

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-stone-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-2 pb-5">
          <div className="flex items-center gap-2">
            {step === 'otp' && (
              <button
                onClick={() => { setStep('phone'); setError(''); setOtp('') }}
                className="w-8 h-8 -ml-1 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors active:scale-90"
              >
                <ChevronLeft size={20} className="text-stone-500" />
              </button>
            )}
            <div>
              <h2 className="text-2xl font-black text-stone-900 tracking-tight">
                {step === 'phone' ? 'Welcome back 👋' : 'Verify your number'}
              </h2>
              <p className="text-xs text-stone-400 mt-0.5 font-medium">
                {step === 'phone'
                  ? 'Sign in with your phone number'
                  : `Code sent to 🇮🇳 +91 ${phone}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center active:scale-90 transition-all shrink-0"
          >
            <X size={16} className="text-stone-500" />
          </button>
        </div>

        <div className="px-6 pb-4 space-y-4">

          {/* ── Step 1: Phone ── */}
          {step === 'phone' && (
            <>
              {/* Unified phone input pill */}
              <div className={[
                'flex items-center rounded-2xl border-2 bg-stone-50 transition-all duration-200 overflow-hidden',
                error
                  ? 'border-red-400'
                  : 'border-stone-200 focus-within:border-amber-500 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(251,191,36,0.1)]',
              ].join(' ')}>
                {/* Static India badge */}
                <div className="flex items-center gap-1.5 pl-4 pr-3 py-4 shrink-0 border-r border-stone-200">
                  <span className="text-xl leading-none">🇮🇳</span>
                  <span className="text-stone-700 font-bold text-sm">+91</span>
                </div>

                {/* Phone input — border/outline fully suppressed */}
                <input
                  ref={phoneRef}
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError('') }}
                  onFocus={scrollIntoView}
                  autoComplete="tel-national"
                  autoFocus
                  className="flex-1 bg-transparent px-4 py-4 text-stone-900 font-semibold text-[15px] outline-none border-none ring-0 shadow-none placeholder:text-stone-300 placeholder:font-normal"
                  style={{ WebkitAppearance: 'none', boxShadow: 'none' }}
                  onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                />
                {phone.length === 10 && (
                  <span className="text-emerald-500 font-black text-base pr-4 shrink-0">✓</span>
                )}
              </div>

              {error && (
                <p className="text-xs text-red-500 font-semibold px-1 flex items-center gap-1.5">
                  <span>⚠</span>{error}
                </p>
              )}

              {/* HeroUI v3 Button */}
              <Button
                onPress={handleSendOtp}
                isDisabled={loading || phone.length !== 10}
                className="w-full h-14 rounded-2xl font-black text-[15px] bg-amber-500 text-white shadow-[0_4px_20px_rgba(217,119,6,0.3)] disabled:opacity-40 disabled:shadow-none"
              >
                {loading
                  ? <Loader2 size={18} className="animate-spin" />
                  : 'Send OTP →'
                }
              </Button>

              <p className="text-center text-[10px] text-stone-300 font-medium">
                By signing in you agree to our terms &amp; privacy policy
              </p>
            </>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 'otp' && (
            <>
              {/* Sent confirmation */}
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0 text-white font-black text-sm">✓</div>
                <div>
                  <p className="text-xs font-bold text-emerald-800">OTP sent successfully</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">Check your SMS inbox</p>
                </div>
              </div>

              {/* HeroUI v3 InputOTP — compound component */}
              <div className="flex justify-center py-1">
                <InputOTP
                  maxLength={OTP_LEN}
                  value={otp}
                  onChange={v => {
                    setOtp(v)
                    setError('')
                    if (v.length === OTP_LEN) setTimeout(() => handleVerifyOtp(v), 120)
                  }}
                >
                  <InputOTP.Group className="flex gap-2.5">
                    {Array.from({ length: OTP_LEN }).map((_, i) => (
                      <InputOTP.Slot
                        key={i}
                        index={i}
                        className={[
                          'w-12 h-14 flex items-center justify-center text-xl font-black rounded-xl border-2 transition-all duration-150',
                          'border-stone-200 bg-stone-50 text-stone-900',
                          'data-[active=true]:border-amber-500 data-[active=true]:bg-white data-[active=true]:shadow-[0_0_0_4px_rgba(251,191,36,0.12)]',
                          otp[i]
                            ? 'border-amber-400 bg-amber-50 text-amber-700'
                            : '',
                        ].join(' ')}
                      />
                    ))}
                  </InputOTP.Group>
                </InputOTP>
              </div>

              {error && (
                <p className="text-xs text-red-500 font-semibold text-center flex items-center justify-center gap-1.5">
                  <span>⚠</span>{error}
                </p>
              )}

              {/* HeroUI v3 Button */}
              <Button
                onPress={() => handleVerifyOtp()}
                isDisabled={loading || otp.length < OTP_LEN}
                className="w-full h-14 rounded-2xl font-black text-[15px] bg-amber-500 text-white shadow-[0_4px_20px_rgba(217,119,6,0.3)] disabled:opacity-40 disabled:shadow-none"
              >
                {loading
                  ? <Loader2 size={18} className="animate-spin" />
                  : 'Verify & Sign in →'
                }
              </Button>

              <button
                onClick={handleResend}
                disabled={loading || countdown > 0}
                className="w-full flex items-center justify-center gap-2 text-stone-400 py-2 font-semibold text-sm disabled:opacity-60"
              >
                {countdown > 0
                  ? <>Resend in <span className="text-amber-500 font-black">{countdown}s</span></>
                  : <><RefreshCw size={13} /> Resend OTP</>
                }
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
