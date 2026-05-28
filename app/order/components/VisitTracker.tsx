'use client'

import { useEffect } from 'react'

/**
 * Tracks visits per device using a persistent localStorage device ID.
 * - Fires once per browser session (sessionStorage guard prevents re-counts on tab switch).
 * - Sends a stable device_id (localStorage) so the server can count unique devices.
 */

function getDeviceId(): string {
  try {
    let id = localStorage.getItem('bf-device-id')
    if (!id) {
      // Generate a random device ID and store it permanently
      id = 'dev_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
      localStorage.setItem('bf-device-id', id)
    }
    return id
  } catch {
    return 'dev_unknown'
  }
}

export default function VisitTracker() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem('bf-visit-tracked')) return
      sessionStorage.setItem('bf-visit-tracked', '1')
    } catch {
      // sessionStorage unavailable — still count
    }
    const deviceId = getDeviceId()
    fetch('/api/track/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId }),
    }).catch(() => {})
  }, [])

  return null
}
