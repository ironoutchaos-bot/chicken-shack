export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/feedback-notify
 *
 * Called by Vercel Cron every 5 minutes.
 * Finds orders that were delivered 50–80 minutes ago, haven't been
 * asked for feedback yet, and haven't already had feedback submitted,
 * then sends a push notification asking for a rating.
 *
 * Secured with CRON_SECRET env var (set in Vercel dashboard).
 * Vercel automatically passes it as: Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server'
import { notifyUserFeedbackRequest } from '@/lib/push-notify'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function srvHeaders(extras?: Record<string, string>) {
  return {
    'apikey':        SUPA_SRV(),
    'Authorization': `Bearer ${SUPA_SRV()}`,
    'Content-Type':  'application/json',
    ...extras,
  }
}

export async function GET(req: NextRequest) {
  // Verify cron secret when set
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // Window: orders delivered between 50 and 80 minutes ago
  const now     = new Date()
  const ago50   = new Date(now.getTime() - 50 * 60 * 1000).toISOString()
  const ago80   = new Date(now.getTime() - 80 * 60 * 1000).toISOString()

  const res = await fetch(
    `${SUPA_URL()}/rest/v1/orders` +
    `?order_status=eq.delivered` +
    `&feedback_notified_at=is.null` +
    `&feedback_at=is.null` +
    `&updated_at=gte.${encodeURIComponent(ago80)}` +
    `&updated_at=lte.${encodeURIComponent(ago50)}` +
    `&select=id,user_id,customer_name`,
    { headers: srvHeaders() }
  )

  if (!res.ok) {
    const err = await res.text()
    console.error('[cron/feedback-notify] DB fetch error:', err)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const orders: { id: string; user_id: string; customer_name: string | null }[] = await res.json().catch(() => [])

  let notified = 0
  for (const order of orders) {
    try {
      // Send push notification
      await notifyUserFeedbackRequest(order.user_id, order.id)

      // Mark as notified so we don't send again
      await fetch(
        `${SUPA_URL()}/rest/v1/orders?id=eq.${encodeURIComponent(order.id)}`,
        {
          method:  'PATCH',
          headers: srvHeaders({ 'Prefer': 'return=minimal' }),
          body:    JSON.stringify({ feedback_notified_at: new Date().toISOString() }),
        }
      )
      notified++
    } catch (err) {
      console.error('[cron/feedback-notify] Failed for order', order.id, err)
    }
  }

  console.log(`[cron/feedback-notify] Notified ${notified}/${orders.length} orders`)
  return NextResponse.json({ ok: true, notified, checked: orders.length })
}
