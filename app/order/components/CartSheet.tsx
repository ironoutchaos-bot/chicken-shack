'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Minus, Plus, Trash2, ShoppingBag, Loader2, ShieldCheck, Banknote, AlertTriangle, RotateCcw, Tag, CheckCircle2 } from 'lucide-react'
import { type CartItem } from '@/lib/supabase-browser'
import { type AuthUser } from '@/lib/auth-types'
import AddressSheet, { type DeliveryAddress } from './AddressSheet'

type CheckoutMode = 'cashfree' | 'cod'

interface Props {
  open: boolean
  onClose: () => void
  cart: CartItem[]
  onUpdateQty: (productId: string, qty: number) => void
  onClear: () => void
  user: AuthUser | null
  authLoading?: boolean
  onLoginRequired: () => void
  onOrderPlaced: () => void
  savedPincode?: string
  onDeliveryAddressSaved?: (address: DeliveryAddress) => void
  minOrderAmount?: number
  deliveryFee?: number
}

// Formats a product's pack size using the admin-chosen unit (pc / g / kg).
function formatUnit(amount: number | null | undefined, unit?: string | null): string {
  if (!amount) return ''
  const u = unit ?? 'g'
  if (u === 'pc') return `${amount} pc${amount > 1 ? 's' : ''}`
  if (u === 'kg') return `${amount % 1 === 0 ? amount : amount.toFixed(2)} kg`
  return `${amount}g`
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
  user, authLoading = false, onLoginRequired, onOrderPlaced, savedPincode,
  onDeliveryAddressSaved,
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
  const [storeOpen,      setStoreOpen]      = useState(true)
  const [outOfStock,     setOutOfStock]     = useState<string[]>([])
  const [weightMap,      setWeightMap]      = useState<Record<string, number | null>>({})
  const [unitMap,        setUnitMap]        = useState<Record<string, string>>({})
  const [lastAddr,       setLastAddr]       = useState<DeliveryAddress | null>(null)

  // Coupon state
  const [couponInput,    setCouponInput]    = useState('')
  const [couponApplied,  setCouponApplied]  = useState(false)
  const [couponError,    setCouponError]    = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponLabel,    setCouponLabel]    = useState('')
  const couponInputRef    = useRef<HTMLInputElement>(null)
  const checkoutOpenedRef = useRef(false)

  const subtotal   = cart.reduce((s, c) => s + c.pricePerKg * c.quantity, 0)
  const discount   = couponApplied ? couponDiscount : 0
  const total      = Math.max(0, subtotal + deliveryFee - discount)
  const totalPaise = Math.round(total * 100)
  const belowMin   = minOrderAmount > 0 && subtotal < minOrderAmount
  const morningPreorderActive = !storeOpen
  const morningPreorderNote = morningPreorderActive
    ? 'Store closed night preorder: deliver fresh between 7 AM - 9 AM.'
    : null

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
    fetch('/api/settings', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        setCodEnabled(d.cod_enabled !== false)
        setCfEnabled(d.cashfree_enabled !== false)
        setStoreOpen(d.store_open !== false)
      })
      .catch(() => {})

    // Out-of-stock check
    if (cart.length > 0) {
      fetch('/api/products', { cache: 'no-store' })
        .then(r => r.json())
        .then((products: { id: string; stock_quantity: number; name: string; weight_per_unit: number | null }[]) => {
          const oos = cart
            .filter(item => {
              const p = products.find(p => p.id === item.productId)
              return p && p.stock_quantity === 0
            })
            .map(item => item.name)
          setOutOfStock(oos)

          const wmap: Record<string, number | null> = {}
          for (const p of products) wmap[p.id] = p.weight_per_unit ?? null
          setWeightMap(wmap)
        })
        .catch(() => {})

      // Per-product display units (pc / g / kg) chosen by the admin
      fetch('/api/settings', { cache: 'no-store' })
        .then(r => r.json())
        .then(d => setUnitMap(d?.product_units && typeof d.product_units === 'object' ? d.product_units : {}))
        .catch(() => {})
    } else {
      setOutOfStock([])
    }
  }, [open, cart])

  useEffect(() => {
    if (open) {
      if (!checkoutOpenedRef.current) {
        checkoutOpenedRef.current = true
        window.dataLayer = window.dataLayer || []
        window.dataLayer.push({ ecommerce: null })
        window.dataLayer.push({
          event: 'begin_checkout',
          ecommerce: {
            value: total,
            coupon: couponApplied ? couponInput.trim().toUpperCase() : null,
            currency: 'INR',
            items: cart.map(c => ({
              item_id: c.productId,
              item_name: c.name,
              price: c.pricePerKg,
              quantity: c.quantity
            }))
          }
        })
      }
    } else {
      checkoutOpenedRef.current = false
    }
  }, [open])

  const showCOD = codEnabled
  const showCF  = cfEnabled

  function handleCheckout(mode: CheckoutMode) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({
      event: 'add_payment_info',
      payment_type: mode === 'cod' ? 'COD' : 'Online',
      ecommerce: {
        payment_type: mode === 'cod' ? 'COD' : 'Online',
        value: total,
        coupon: couponApplied ? couponInput.trim().toUpperCase() : null,
        currency: 'INR',
        items: cart.map(c => ({
          item_id: c.productId,
          item_name: c.name,
          price: c.pricePerKg,
          quantity: c.quantity
        }))
      }
    });

    if (!user && !authLoading) { onClose(); onLoginRequired(); return }
    if (!user && authLoading) return  // still loading — ignore tap, spinner shows
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
      // Derive base URL from the current window so staging/dev redirects work too
      const baseUrl   = typeof window !== 'undefined' ? window.location.origin : 'https://blurufresh.com'
      const returnUrl = `${baseUrl}/thank-you?cashfree_order_id={order_id}`

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
            notes:             morningPreorderNote,
            customer_phone:    deliveryAddress.customerPhone || null,
            customer_name:     deliveryAddress.customerName  || null,
            coupon_code:       couponApplied ? couponInput.trim().toUpperCase() : null,
            coupon_discount:   couponApplied ? couponDiscount : 0,
          }),
        }),
        20_000,
        'Server took too long — please try again.'
      )
      const dbData = await dbRes.json().catch(() => ({}))
      if (!dbRes.ok) {
        throw new Error(dbData.error ?? `Failed to save order (${dbRes.status})`)
      }
      const realOrderId = dbData.id

      // Store cashfree order ID and supporting tracking data for the thank-you conversion event.
      localStorage.setItem('bf-pending-payment', JSON.stringify({
        cashfreeOrderId: order_id,
        realOrderId,
        total,
        coupon: couponApplied ? couponInput.trim().toUpperCase() : null,
        cart,
        currency: 'INR'
      }))

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
            notes:            morningPreorderNote,
            customer_phone:   deliveryAddress.customerPhone || null,
            customer_name:    deliveryAddress.customerName  || null,
            coupon_code:      couponApplied ? couponInput.trim().toUpperCase() : null,
            coupon_discount:  couponApplied ? couponDiscount : 0,
          }),
        }),
        25_000,
        'The server took too long to respond. Supabase may be waking up — please try again in a moment.'
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error ?? `Server error ${res.status}`)
      }
      stopSlowTimer(slowTimer)

      // Fire GTM purchase event for COD
      const realOrderId = data.id
      window.dataLayer = window.dataLayer || []
      window.dataLayer.push({ ecommerce: null })
      window.dataLayer.push({
        event: 'purchase',
        payment_type: 'COD',
        ecommerce: {
          transaction_id: realOrderId,
          value: total,
          coupon: couponApplied ? couponInput.trim().toUpperCase() : null,
          currency: 'INR',
          items: cart.map(c => ({
            item_id: c.productId,
            item_name: c.name,
            price: c.pricePerKg,
            quantity: c.quantity
          }))
        }
      })

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
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({
      event: 'add_shipping_info',
      ecommerce: {
        value: total,
        coupon: couponApplied ? couponInput.trim().toUpperCase() : null,
        currency: 'INR',
        items: cart.map(c => ({
          item_id: c.productId,
          item_name: c.name,
          price: c.pricePerKg,
          quantity: c.quantity
        }))
      }
    });

    onDeliveryAddressSaved?.(addr)
    if (checkoutMode === 'cod') proceedCOD(addr)
    else proceedCashfree(addr)
  }

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-[2147483000] flex items-end justify-center"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />

        <div
          className="relative w-full max-w-[430px] animate-slide-up flex flex-col max-h-[90vh]"
          style={{ background: '#faf7f0', borderRadius: '28px 28px 0 0', paddingBottom: 'env(safe-area-inset-bottom, 1.5rem)', boxShadow: '0 -4px 40px rgba(0,0,0,.6)' }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(28,15,0,.12)' }} />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(22,20,15,.08)' }}>
            <div className="flex items-center gap-2.5">
              <ShoppingBag size={20} color="#91d852" strokeWidth={2.2} />
              <h2 className="text-lg font-black" style={{ fontFamily: "'Unbounded', sans-serif", letterSpacing: '-0.02em' }}>Your Cart</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#91d852', color: '#16140f' }}>
                {cart.reduce((s,c)=>s+c.quantity,0)} pc{cart.reduce((s,c)=>s+c.quantity,0)!==1?'s':''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button onClick={onClear} className="flex items-center gap-1 text-xs font-bold active:scale-95 transition-all" style={{ color: '#f87171' }}>
                  <Trash2 size={12} /> Clear
                </button>
              )}
              <button onClick={onClose} className="p-2 rounded-full transition-colors active:scale-90" style={{ background: 'rgba(22,20,15,.07)' }}>
                <X size={16} color="#6B4C2A" />
              </button>
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5" style={{ scrollbarWidth: 'none' }}>
            {morningPreorderActive && (
              <div
                className="rounded-3xl px-4 py-4"
                style={{
                  background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 48%, #fff7ed 100%)',
                  border: '2px solid rgba(217,119,6,.35)',
                  boxShadow: '0 14px 34px rgba(217,119,6,.22)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                    style={{
                      background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                      color: '#fff',
                      fontSize: 24,
                      boxShadow: '0 8px 20px rgba(217,119,6,.35)',
                    }}
                  >
                    🌙
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-sm font-black uppercase"
                      style={{ color: '#7c2d12', letterSpacing: '0.04em', lineHeight: 1.15 }}
                    >
                      Store is closed now
                    </p>
                    <p className="mt-1 text-[13px] font-bold leading-relaxed" style={{ color: '#1f110b' }}>
                      Your order will be cut fresh and delivered to you in the morning between{' '}
                      <span style={{ color: '#d97706', fontWeight: 900 }}>7 AM - 9 AM</span>.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <span className="text-5xl">🛒</span>
                <p className="text-sm font-medium" style={{ color: 'rgba(22,20,15,.35)' }}>Your cart is empty</p>
              </div>
            ) : (
              <>
                {cart.map(item => (
                  <div key={item.productId} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: '#fff', border: '1.5px solid rgba(22,20,15,.07)', boxShadow: '0 2px 8px rgba(22,20,15,.05)' }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: '#f2ede0' }}>
                      🍗
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate" style={{ color: '#1C0F00' }}>{item.name}</p>
                      <p className="text-xs" style={{ color: 'rgba(22,20,15,.4)' }}>₹{item.pricePerKg}{(() => { const w = formatUnit(weightMap[item.productId] ?? item.weightPerUnit, unitMap[item.productId]); return w ? ` · ${w}` : '' })()}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => onUpdateQty(item.productId, item.quantity - 1)} className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-all" style={{ background: '#f2ede0', border: '1px solid rgba(22,20,15,.1)' }}>
                        <Minus size={12} color="#6B4C2A" />
                      </button>
                      <span className="text-sm font-bold w-14 text-center" style={{ color: '#1C0F00' }}>{item.quantity} pc{item.quantity !== 1 ? 's' : ''}</span>
                      <button onClick={() => onUpdateQty(item.productId, item.quantity + 1)} className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-all" style={{ background: '#91d852' }}>
                        <Plus size={12} color="#16140f" />
                      </button>
                    </div>
                    <div className="text-right shrink-0 w-14">
                      <p className="text-sm font-bold" style={{ color: '#9318cc' }}>₹{item.pricePerKg * item.quantity}</p>
                    </div>
                  </div>
                ))}

                {outOfStock.length > 0 && (
                  <div className="flex items-start gap-2.5 rounded-2xl px-3.5 py-3" style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)' }}>
                    <AlertTriangle size={15} color="#f87171" className="shrink-0 mt-0.5" strokeWidth={2.2} />
                    <div>
                      <p className="text-xs font-bold" style={{ color: '#fca5a5' }}>Some items are now out of stock</p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#f87171' }}>{outOfStock.join(', ')} — remove them to proceed.</p>
                    </div>
                  </div>
                )}

                {/* Coupon */}
                <div>
                  <label className="flex items-center gap-1.5 mb-1.5" style={{ fontSize: 11, fontWeight: 700, color: 'rgba(22,20,15,.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    <Tag size={11} /> Coupon Code
                    <span style={{ color: 'rgba(22,20,15,.25)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>· optional</span>
                  </label>
                  {couponApplied ? (
                    <div className="flex items-center gap-2 rounded-2xl px-4 py-3" style={{ background: 'rgba(145,216,82,.1)', border: '1px solid rgba(145,216,82,.25)' }}>
                      <CheckCircle2 size={16} color="#91d852" className="shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold" style={{ color: '#91d852' }}>{couponInput.toUpperCase()}</p>
                        <p className="text-xs" style={{ color: 'rgba(145,216,82,.7)' }}>{couponLabel} applied — saving ₹{couponDiscount}</p>
                      </div>
                      <button onClick={removeCoupon} className="text-xs font-bold shrink-0" style={{ color: '#f87171' }}>Remove</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        ref={couponInputRef}
                        type="text" placeholder="Enter coupon code"
                        value={couponInput}
                        onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError('') }}
                        onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                        maxLength={20}
                        className="flex-1 rounded-2xl px-4 py-3 text-sm font-mono font-bold uppercase tracking-widest outline-none transition-colors placeholder:font-normal placeholder:tracking-normal placeholder:normal-case"
                        style={{ background: '#fff', border: '1.5px solid rgba(22,20,15,.12)', color: '#1C0F00' }}
                      />
                      <button onClick={applyCoupon} disabled={couponChecking} className="px-4 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 disabled:opacity-60" style={{ background: '#91d852', color: '#16140f', whiteSpace: 'nowrap' }}>
                        {couponChecking ? <Loader2 size={15} className="animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                  )}
                  {couponError && <p className="text-xs mt-1.5 ml-1" style={{ color: '#f87171' }}>{couponError}</p>}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {cart.length > 0 && (
            <div className="px-5 pt-3 pb-2 space-y-3" style={{ borderTop: '1px solid rgba(22,20,15,.08)' }}>
              <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'rgba(22,20,15,.4)' }}>Subtotal</span>
                    <span style={{ color: 'rgba(22,20,15,.6)', fontWeight: 500 }}>₹{subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'rgba(22,20,15,.4)' }}>Delivery fee</span>
                    {deliveryFee > 0 ? (
                      <span style={{ color: 'rgba(22,20,15,.6)', fontWeight: 500 }}>₹{deliveryFee}</span>
                    ) : (
                      <span style={{ color: '#6ab82e', fontWeight: 700 }}>FREE</span>
                    )}
                  </div>
                  {couponApplied && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 font-medium" style={{ color: '#91d852' }}><Tag size={12} /> {couponInput.toUpperCase()}</span>
                      <span className="font-bold" style={{ color: '#91d852' }}>−₹{couponDiscount}</span>
                    </div>
                  )}
                  <div className="h-px" style={{ background: 'rgba(22,20,15,.08)' }} />
                </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: 'rgba(22,20,15,.5)' }}>Total</span>
                <div className="text-right">
                  {couponApplied && <p className="text-xs line-through" style={{ color: 'rgba(22,20,15,.3)' }}>₹{(subtotal + deliveryFee).toFixed(0)}</p>}
                  <span className="text-2xl font-black" style={{ color: '#91d852', fontFamily: "'Unbounded', sans-serif" }}>₹{total.toFixed(0)}</span>
                </div>
              </div>

              {belowMin && (
                <p className="text-xs rounded-xl p-3" style={{ background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.2)', color: '#fbbf24' }}>
                  Minimum order is ₹{minOrderAmount}. Add ₹{(minOrderAmount - subtotal).toFixed(0)} more to proceed.
                </p>
              )}

              {error && (
                <div className="rounded-xl px-3 py-2.5 space-y-2" style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)' }}>
                  <p className="text-xs font-medium" style={{ color: '#fca5a5' }}>{error}</p>
                  <button onClick={handleRetry} className="flex items-center gap-1.5 text-xs font-bold active:scale-95 transition-all" style={{ color: '#f87171' }}>
                    <RotateCcw size={12} /> Try again
                  </button>
                </div>
              )}

              {outOfStock.length > 0 && <p className="text-xs text-center font-medium" style={{ color: '#f87171' }}>Remove out-of-stock items before checking out</p>}

              {showCF && (
                <button
                  onClick={() => handleCheckout('cashfree')}
                  disabled={loading || belowMin || outOfStock.length > 0}
                  className="w-full text-white rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #9318cc 0%, #7b14ab 55%, #5b0e80 100%)', boxShadow: '0 6px 24px rgba(147,24,204,0.45)', fontFamily: "'Unbounded', sans-serif", fontSize: 12, letterSpacing: '0.04em' }}
                >
                  {loading && checkoutMode === 'cashfree'
                    ? <><Loader2 size={18} className="animate-spin" /> {payStep || 'Processing…'}</>
                    : <><ShieldCheck size={18} /> Pay ₹{total.toFixed(0)} Online</>}
                </button>
              )}

              {showCOD && (
                <button
                  onClick={() => handleCheckout('cod')}
                  disabled={loading || belowMin || outOfStock.length > 0}
                  className="w-full rounded-2xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
                  style={{ background: 'rgba(145,216,82,.1)', border: '1.5px solid rgba(145,216,82,.3)', color: '#91d852', fontFamily: "'DM Mono', monospace", letterSpacing: '0.06em' }}
                >
                  {loading && checkoutMode === 'cod'
                    ? <><Loader2 size={16} className="animate-spin" /> {slowConn ? 'Waking server up…' : 'Placing order…'}</>
                    : <><Banknote size={16} /> Cash on Delivery</>}
                </button>
              )}

              {loading && slowConn && <p className="text-center text-xs" style={{ color: 'rgba(22,20,15,.35)' }}>Server is waking up — usually under 30s</p>}
              <p className="text-center text-xs" style={{ color: 'rgba(22,20,15,.3)' }}>🔒 Secure · Cut fresh after order</p>
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
