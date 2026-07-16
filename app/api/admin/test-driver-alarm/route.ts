export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/test-driver-alarm
 *   Admin-only. Sends a test "new order" push to every registered driver so they
 *   can confirm their phone rings / vibrates. Returns how many drivers were sent.
 */

import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/app/api/admin/login/route'
import { notifyAllDrivers } from '@/lib/push-notify'

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await notifyAllDrivers(`test-${Date.now()}`, true)
    console.log('[test-driver-alarm] result:', JSON.stringify(result))
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
