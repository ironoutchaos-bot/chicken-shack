import type { OrderRow } from './supabase-browser'

export class DriverSessionExpired extends Error {}

export async function fetchDriverOrders(): Promise<OrderRow[]> {
  const response = await fetch('/api/driver/orders', {
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  if (response.status === 401 || response.status === 403) {
    throw new DriverSessionExpired('Your driver session has expired. Please sign in again.')
  }
  if (!response.ok) throw new Error('Orders could not be loaded. Retrying automatically; you can also tap Refresh.')
  const data: unknown = await response.json()
  if (!Array.isArray(data)) throw new Error('Orders could not be loaded. Please tap Refresh to try again.')
  return data as OrderRow[]
}

export function hasUnseenDriverOrders(orders: OrderRow[], seen: Set<string> | null): boolean {
  return orders.some(order =>
    (order.payment_status === 'cod' || order.payment_status === 'paid')
    && (order.order_status === 'placed' || order.order_status === 'packed')
    && !seen?.has(order.id)
  )
}
