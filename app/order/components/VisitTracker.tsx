'use client'

import { useEffect } from 'react'
import { getAnalyticsDeviceId } from '@/lib/analytics-client'

/**
 * Tracks visits per device using a persistent localStorage device ID.
 * - Fires once per browser session (sessionStorage guard prevents re-counts on tab switch).
 * - Sends a stable device_id (localStorage) so the server can count unique devices.
 */

export default function VisitTracker() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem('bf-visit-tracked')) return
      sessionStorage.setItem('bf-visit-tracked', '1')
    } catch {
      // sessionStorage unavailable — still count
    }
    const deviceId = getAnalyticsDeviceId()
    fetch('/api/track/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId }),
    }).catch(() => {})
  }, [])

  return null
}
