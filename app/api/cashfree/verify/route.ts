export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { order_id } = await req.json()

  if (!order_id) {
    return NextResponse.json({ error: 'Missing order_id' }, { status: 400 })
  }

  const APP_ID = process.env.CASHFREE_APP_ID
  const SECRET = process.env.CASHFREE_SECRET_KEY
  if (!APP_ID || !SECRET) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }

  const cfRes = await fetch(`https://api.cashfree.com/pg/orders/${order_id}`, {
    headers: {
      'x-api-version':   '2023-08-01',
      'x-client-id':     APP_ID,
      'x-client-secret': SECRET,
    },
  })

  if (!cfRes.ok) {
    const err = await cfRes.text()
    console.error('Cashfree verify error:', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 502 })
  }

  const data = await cfRes.json()

  if (data.order_status !== 'PAID') {
    return NextResponse.json({ error: `Payment not completed: ${data.order_status}` }, { status: 400 })
  }

  return NextResponse.json({ verified: true, cf_order_id: data.cf_order_id })
}
