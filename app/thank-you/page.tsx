'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, PhoneCall, TriangleAlert } from 'lucide-react'

type ThankYouStatus = 'verifying' | 'success' | 'failed'

type PendingPaymentMeta = {
  cashfreeOrderId?: string | null
  realOrderId?: string | null
  total?: number | string | null
  currency?: string | null
  coupon?: string | null
  cart?: Array<{
    productId?: string | null
    id?: string | null
    name?: string
    pricePerKg?: number | string | null
    quantity?: number | string | null
  }>
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

    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({ ecommerce: null })
    window.dataLayer.push({
      event: 'purchase',
      payment_type: 'Online',
      ecommerce: {
        transaction_id: String(txnId),
        value: Number(meta.total ?? 0),
        currency: meta.currency || 'INR',
        coupon: meta.coupon || undefined,
        items,
      },
    })
  } catch (err) {
    console.error('[thank-you] purchase push failed:', err)
  }
}

export default function ThankYouPage() {
  const [status, setStatus] = useState<ThankYouStatus>('verifying')
  const [message, setMessage] = useState('Confirming your payment...')
  const trackedRef = useRef(false)

  useEffect(() => {
    const orderId = new URLSearchParams(window.location.search).get('cashfree_order_id')

    if (!orderId) {
      setStatus('failed')
      setMessage('Payment reference is missing.')
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
            if (!trackedRef.current) {
              trackedRef.current = true
              firePurchase(paymentOrderId, meta)
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

  return (
    <main className="thank-you-page">
      <section className="thank-you-card" aria-live="polite">
        {status === 'verifying' && (
          <>
            <span className="thank-you-icon verifying">
              <Loader2 size={36} strokeWidth={2.5} />
            </span>
            <p className="thank-you-kicker">Payment received</p>
            <h1>Confirming your order...</h1>
            <p>{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <span className="thank-you-icon success">
              <CheckCircle2 size={38} strokeWidth={2.5} />
            </span>
            <p className="thank-you-kicker">B'LURU FRESH</p>
            <h1>Thank you! Your order is confirmed.</h1>
            <p>We are cutting your chicken fresh right now.</p>
            <Link className="thank-you-button" href="/">
              Back to home
            </Link>
          </>
        )}

        {status === 'failed' && (
          <>
            <span className="thank-you-icon failed">
              <TriangleAlert size={36} strokeWidth={2.5} />
            </span>
            <p className="thank-you-kicker">Payment check needed</p>
            <h1>We could not confirm your payment.</h1>
            <p>{message} If money was deducted, contact us and we will sort it out.</p>
            <a className="thank-you-button" href="tel:+918129545535">
              <PhoneCall size={18} />
              Call B'LURU Fresh
            </a>
          </>
        )}
      </section>
    </main>
  )
}
