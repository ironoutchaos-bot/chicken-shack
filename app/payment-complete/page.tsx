'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function PaymentCompleteInner() {
  const params      = useSearchParams()
  const orderId     = params.get('order_id') ?? ''
  const orderStatus = params.get('order_status') ?? 'PENDING'
  const [redirected, setRedirected] = useState(false)

  useEffect(() => {
    const deepLink = `blurufresh://payment-complete?order_id=${encodeURIComponent(orderId)}&order_status=${encodeURIComponent(orderStatus)}`
    const timer = setTimeout(() => {
      window.location.href = deepLink
      setRedirected(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [orderId, orderStatus])

  const isPaid      = orderStatus === 'PAID'
  const isCancelled = orderStatus === 'CANCELLED' || orderStatus === 'USER_DROPPED'
  const isFailed    = orderStatus === 'FAILED'

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.icon}>
          {isPaid ? '✅' : isFailed ? '❌' : isCancelled ? '↩️' : '⏳'}
        </div>
        <h1 style={styles.title}>
          {isPaid      ? 'Payment Successful!'
          : isFailed   ? 'Payment Failed'
          : isCancelled? 'Payment Cancelled'
          :              'Payment Processing…'}
        </h1>
        <p style={styles.sub}>
          {isPaid
            ? 'Your order has been confirmed. Returning you to the app…'
            : isFailed
            ? 'Something went wrong. Returning you to the app…'
            : isCancelled
            ? 'You cancelled the payment. Returning you to the app…'
            : 'Please wait while we confirm your payment…'}
        </p>
        {redirected && (
          <a
            href={`blurufresh://payment-complete?order_id=${encodeURIComponent(orderId)}&order_status=${encodeURIComponent(orderStatus)}`}
            style={styles.btn}
          >
            ← Return to B&apos;luru Fresh
          </a>
        )}
      </div>
    </div>
  )
}

export default function PaymentCompletePage() {
  return (
    <Suspense fallback={
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.icon}>⏳</div>
          <h1 style={styles.title}>Payment Processing…</h1>
          <p style={styles.sub}>Please wait while we confirm your payment…</p>
        </div>
      </div>
    }>
      <PaymentCompleteInner />
    </Suspense>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight:       '100vh',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#FAFAF9',
    fontFamily:      '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding:         '24px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius:    '24px',
    padding:         '40px 32px',
    maxWidth:        '360px',
    width:           '100%',
    textAlign:       'center',
    boxShadow:       '0 4px 24px rgba(0,0,0,0.08)',
  },
  icon:  { fontSize: '56px', marginBottom: '16px' },
  title: { fontSize: '22px', fontWeight: '800', color: '#1C1917', margin: '0 0 8px' },
  sub:   { fontSize: '14px', color: '#78716C', lineHeight: '1.6', margin: '0 0 24px' },
  btn: {
    display:         'inline-block',
    backgroundColor: '#F59E0B',
    color:           '#1C1917',
    fontWeight:      '700',
    fontSize:        '14px',
    padding:         '12px 24px',
    borderRadius:    '12px',
    textDecoration:  'none',
  },
}
