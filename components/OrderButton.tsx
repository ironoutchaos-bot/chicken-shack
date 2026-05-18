'use client'

import { useState, useEffect, useCallback } from 'react'

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open(): void }
  }
}

interface RazorpayOptions {
  key: string; amount: number; currency: string; name: string
  description: string; order_id: string
  handler: (response: RazorpayResponse) => void
  prefill?: { name?: string; contact?: string }
  theme?: { color?: string }
  modal?: { ondismiss?: () => void }
}

interface RazorpayResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface Props {
  productId:   string
  productName: string
  pricePerKg:  number   // 0 means "call for price" → WhatsApp inside modal
  dark?:       boolean
}

const PHONE = '917259516664'
const whatsappHref = (item: string, qty?: number) =>
  `https://wa.me/${PHONE}?text=${encodeURIComponent(
    qty
      ? `Hi B'LURU Fresh, I want to order ${qty} kg of ${item}.`
      : `Hi B'LURU Fresh, I want to order ${item}.`
  )}`

export default function OrderButton({ productId, productName, pricePerKg, dark = false }: Props) {
  const [open,    setOpen]    = useState(false)
  const [qty,     setQty]     = useState(0.5)
  const [phone,   setPhone]   = useState('')
  const [name,    setName]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)
  const [rzpReady, setRzpReady] = useState(false)

  // Pre-load Razorpay script as soon as component mounts
  useEffect(() => {
    if (window.Razorpay) { setRzpReady(true); return }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.async = true
    s.onload  = () => setRzpReady(true)
    document.body.appendChild(s)
  }, [])

  const totalPaise = Math.round(pricePerKg * qty * 100)
  const hasPrice   = pricePerKg > 0

  function openModal() {
    setOpen(true); setSuccess(false); setError('')
    setQty(0.5); setPhone(''); setName('')
  }

  const handlePay = useCallback(async () => {
    if (!phone || phone.length < 10) { setError('Enter a valid 10-digit phone number'); return }
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_paise: totalPaise, product_id: productId, product_name: productName, quantity_kg: qty }),
      })
      if (!res.ok) throw new Error('Order creation failed')
      const { order_id, amount, currency } = await res.json()

      const rzp = new window.Razorpay({
        key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount, currency,
        name:        "B'LURU Fresh",
        description: `${productName} — ${qty} kg`,
        order_id,
        prefill:     { name, contact: phone },
        theme:       { color: '#d97706' },
        handler: async (response: RazorpayResponse) => {
          const vRes = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          })
          if (vRes.ok) {
            setSuccess(true); setLoading(false)
            // Notify shop via WhatsApp
            const msg = encodeURIComponent(
              `New order!\nProduct: ${productName}\nQty: ${qty} kg\nAmount: ₹${(totalPaise/100).toFixed(0)}\nCustomer: ${name||'N/A'}\nPhone: ${phone}\nPayment: ${response.razorpay_payment_id}`
            )
            window.open(`https://wa.me/${PHONE}?text=${msg}`, '_blank')
          } else {
            setError('Payment verification failed. Please contact us.')
            setLoading(false)
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      })
      rzp.open()
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }, [phone, name, qty, totalPaise, productId, productName])

  return (
    <>
      {/* Always show the Order button — no WhatsApp fallback on the card */}
      <button
        className={dark ? 'btn-ghost btn-sm btn-ghost--light' : 'btn-primary btn-sm'}
        onClick={openModal}
      >
        <span>Order</span>
        <span className="btn-icon"><ArrowIcon /></span>
      </button>

      {open && (
        <div className="ob-backdrop" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="ob-modal" role="dialog" aria-modal="true">
            {success ? (
              <div className="ob-success">
                <span className="ob-success-icon">✓</span>
                <h3>Order Confirmed!</h3>
                <p>Payment received. A WhatsApp message has been sent to our team — we&apos;ll confirm delivery shortly.</p>
                <button className="ob-btn-primary" onClick={() => setOpen(false)}>Done</button>
              </div>
            ) : (
              <>
                <div className="ob-header">
                  <div>
                    <h3 className="ob-title">{productName}</h3>
                    <p className="ob-sub">
                      {hasPrice ? `₹${pricePerKg}/kg · Fresh order to cut` : 'Price on request · Fresh order to cut'}
                    </p>
                  </div>
                  <button className="ob-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
                </div>

                <div className="ob-body">
                  {/* Quantity */}
                  <label className="ob-label">Quantity</label>
                  <div className="ob-qty-row">
                    <button className="ob-qty-btn" onClick={() => setQty(q => Math.max(0.5, +(q-0.5).toFixed(1)))}>−</button>
                    <span className="ob-qty-val">{qty} kg</span>
                    <button className="ob-qty-btn" onClick={() => setQty(q => +(q+0.5).toFixed(1))}>+</button>
                  </div>

                  {hasPrice && (
                    <div className="ob-total">
                      <span>Total</span>
                      <span className="ob-total-amt">₹{(totalPaise/100).toFixed(0)}</span>
                    </div>
                  )}

                  {/* If no price set — WhatsApp order */}
                  {!hasPrice ? (
                    <>
                      <p style={{ fontSize: '0.875rem', color: 'var(--fg-muted)', marginTop: '0.25rem' }}>
                        Price not set yet. Tap below to enquire on WhatsApp.
                      </p>
                      <a
                        href={whatsappHref(productName, qty)}
                        target="_blank" rel="noopener noreferrer"
                        className="ob-btn-primary"
                        style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}
                        onClick={() => setOpen(false)}
                      >
                        Enquire on WhatsApp
                      </a>
                    </>
                  ) : (
                    <>
                      <label className="ob-label">Phone number <span className="ob-req">*</span></label>
                      <input
                        className="ob-input" type="tel" placeholder="10-digit mobile number"
                        maxLength={10} value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      />

                      <label className="ob-label">Name <span className="ob-opt">(optional)</span></label>
                      <input
                        className="ob-input" type="text" placeholder="Your name"
                        value={name} onChange={e => setName(e.target.value)}
                      />

                      {error && <p className="ob-error">{error}</p>}

                      <button
                        className="ob-btn-primary"
                        onClick={handlePay}
                        disabled={loading || !rzpReady}
                      >
                        {!rzpReady  ? 'Loading payment…'  :
                         loading    ? 'Opening payment…'  :
                         `Pay ₹${(totalPaise/100).toFixed(0)}`}
                      </button>

                      <p className="ob-secure">🔒 Secure payment via Razorpay</p>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

const ArrowIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17L17 7"/><path d="M7 7h10v10"/>
  </svg>
)
