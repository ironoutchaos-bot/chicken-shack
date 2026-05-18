export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { amount_paise, product_id, product_name, quantity_kg } = await req.json()

  if (!amount_paise || amount_paise < 100) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  const KEY_ID     = process.env.RAZORPAY_KEY_ID
  const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET
  if (!KEY_ID || !KEY_SECRET) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 503 })
  }

  const receipt = `bf_${product_id}_${Date.now()}`
  const auth    = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')

  const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount:   amount_paise,
      currency: 'INR',
      receipt,
      notes: { product_id, product_name, quantity_kg },
    }),
  })

  if (!rzpRes.ok) {
    const err = await rzpRes.text()
    console.error('Razorpay error:', err)
    return NextResponse.json({ error: 'Order creation failed' }, { status: 502 })
  }

  const order = await rzpRes.json()
  return NextResponse.json({ order_id: order.id, amount: order.amount, currency: order.currency })
}
