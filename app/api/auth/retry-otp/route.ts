export const dynamic = 'force-dynamic'
export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'

const MSG91_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

function providerMessage(data: unknown) {
  if (!data || typeof data !== 'object') return 'OTP provider rejected the retry request'
  const body = data as { message?: unknown; code?: unknown; error?: unknown }
  const message = typeof body.message === 'string' ? body.message : ''
  const error = typeof body.error === 'string' ? body.error : ''
  const code = body.code !== undefined ? ` (${String(body.code)})` : ''
  return `${message || error || 'OTP provider rejected the retry request'}${code}`
}

export async function POST(req: NextRequest) {
  let body: { reqId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.reqId) {
    return NextResponse.json({ error: 'Missing OTP request ID' }, { status: 400 })
  }

  const MSG91_TOKEN = process.env.MSG91_TOKEN ?? ''
  const MSG91_WIDGET_ID = process.env.MSG91_WIDGET_ID ?? ''
  if (!MSG91_TOKEN || !MSG91_WIDGET_ID) {
    console.error('[retry-otp] MSG91_TOKEN or MSG91_WIDGET_ID env var missing')
    return NextResponse.json({ error: 'OTP service is not configured' }, { status: 503 })
  }

  let msg91Res: Response
  try {
    msg91Res = await fetch('https://api.msg91.com/api/v5/widget/retryOtp', {
      method: 'POST',
      headers: MSG91_HEADERS,
      body: JSON.stringify({
        tokenAuth: MSG91_TOKEN,
        widgetId: MSG91_WIDGET_ID,
        reqId: body.reqId,
        retryChannel: '11',
      }),
    })
  } catch (err) {
    console.error('[retry-otp] fetch error:', err)
    return NextResponse.json({ error: 'Failed to reach OTP provider' }, { status: 502 })
  }

  const data = await msg91Res.json()
  console.log('[retry-otp] MSG91 response:', data)

  if (data.type !== 'success') {
    console.error('[retry-otp] MSG91 rejected:', data)
    return NextResponse.json({ error: providerMessage(data), detail: data }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
