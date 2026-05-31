export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, type SessionData } from '@/lib/session'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  // Require authenticated session — prevents third parties creating orders
  // on the merchant's Cashfree account
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { amount_inr, customer_name, customer_email, customer_phone, return_url } = await req.json()

  if (!amount_inr || amount_inr < 1) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  // Use authenticated user ID from session — ignore any client-supplied customer_id
  const customer_id = session.userId

  const APP_ID  = process.env.CASHFREE_APP_ID
  const SECRET  = process.env.CASHFREE_SECRET_KEY
  if (!APP_ID || !SECRET) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 503 })
  }

  // Use a cryptographically random UUID to prevent order ID collisions/guessing
  const order_id = `cf_${randomUUID().replace(/-/g, '').slice(0, 16)}`

  const cfRes = await fetch('https://api.cashfree.com/pg/orders', {
    method: 'POST',
    headers: {
      'Content-Type':    'application/json',
      'x-api-version':   '2023-08-01',
      'x-client-id':     APP_ID,
      'x-client-secret': SECRET,
    },
    body: JSON.stringify({
      order_id,
      order_amount:   amount_inr,
      order_currency: 'INR',
      customer_details: {
        customer_id:    String(customer_id).slice(0, 50), // Cashfree max 50 chars
        customer_name:  customer_name  || 'Customer',
        customer_email: customer_email || `91${customer_phone}@blurufresh.com`,
        customer_phone: String(customer_phone || '9999999999').replace(/\D/g, '').slice(-10),
      },
      order_meta: {
        // return_url is optional; omit if not provided to avoid validation errors
        ...(return_url ? { return_url } : {}),
      },
    }),
  })

  const responseText = await cfRes.text()
  if (!cfRes.ok) {
    console.error('Cashfree create-order failed:', cfRes.status, responseText)
    return NextResponse.json({ error: 'Order creation failed', detail: responseText }, { status: 502 })
  }

  const data = JSON.parse(responseText)
  console.log('Cashfree order created:', data.order_id, 'session:', data.payment_session_id?.slice(0, 20) + '...')
  return NextResponse.json({
    order_id:           data.order_id,
    payment_session_id: data.payment_session_id,
  })
}
