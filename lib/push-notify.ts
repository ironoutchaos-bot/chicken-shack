import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL    ?? 'mailto:thechickenshack00@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY  ?? '',
  process.env.VAPID_PRIVATE_KEY ?? ''
)

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
  placed:     { title: '🐔 Order Received!',       body: 'Your order has been placed. We\'re getting it ready.' },
  packed:     { title: '👨‍🍳 Being Packed',          body: 'Your fresh chicken is being packed right now!' },
  on_the_way: { title: '🛵 On the Way!',            body: 'Your order is out for delivery. See you soon!' },
  delivered:  { title: '✅ Delivered!',             body: 'Your order has been delivered. Enjoy your meal!' },
}

export async function notifyDriverAssignment(driverId: string, orderId: string) {
  const short = orderId.slice(0, 8).toUpperCase()

  const res = await fetch(
    `${SUPA_URL()}/rest/v1/driver_push_subscriptions?driver_id=eq.${encodeURIComponent(driverId)}&select=endpoint,p256dh,auth`,
    {
      headers: {
        'apikey':        SUPA_SRV(),
        'Authorization': `Bearer ${SUPA_SRV()}`,
      },
    }
  )
  if (!res.ok) return

  const subs: { endpoint: string; p256dh: string; auth: string }[] = await res.json()

  const payload = JSON.stringify({
    title: '🛵 New Order Assigned',
    body:  `Order #${short} has been assigned to you. Tap to view.`,
    icon:  '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    url:   '/driver',
  })

  await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      ).catch(async (err) => {
        if (err?.statusCode === 410) {
          await fetch(
            `${SUPA_URL()}/rest/v1/driver_push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`,
            { method: 'DELETE', headers: { 'apikey': SUPA_SRV(), 'Authorization': `Bearer ${SUPA_SRV()}` } }
          ).catch(() => {})
        }
      })
    )
  )
}

export async function notifyUserFeedbackRequest(userId: string, orderId: string) {
  const res = await fetch(
    `${SUPA_URL()}/rest/v1/push_subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=endpoint,p256dh,auth`,
    {
      headers: {
        'apikey':        SUPA_SRV(),
        'Authorization': `Bearer ${SUPA_SRV()}`,
      },
    }
  )
  if (!res.ok) return

  const subs: { endpoint: string; p256dh: string; auth: string }[] = await res.json()

  const payload = JSON.stringify({
    title: '⭐ How was your order?',
    body:  "Tap to rate your recent order from B'luru Fresh Chicken!",
    icon:  '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    url:   `/order?feedback=${orderId}`,
  })

  await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      ).catch(async (err) => {
        if (err?.statusCode === 410) {
          await fetch(
            `${SUPA_URL()}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`,
            { method: 'DELETE', headers: { 'apikey': SUPA_SRV(), 'Authorization': `Bearer ${SUPA_SRV()}` } }
          ).catch(() => {})
        }
      })
    )
  )
}

export async function notifyUserOrderStatus(userId: string, status: string) {
  const msg = STATUS_MESSAGES[status]
  if (!msg) return

  // Fetch all push subscriptions for this user
  const res = await fetch(
    `${SUPA_URL()}/rest/v1/push_subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=endpoint,p256dh,auth`,
    {
      headers: {
        'apikey':        SUPA_SRV(),
        'Authorization': `Bearer ${SUPA_SRV()}`,
      },
    }
  )
  if (!res.ok) return

  const subs: { endpoint: string; p256dh: string; auth: string }[] = await res.json()

  const payload = JSON.stringify({
    title: msg.title,
    body:  msg.body,
    icon:  '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  })

  // Fire-and-forget — don't block the response
  await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      ).catch(async (err) => {
        // Remove expired/invalid subscriptions (410 Gone)
        if (err?.statusCode === 410) {
          await fetch(
            `${SUPA_URL()}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`,
            { method: 'DELETE', headers: { 'apikey': SUPA_SRV(), 'Authorization': `Bearer ${SUPA_SRV()}` } }
          ).catch(() => {})
        }
      })
    )
  )
}
