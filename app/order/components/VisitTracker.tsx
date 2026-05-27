'use client'

import { useEffect } from 'react'

/**
 * Fires a single POST /api/track/visit on mount — once per browser session.
 * sessionStorage prevents duplicate counts when the component re-mounts or
 * the user switches tabs and comes back.
 */
export default function VisitTracker() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem('bf-visit-tracked')) return
      sessionStorage.setItem('bf-visit-tracked', '1')
    } catch {
      // sessionStorage unavailable (private mode edge case) — still count
    }
    fetch('/api/track/visit', { method: 'POST' }).catch(() => {})
  }, [])

  return null
}
