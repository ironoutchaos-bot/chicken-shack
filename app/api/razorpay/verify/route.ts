export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json()

  const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET
  if (!KEY_SECRET) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }

  const body      = `${razorpay_order_id}|${razorpay_payment_id}`
  const expected  = crypto
    .createHmac('sha256', KEY_SECRET)
    .update(body)
    .digest('hex')

  if (expected !== razorpay_signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  return NextResponse.json({ verified: true })
}
