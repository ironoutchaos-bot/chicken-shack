'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { trackFunnelEvent } from '@/lib/analytics-client'

type ThankYouStatus = 'verifying' | 'success' | 'failed'

type PendingPaymentMeta = {
  cashfreeOrderId?: string | null
  realOrderId?: string | null
  total?: number | string | null
  currency?: string | null
  coupon?: string | null
  paymentType?: string | null
  cart?: Array<{
    productId?: string | null
    id?: string | null
    name?: string
    pricePerKg?: number | string | null
    quantity?: number | string | null
  }>
}

type ConfirmedOrder = {
  id?: string | null
  total_amount?: number | string | null
  items?: PendingPaymentMeta['cart']
  coupon_code?: string | null
  razorpay_order_id?: string | null
}

declare global {
  interface Window {
    dataLayer?: any[]
  }
}

function readPendingPayment(): PendingPaymentMeta {
  try {
    return JSON.parse(localStorage.getItem('bf-pending-payment') || '{}') || {}
  } catch {
    return {}
  }
}

function firePurchase(orderId: string, meta: PendingPaymentMeta) {
  try {
    const txnId = meta.realOrderId || meta.cashfreeOrderId || orderId

    if (!txnId) {
      console.warn('[thank-you] no transaction id, skipping purchase')
      return
    }

    const items = Array.isArray(meta.cart)
      ? meta.cart.map((item, index) => ({
          item_id: String(item.productId ?? item.id ?? ''),
          item_name: item.name ?? '',
          price: Number(item.pricePerKg ?? 0),
          quantity: Number(item.quantity ?? 0),
          index,
        }))
      : []
    const savedValue = Number(meta.total)
    const itemValue = items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0,
    )
    const purchaseValue = Number.isFinite(savedValue) && savedValue > 0
      ? savedValue
      : Number(itemValue.toFixed(2))
    const currency = meta.currency || 'INR'

    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({ ecommerce: null })
    window.dataLayer.push({
      event: 'purchase',
      transaction_id: String(txnId),
      payment_type: meta.paymentType || 'Online',
      value: purchaseValue,
      currency,
      coupon: meta.coupon || undefined,
      ecommerce: {
        transaction_id: String(txnId),
        value: purchaseValue,
        currency,
        coupon: meta.coupon || undefined,
        items,
      },
    })
    trackFunnelEvent('order_completed')
  } catch (err) {
    console.error('[thank-you] purchase push failed:', err)
  }
}

function mergeServerOrderMeta(meta: PendingPaymentMeta, order?: ConfirmedOrder | null): PendingPaymentMeta {
  if (!order) return meta

  return {
    ...meta,
    cashfreeOrderId: meta.cashfreeOrderId || order.razorpay_order_id || null,
    realOrderId: order.id || meta.realOrderId || null,
    total: order.total_amount ?? meta.total,
    currency: meta.currency || 'INR',
    coupon: order.coupon_code || meta.coupon || null,
    cart: Array.isArray(order.items) && order.items.length > 0 ? order.items : meta.cart,
  }
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 3C9 3 3.3 8.7 3.3 15.7c0 2.5.7 4.9 1.9 7L3 29l6.5-2.1c2 1.1 4.3 1.7 6.5 1.7 7 0 12.7-5.7 12.7-12.7S23 3 16 3zm0 23.1c-2 0-3.9-.5-5.6-1.5l-.4-.2-3.9 1.2 1.2-3.8-.3-.4c-1.1-1.7-1.6-3.7-1.6-5.7 0-5.8 4.8-10.6 10.6-10.6S26.6 9.9 26.6 15.7 21.8 26.1 16 26.1zm5.9-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1c-1.8-.9-3-1.6-4.2-3.6-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.6s-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.4-1.2 1.2-1.2 2.8s1.2 3.3 1.4 3.5c.2.2 2.4 3.7 5.9 5.2 2.2.9 3 1 4.1.9.7-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z" />
    </svg>
  )
}

function CheckMark({ active }: { active: boolean }) {
  return (
    <div className={`thank-preview-check ${active ? 'is-active' : 'is-waiting'}`} aria-hidden="true">
      <svg viewBox="0 0 44 44">
        <path d="M12 23 l7 7 l14 -16" />
      </svg>
    </div>
  )
}

