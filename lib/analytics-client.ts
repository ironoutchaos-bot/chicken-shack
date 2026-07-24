'use client'

export type FunnelEvent = 'checkout_started' | 'order_completed'

export function getAnalyticsDeviceId(): string {
  try {
    let id = localStorage.getItem('bf-device-id')
    if (!id) {
      id = 'dev_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
      localStorage.setItem('bf-device-id', id)
    }
    return id
  } catch {
    return 'dev_unknown'
  }
}

export function trackFunnelEvent(event: FunnelEvent): void {
  fetch('/api/track/funnel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event,
      device_id: getAnalyticsDeviceId(),
    }),
    keepalive: true,
  }).catch(() => {})
}
