export const dynamic = 'force-dynamic'
export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'

const MSG91_HEADERS = {
  'Accept':       'application/json',
  'Content-Type': 'application/json',
}

export async function POST(req: NextRequest) {
  let body: { phone?: string; countryCode?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { phone, countryCode = '91' } = body

  if (!phone || !/^\d{10}$/.test(phone)) {
    return NextResponse.json({ error: 'Enter a valid 10-digit phone number' }, { status: 400 })
  }

  let msg91Res: Response
  try {
    msg91Res = await fetch('https://api.msg91.com/api/v5/widget/sendOtp', {
      method: 'POST',
      headers: MSG91_HEADERS,
      body: JSON.stringify({
        tokenAuth: process.env.MSG91_TOKEN,
        widgetId:  process.env.MSG91_WIDGET_ID,
        identifier: `${countryCode}${phone}`,
      }),
    })
  } catch (err) {
    console.error('[send-otp] fetch error:', err)
    return NextResponse.json({ error: 'Failed to reach OTP provider' }, { status: 502 })
  }

  const data = await msg91Res.json()
  console.log('[send-otp] MSG91 response:', data)

  if (data.type !== 'success') {
    console.error('[send-otp] MSG91 rejected:', data)
    return NextResponse.json({ error: 'Failed to send OTP', detail: data }, { status: 500 })
  }

  return NextResponse.json({ reqId: data.message })
}
