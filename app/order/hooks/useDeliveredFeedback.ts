'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getSupabaseBrowser, type OrderRow } from '@/lib/supabase-browser'

const SHOWN_KEY = 'bf-feedback-shown'

function getShownIds(): string[] {
  try {
    const raw = localStorage.getItem(SHOWN_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}

function markShown(orderId: string) {
  try {
    const ids = getShownIds()
    if (!ids.includes(orderId)) {
      // Keep the list bounded — only the 50 most recent matter
      localStorage.setItem(SHOWN_KEY, JSON.stringify([orderId, ...ids].slice(0, 50)))
    }
  } catch { /* ignore */ }
}

/**
 * Listens (realtime) for the logged-in user's orders being marked `delivered`
 * by the driver. When that happens and the order has no feedback yet, it
 * surfaces the order so the UI can pop up a rating prompt — once per order.
 *
 * Lives at the OrderApp level so the popup appears no matter which tab the
 * customer is currently viewing.
 */
export function useDeliveredFeedback(userId: string | null) {
  const [pendingOrder, setPendingOrder] = useState<OrderRow | null>(null)
  const supabase   = getSupabaseBrowser()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const dismiss = useCallback(() => {
    setPendingOrder(prev => {
      if (prev) markShown(prev.id)
      return null
    })
  }, [])

  useEffect(() => {
    if (!userId) return

    const ch = supabase
      .channel(`feedback-user-${userId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` },
        (payload) => {
          const order = payload.new as OrderRow | undefined
          if (!order) return
          if (order.order_status !== 'delivered') return
          if (order.feedback_rating) return            // already rated
          if (getShownIds().includes(order.id)) return // already prompted
          setPendingOrder(order)
        }
      )
      .subscribe()

    channelRef.current = ch
    return () => {
      supabase.removeChannel(ch)
      channelRef.current = null
    }
  }, [userId, supabase])

  return { pendingOrder, dismiss }
}
