export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { drainMobilePush } from '@/lib/mobile-push'
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const provided = req.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret ?? ''}`
  if (
    !secret ||
    Buffer.byteLength(provided) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  )
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await drainMobilePush(10))
  } catch {
    return NextResponse.json(
      { error: 'Notification retry is temporarily unavailable' },
      { status: 503 }
    )
  }
}