export default function ThankYouPage() {
  const [status, setStatus] = useState<ThankYouStatus>('verifying')
  const [message, setMessage] = useState('Confirming your payment...')
  const trackedRef = useRef(false)
  const confettiRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const isCod = params.get('cod') === '1'
    const orderId = params.get('order_id') || params.get('cashfree_order_id')

    if (!orderId) {
      setStatus('failed')
      setMessage(isCod ? 'Order reference is missing.' : 'Payment reference is missing.')
      return
    }

    if (isCod) {
      const meta = readPendingPayment()
      if (!trackedRef.current) {
        trackedRef.current = true
        firePurchase(orderId, { ...meta, paymentType: meta.paymentType || 'COD' })
      }
      localStorage.removeItem('bf-pending-payment')
      setStatus('success')
      setMessage('Your order is confirmed.')
      return
    }

    const paymentOrderId = orderId
    let cancelled = false

    async function verifyAndTrack() {
      const meta = readPendingPayment()

      for (let attempt = 1; attempt <= 3; attempt++) {
        if (cancelled) return

        try {
          if (attempt > 1) {
            setMessage('Still confirming your payment...')
            await new Promise(resolve => setTimeout(resolve, 2500 * attempt))
          }

          const verify = await fetch('/api/cashfree/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: paymentOrderId }),
          })

          if (!verify.ok) {
            if (attempt < 3) continue
            setStatus('failed')
            setMessage('We could not confirm your payment yet.')
            return
          }

          const patch = await fetch('/api/orders/cod', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cashfree_order_id: paymentOrderId,
              payment_status: 'paid',
            }),
          })

          if (patch.ok) {
            const patchData = await patch.json().catch(() => null)
            const purchaseMeta = mergeServerOrderMeta(meta, patchData?.order ?? null)
            if (!trackedRef.current) {
              trackedRef.current = true
              firePurchase(paymentOrderId, purchaseMeta)
            }
            localStorage.removeItem('bf-pending-payment')
            setStatus('success')
            setMessage('Your order is confirmed.')
            return
          }
        } catch (err) {
          console.warn('[thank-you] verify attempt failed:', err)
        }
      }

      if (!cancelled) {
        setStatus('failed')
        setMessage('We could not confirm your payment yet.')
      }
    }

    verifyAndTrack()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (status !== 'success') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const canvas = confettiRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const confettiCanvas = canvas
    const confettiCtx = ctx

    let animation = 0
    const colors = ['#8EEA2F', '#b6f95a', '#7308b0', '#60079d', '#ffffff', '#4c0381']
    const pieces = Array.from({ length: 140 }, (_, index) => ({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 140,
      y: window.innerHeight * 0.24,
      vx: (Math.random() - 0.5) * 9,
      vy: Math.random() * -11 - 4,
      g: 0.28 + Math.random() * 0.12,
      s: 5 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      col: colors[index % colors.length],
    }))

    function size() {
      confettiCanvas.width = window.innerWidth
      confettiCanvas.height = window.innerHeight
    }

    let start = 0
    const duration = 2800

    function frame(time: number) {
      if (!start) start = time
      const elapsed = time - start
      const alpha = Math.max(0, 1 - elapsed / duration)
      let alive = false

      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height)
      for (const piece of pieces) {
        piece.vy += piece.g
        piece.x += piece.vx
        piece.y += piece.vy
        piece.rot += piece.vr
        if (alpha > 0 && piece.y < confettiCanvas.height + 30) alive = true
        confettiCtx.save()
        confettiCtx.globalAlpha = alpha
        confettiCtx.translate(piece.x, piece.y)
        confettiCtx.rotate(piece.rot)
        confettiCtx.fillStyle = piece.col
        confettiCtx.fillRect(-piece.s / 2, -piece.s / 2, piece.s, piece.s * 0.6)
        confettiCtx.restore()
      }

      if (alive && elapsed < duration) animation = requestAnimationFrame(frame)
      else confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height)
    }

    size()
    window.addEventListener('resize', size)
    animation = requestAnimationFrame(frame)

    return () => {
      window.removeEventListener('resize', size)
      cancelAnimationFrame(animation)
    }
  }, [status])

  const isSuccess = status === 'success'
  const isFailed = status === 'failed'

  return (
    <main className="thank-preview-page">
      <link
        href="https://fonts.googleapis.com/css2?family=League+Spartan:wght@700;800&family=Manrope:wght@400;500;600;700&family=IBM+Plex+Sans:wght@500;600&display=swap"
        rel="stylesheet"
      />

      <div className="thank-preview-nav-wrap">
        <nav className="thank-preview-nav">
          <Link className="thank-preview-logo" href="/">
            B&apos;<em>LURU</em> FRESH
          </Link>
          <div className="thank-preview-nav-r">
            <Link href="/#why">Why</Link>
            <Link href="/#process">Process</Link>
            <Link href="/#menu">Menu</Link>
            <Link className="thank-preview-nav-cart" href="/order-history?tab=current">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="9" cy="20.5" r="1.7" fill="currentColor" />
                <circle cx="18" cy="20.5" r="1.7" fill="currentColor" />
                <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M2.5 3.5h3l2.4 11.6a1.2 1.2 0 0 0 1.2 1h8.6a1.2 1.2 0 0 0 1.2-.95L21 7.5H6.2" />
              </svg>
              Orders
            </Link>
            <Link className="thank-preview-nav-btn" href="/">
              Shop Again
              <svg className="thank-preview-cart-ic" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="9" cy="20.5" r="1.7" fill="#fff" />
                <circle cx="18" cy="20.5" r="1.7" fill="#fff" />
                <path fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M2.5 3.5h3l2.4 11.6a1.2 1.2 0 0 0 1.2 1h8.6a1.2 1.2 0 0 0 1.2-.95L21 7.5H6.2" />
              </svg>
            </Link>
          </div>
        </nav>
      </div>

      <section className={`thank-preview-hero ${isFailed ? 'is-failed' : ''}`} aria-live="polite">
        <div className="thank-preview-bg-word">FRESH</div>
        <span className="thank-preview-spice s1">🌿</span>
        <span className="thank-preview-spice s2">🌶️</span>
        <span className="thank-preview-spice s3">🧄</span>
        <span className="thank-preview-spice s4">🌿</span>

        <div className="thank-preview-hero-inner">
          <div className="thank-preview-pill">
            <span className="dot" />
            {isSuccess ? 'Order Confirmed Successfully' : isFailed ? 'Payment Check Needed' : 'Confirming Payment Securely'}
          </div>

          <CheckMark active={isSuccess} />

          <h1 className="thank-preview-title">
            {isSuccess ? (
              <>
                Thank You -
                <br />
                It&apos;s <span>Confirmed!</span>
              </>
            ) : isFailed ? (
              <>
                Payment
                <br />
                <span>Not Confirmed</span>
              </>
            ) : (
              <>
                Confirming
                <br />
                <span>Your Order</span>
              </>
            )}
          </h1>

          <p className="thank-preview-sub">
            {isSuccess
              ? (
                  <>
                    Your order is in and we&apos;re already sharpening the knives. Your chicken is being{' '}
                    <strong>cut fresh right now</strong> and delivered in{' '}
                    <strong>under 60 minutes</strong> across Yelahanka. Track live updates from the Orders page.
                  </>
                )
              : isFailed
                ? `${message} If money was deducted, contact us and we will sort it out.`
                : message}
          </p>

          <div className="thank-preview-hero-ctas">
            <Link className="thank-preview-hero-btn primary" href="/order-history?tab=current">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path fill="none" stroke="#1b3d06" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 2.5M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z" />
              </svg>
              Track My Order
            </Link>
            <Link className="thank-preview-hero-btn ghost" href="/">
              ← Back to Shopping
            </Link>
          </div>
        </div>

        <div className="thank-preview-wave" aria-hidden="true">
          <svg viewBox="0 0 1440 70" preserveAspectRatio="none">
            <path fill="#FAF7F0" d="M0,32 C240,72 480,8 720,24 C960,40 1200,72 1440,40 L1440,70 L0,70 Z" />
          </svg>
        </div>
      </section>

      <section className="thank-preview-body">
        <div className="thank-preview-panel">
          <div className="thank-preview-steps">
            <div className="thank-preview-step">
              <div className="num">Step 01</div>
              <div className="ic">🔪</div>
              <div className="t">Cut Fresh</div>
              <div className="d">Sliced only after your order - never pre-cut, never stored.</div>
            </div>
            <div className="thank-preview-step">
              <div className="num">Step 02</div>
              <div className="ic">📦</div>
              <div className="t">Sealed Clean</div>
              <div className="d">Hygienically packed and sterile-sealed for the ride.</div>
            </div>
            <div className="thank-preview-step">
              <div className="num">Step 03</div>
              <div className="ic">🏍️</div>
              <div className="t">On The Way</div>
              <div className="d">At your door in under 60 minutes, ultra-fresh.</div>
            </div>
          </div>

          <div className="thank-preview-divider" />

          <div className="thank-preview-trust">
            <span>🛡️ FSSAI Lic. 11226331000344</span>
            <span>🌿 Zero Preservatives</span>
            <span>✓ Cut After Order</span>
          </div>

          <p className="thank-preview-callline">
            Need help with your order? Call us at <a href="tel:+917012488951">+91 70124 88951</a>
          </p>
        </div>
      </section>

      <footer className="thank-preview-footer">
        © 2026 <span>B&apos;LURU Fresh</span> · The Chicken Shack ·{' '}
        <a href="mailto:admin@blurufresh.com">admin@blurufresh.com</a>
      </footer>

      <a
        className="thank-preview-wa-float"
        href="https://wa.me/917012488951"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
      >
        <WhatsAppIcon />
      </a>

      <canvas ref={confettiRef} className="thank-preview-confetti" />
    </main>
  )
}
