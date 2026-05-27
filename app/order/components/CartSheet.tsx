'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Minus, Plus, Trash2, ShoppingBag, Loader2, ShieldCheck, Banknote, AlertTriangle, RotateCcw, Tag, CheckCircle2 } from 'lucide-react'
import { type CartItem } from '@/lib/supabase-browser'
import { type AuthUser } from '@/lib/auth-types'
import { UNIT_LABEL } from '@/lib/units'
import AddressSheet, { type DeliveryAddress } from './AddressSheet'

type CheckoutMode = 'cashfree' | 'cod'

interface Props {
  open: boolean
  onClose: () => void
  cart: CartItem[]
  onUpdateQty: (productId: string, qty: number) => void
  onClear: () => void
  user: AuthUser | null
  onLoginRequired: () => void
  onOrderPlaced: () => void
  savedPincode?: string
  minOrderAmount?: number
  deliveryFee?: number
}

// Wraps any promise with a hard timeout. Rejects with a user-friendly message
// if the promise doesn't resolve within `ms` milliseconds.
function withTimeout<T>(promise: Promise<T>, ms: number, msg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error(msg)), ms)),
  ])
}

export default function CartSheet({
  open, onClose, cart, onUpdateQty, onClear,
  user, onLoginRequired, onOrderPlaced, savedPincode,
  minOrderAmount = 0, deliveryFee = 0,
}: Props) {
  const [loading,        setLoading]        = useState(false)
  const [slowConn,       setSlowConn]       = useState(false)
  const [payStep,        setPayStep]        = useState('')
  const [error,          setError]          = useState('')
  const [addressOpen,    setAddressOpen]    = useState(false)
  const [checkoutMode,   setCheckoutMode]   = useState<CheckoutMode>('cashfree')
  const [codEnabled,     setCodEnabled]     = useState(true)
  const [cfEnabled,      setCfEnabled]      = useState(true)
  const [outOfStock,     setOutOfStock]     = useState<string[]>([])
  const [lastAddr,       setLastAddr]       = useState<DeliveryAddress | null>(null)

  // Coupon state
  const [couponInput,    setCouponInput]    = useState('')
  const [couponApplied,  setCouponApplied]  = useState(false)
  const [couponError,    setCouponError]    = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponLabel,    setCouponLabel]    = useState('')
  const couponInputRef    = useRef<HTMLInputElement>(null)

  const subtotal   = cart.reduce((s, c) => s + c.pricePerKg * c.quantity, 0)
  const discount   = couponApplied ? couponDiscount : 0
  const total      = Math.max(0, subtotal + deliveryFee - discount)
  const totalPaise = Math.round(total * 100)
  const belowMin   = minOrderAmount > 0 && subtotal < minOrderAmount

  // Fetch settings + check stock freshness when cart opens
  useEffect(() => {
    if (!open) {
      setCouponInput('')
      setCouponApplied(false)
      setCouponError('')
      setCouponDiscount(0)
      setCouponLabel('')
      return
    }
    setError('')

    // Settings
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        setCodEnabled(d.cod_enabled !== false)
        setCfEnabled(d.cashfree_enabled !== false)
      })
      .catch(() => {})

    // Out-of-stock check
    if (cart.length > 0) {
      fetch('/api/products')
        .then(r => r.json())
        .then((products: { id: string; stock_quantity: number; name: string }[]) => {
          const oos = cart
            .filter(item => {
              const p = products.find(p => p.id === item.productId)
              return p && p.stock_quantity === 0
            })
            .map(item => item.name)
          setOutOfStock(oos)
        })
        .catch(() => {})
    } else {
      setOutOfStock([])
    }
  }, [open, cart])

  const showCOD = codEnabled
  const showCF  = cfEnabled

  function handleCheckout(mode: CheckoutMode) {
    if (!user) { onClose(); onLoginRequired(); return }
    if (cart.length === 0) return
    setError('')
    setCheckoutMode(mode)
    setAddressOpen(true)
  }

  const [couponChecking, setCouponChecking] = useState(false)

  async function applyCoupon() {
    setCouponError('')
    const entered = couponInput.trim().toUpperCase()
    if (!entered) { setCouponError('Please enter a coupon code'); return }

    setCouponChecking(true)
    try {
      const res = await fetch('/api/coupon/validate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code:            entered,
          cart_items:      cart,
          customer_phone:  user?.phone ?? '',
          subtotal,
          delivery_fee:    deliveryFee,
        }),
      })
      const data = await res.json()
      if (!data.valid) {
        setCouponError(data.error ?? 'Invalid coupon code')
        setCouponChecking(false)
        return
      }
      setCouponDiscount(data.discount)
      setCouponLabel(data.label)
      setCouponApplied(true)
    } catch {
      setCouponError('Could not verify coupon. Please try again.')
    }
    setCouponChecking(false)
  }

  function removeCoupon() {
    setCouponApplied(false)
    setCouponDiscount(0)
    setCouponLabel('')
    setCouponInput('')
    setCouponError('')
  }

  function handleRetry() {
    setError('')
    if (lastAddr) {
      if (checkoutMode === 'cod') proceedCOD(lastAddr)
      else proceedCashfree(lastAddr)
    } else {
      setAddressOpen(true)
    }
  }

  // Show "slow connection" hint after 8 s; clear it when loading ends
  function startSlowTimer(): ReturnType<typeof setTimeout> {
    return setTimeout(() => setSlowConn(true), 8_000)
  }
  function stopSlowTimer(t: ReturnType<typeof setTimeout>) {
    clearTimeout(t)
    setSlowConn(false)
  }

  // Step 2a — Cashfree flow (direct URL redirect — no SDK, no Supabase calls)
  async function proceedCashfree(deliveryAddress: DeliveryAddress) {
    setLastAddr(deliveryAddress)
    setAddressOpen(false)
    setLoading(true)
    setPayStep('Creating order…')

    try {
      // Use user prop directly — no Supabase network calls at all
      const returnUrl = `https://blurufresh.com/order?cashfree_order_id={order_id}`

      const orderRes = await fetch('/api/cashfree/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_inr:     total,
          customer_id:    user!.id,
          customer_name:  user!.name ?? 'Customer',
          customer_email: `${user!.id}@blurufresh.com`,
          customer_phone: deliveryAddress.customerPhone || user!.phone || '9999999999',
          return_url:     returnUrl,
        }),
      })


      if (!orderRes.ok) {
        const errJson = await orderRes.json().catch(() => ({ error: orderRes.status }))
        throw new Error(`Order failed: ${errJson.detail ?? errJson.error ?? orderRes.status}`)
      }

      const { order_id, payment_session_id } = await orderRes.json()
      if (!payment_session_id || !order_id) throw new Error('No payment session returned')

      // Save order to DB with pending status BEFORE redirecting.
      // This ensures the webhook can find and mark it as paid even if the user
      // closes the browser before being redirected back.
      setPayStep('Saving order…')
      const dbRes = await withTimeout(
        fetch('/api/orders/cod', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id:           user!.id,
            items:             cart,
            total_amount:      total,
            payment_status:    'pending',
            order_status:      'placed',
            cashfree_order_id: order_id,
            delivery_address:  deliveryAddress,
            notes:             null,
            customer_phone:    deliveryAddress.customerPhone || null,
            customer_name:     deliveryAddress.customerName  || null,
            coupon_code:       couponApplied ? couponInput.trim().toUpperCase() : null,
            coupon_discount:   couponApplied ? couponDiscount : 0,
          }),
        }),
        20_000,
        'Server took too long — please try again.'
      )
      if (!dbRes.ok) {
        const errJson = await dbRes.json().catch(() => ({}))
        throw new Error(errJson.error ?? `Failed to save order (${dbRes.status})`)
      }

      // Only store the cashfree order ID — the DB record already has everything
      localStorage.setItem('bf-pending-payment', JSON.stringify({ cashfreeOrderId: order_id }))

      // Clear cart now — order is safely in DB, no need to keep it locally
      onClear()

      setPayStep('Redirecting to payment…')
      // Use Cashfree SDK to redirect — ensures session state is set up correctly
      const { load } = await import('@cashfreepayments/cashfree-js')
      const cashfree = await load({ mode: 'production' })
      await cashfree.checkout({
        paymentSessionId: payment_session_id,
        redirectTarget: '_self',
      })
    } catch (e) {
      localStorage.removeItem('bf-pending-payment')
      setPayStep('')
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  // Step 2b — COD flow
  async function proceedCOD(deliveryAddress: DeliveryAddress) {
    setLastAddr(deliveryAddress)
    setAddressOpen(false)
    setLoading(true)
    const slowTimer = startSlowTimer()
    try {
      // Route through the server-side API so we use the service-role key.
      // This is faster (bypasses RLS round-trip) and lets us set a hard
      // 25-second timeout so the UI never gets permanently stuck on cold starts.
      const res = await withTimeout(
        fetch('/api/orders/cod', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id:          user!.id,
            items:            cart,
            total_amount:     total,
            payment_status:   'cod',
            order_status:     'placed',
            delivery_address: deliveryAddress,
            notes:            null,
            customer_phone:   deliveryAddress.customerPhone || null,
            customer_name:    deliveryAddress.customerName  || null,
            coupon_code:      couponApplied ? couponInput.trim().toUpperCase() : null,
            coupon_discount:  couponApplied ? couponDiscount : 0,
          }),
        }),
        25_000,
        'The server took too long to respond. Supabase may be waking up — please try again in a moment.'
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Server error ${res.status}`)
      }
      stopSlowTimer(slowTimer)
      // Update user's full_name in profiles (fire-and-forget)
      if (deliveryAddress.customerName && user) {
        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ full_name: deliveryAddress.customerName }),
        }).catch(() => {})
      }
      setLoading(false)
      onOrderPlaced()
    } catch (e) {
      stopSlowTimer(slowTimer)
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  function onAddressConfirmed(addr: DeliveryAddress) {
    if (checkoutMode === 'cod') proceedCOD(addr)
    else proceedCashfree(addr)
  }

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />

        <div
          className="relative w-full max-w-[430px] bg-white rounded-t-4xl shadow-sheet animate-slide-up flex flex-col max-h-[85vh]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 1.5rem)' }}
        >
          {/* Handle + Header */}
          <div className="flex justify-center pt-3">
            <div className="w-10 h-1 bg-stone-200 rounded-full" />
          </div>
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <ShoppingBag size={20} className="text-stone-700" />
              <h2 className="text-lg font-bold text-stone-900">Your Cart</h2>
              <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-medium">
                {cart.reduce((s,c)=>s+c.quantity,0)} pc{cart.reduce((s,c)=>s+c.quantity,0)!==1?'s':''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button onClick={onClear} className="text-xs text-red-400 font-medium flex items-center gap-1">
                  <Trash2 size={12} /> Clear
                </button>
              )}
              <button onClick={onClose} className="p-2 rounded-full hover:bg-stone-100 transition-colors">
                <X size={18} className="text-stone-500" />
              </button>
            </div>
          </div>

          {/* Items + Notes */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <span className="text-5xl">🛒</span>
                <p className="text-stone-400 text-sm font-medium">Your cart is empty</p>
              </div>
            ) : (
              <>
                {cart.map(item => (
                  <div
                    key={item.productId}
                    className="flex items-center gap-3 rounded-2xl p-3"
                    style={{ background: '#FEF9EE', border: '1px solid rgba(253,230,138,0.6)' }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                      style={{ background: '#FEF3C7' }}
                    >
                      🍗
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-stone-900 text-sm truncate">{item.name}</p>
                      <p className="text-xs text-stone-400">₹{item.pricePerKg} / pc · {UNIT_LABEL}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onUpdateQty(item.productId, item.quantity - 1)}
                        className="w-7 h-7 bg-white rounded-lg border border-stone-200 flex items-center justify-center active:scale-90 transition-all shadow-sm"
                      >
                        <Minus size={12} className="text-stone-600" />
                      </button>
                      <span className="text-sm font-bold text-stone-800 w-14 text-center">
                        {item.quantity} pc{item.quantity !== 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={() => onUpdateQty(item.productId, item.quantity + 1)}
                        className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center active:scale-90 transition-all shadow-sm"
                      >
                        <Plus size={12} className="text-white" />
                      </button>
                    </div>
                    <div className="text-right shrink-0 w-14">
                      <p className="text-sm font-bold text-stone-900">₹{item.pricePerKg * item.quantity}</p>
                    </div>
                  </div>
                ))}

                {/* Out-of-stock warning */}
                {outOfStock.length > 0 && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-2xl px-3.5 py-3">
                    <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" strokeWidth={2.2} />
                    <div>
                      <p className="text-xs font-bold text-red-700">Some items are now out of stock</p>
                      <p className="text-[11px] text-red-600 mt-0.5">
                        {outOfStock.join(', ')} — remove them to proceed.
                      </p>
                    </div>
                  </div>
                )}

                {/* Coupon code */}
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">
                    <Tag size={11} />
                    Coupon Code
                    <span className="text-stone-300 font-normal normal-case tracking-normal">· optional</span>
                  </label>
                  {couponApplied ? (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                      <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-green-800">{couponInput.toUpperCase()}</p>
                        <p className="text-xs text-green-600">{couponLabel} applied — saving ₹{couponDiscount}</p>
                      </div>
                      <button
                        onClick={removeCoupon}
                        className="text-xs text-red-400 font-semibold hover:text-red-600 transition-colors shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        ref={couponInputRef}
                        type="text"
                        placeholder="Enter coupon code"
                        value={couponInput}
                        onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError('') }}
                        onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                        maxLength={20}
                        className="flex-1 bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-sm font-mono font-bold uppercase tracking-widest text-stone-900 outline-none focus:border-amber-400 transition-colors placeholder:text-stone-300 placeholder:font-normal placeholder:tracking-normal placeholder:normal-case"
                      />
                      <button
                        onClick={applyCoupon}
                        disabled={couponChecking}
                        className="px-4 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 disabled:opacity-60"
                        style={{ background: '#1C1917', color: '#fff', whiteSpace: 'nowrap' }}
                      >
                        {couponChecking ? <Loader2 size={15} className="animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                  )}
                  {couponError && (
                    <p className="text-xs text-red-500 mt-1.5 ml-1">{couponError}</p>
                  )}
                </div>

              </>
            )}
          </div>

          {/* Footer */}
          {cart.length > 0 && (
            <div className="px-5 pt-3 pb-2 border-t border-stone-100 space-y-3">
              {(deliveryFee > 0 || couponApplied) && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-400">Subtotal</span>
                    <span className="text-stone-600 font-medium">₹{subtotal.toFixed(0)}</span>
                  </div>
                  {deliveryFee > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-stone-400">Delivery fee</span>
                      <span className="text-stone-600 font-medium">₹{deliveryFee}</span>
                    </div>
                  )}
                  {couponApplied && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-600 font-medium flex items-center gap-1">
                        <Tag size={12} /> {couponInput.toUpperCase()}
                      </span>
                      <span className="text-green-600 font-bold">−₹{couponDiscount}</span>
                    </div>
                  )}
                  <div className="h-px bg-stone-100" />
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-stone-500 text-sm font-medium">Total</span>
                <div className="text-right">
                  {couponApplied && (
                    <p className="text-xs text-stone-400 line-through">₹{(subtotal + deliveryFee).toFixed(0)}</p>
                  )}
                  <span className="text-2xl font-bold text-stone-900">₹{total.toFixed(0)}</span>
                </div>
              </div>

              {belowMin && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  Minimum order is ₹{minOrderAmount}. Add ₹{(minOrderAmount - subtotal).toFixed(0)} more to proceed.
                </p>
              )}

              {/* Error with retry */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 space-y-2">
                  <p className="text-xs text-red-600 font-medium">{error}</p>
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-1.5 text-xs font-bold text-red-600 active:scale-95 transition-all"
                  >
                    <RotateCcw size={12} /> Try again
                  </button>
                </div>
              )}

              {outOfStock.length > 0 && (
                <p className="text-xs text-center text-red-500 font-medium">
                  Remove out-of-stock items before checking out
                </p>
              )}

              {showCF && (
                <button
                  onClick={() => handleCheckout('cashfree')}
                  disabled={loading || belowMin || outOfStock.length > 0}
                  className="w-full text-white rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 55%, #B45309 100%)',
                    boxShadow: '0 6px 24px rgba(217,119,6,0.4)',
                  }}
                >
                  {loading && checkoutMode === 'cashfree'
                    ? <><Loader2 size={18} className="animate-spin" /> {payStep || 'Processing…'}</>
                    : <><ShieldCheck size={18} /> Pay ₹{total.toFixed(0)} Online</>
                  }
                </button>
              )}

              {showCOD && (
                <button
                  onClick={() => handleCheckout('cod')}
                  disabled={loading || belowMin || outOfStock.length > 0}
                  className="w-full rounded-2xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
                  style={{ background: '#FFFBEB', border: '2px solid #FDE68A', color: '#78350F' }}
                >
                  {loading && checkoutMode === 'cod'
                    ? <><Loader2 size={16} className="animate-spin" /> {slowConn ? 'Waking server up…' : 'Placing order…'}</>
                    : <><Banknote size={16} /> Cash on Delivery</>
                  }
                </button>
              )}
              {loading && slowConn && (
                <p className="text-center text-xs text-stone-400">
                  Server is waking up from sleep — this usually takes under 30s
                </p>
              )}

              <p className="text-center text-xs text-stone-400">🔒 Secure · Cut fresh after order</p>
            </div>
          )}
        </div>
      </div>

      <AddressSheet
        open={addressOpen}
        onClose={() => setAddressOpen(false)}
        onConfirm={onAddressConfirmed}
        savedPincode={savedPincode}
      />
    </>
  )
}
