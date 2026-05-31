export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/app/api/admin/login/route'

const SUPA_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
const SUPA_SRV = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function srvHeaders() {
  const key = SUPA_SRV()
  return {
    apikey: key,
    Authorization: 'Bearer ' + key,
    'Content-Type': 'application/json',
  }
}

interface OrderItem {
  productId: string
  name: string
  pricePerKg: number
  quantity: number
}

interface Order {
  id: string
  created_at: string
  order_status: string
  payment_status: string
  payment_method?: string
  total_amount: number
  items: OrderItem[]
  delivery_address: { pincode?: string } | null
}

interface Profile {
  id: string
  phone_number?: string
  full_name?: string
  created_at: string
}

export async function GET(req: NextRequest) {
  // Admin auth check
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch all orders, profiles, and shop visit count in parallel
    const [ordersRes, profilesRes, visitsRes] = await Promise.all([
      fetch(`${SUPA_URL()}/rest/v1/orders?select=*`, { headers: srvHeaders() }),
      fetch(`${SUPA_URL()}/rest/v1/profiles?select=id,phone_number,full_name,created_at`, {
        headers: srvHeaders(),
      }),
      fetch(`${SUPA_URL()}/rest/v1/settings?key=in.(shop_visits,shop_unique_devices)&select=key,value`, { headers: srvHeaders() }),
    ])

    const orders: Order[] = await ordersRes.json()
    const profiles: Profile[] = await profilesRes.json()
    const visitsRows: { key: string; value: unknown }[] = await visitsRes.json().catch(() => [])
    const visitsMap  = Object.fromEntries(visitsRows.map(r => [r.key, r.value]))
    const shopVisits        = typeof visitsMap['shop_visits']         === 'number' ? visitsMap['shop_visits']         : 0
    const shopUniqueDevices = typeof visitsMap['shop_unique_devices'] === 'number' ? visitsMap['shop_unique_devices'] : 0

    // --- Date range filtering ---
    const range = req.nextUrl.searchParams.get('range') ?? '30d'
    let fromDate: Date | null = null
    if (range === '1d') {
      // Start of today in IST (UTC+5:30)
      const nowIST = new Date(Date.now() + 330 * 60 * 1000)
      const todayStr = nowIST.toISOString().slice(0, 10) // YYYY-MM-DD in IST
      fromDate = new Date(todayStr + 'T00:00:00+05:30')
    } else if (range === '7d') {
      fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    } else if (range === '30d') {
      fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    } else if (range === '90d') {
      fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    }
    // 'all' → fromDate stays null
    const filteredOrders = fromDate
      ? orders.filter(o => new Date(o.created_at) >= fromDate!)
      : orders

    // Number of days for revenueByDate chart (all → cap at 90 for readability)
    const chartDays = range === '1d' ? 1 : range === '7d' ? 7 : range === '90d' || range === 'all' ? 90 : 30

    // --- Summary ---
    const deliveredOrders = filteredOrders.filter(o => o.order_status === 'delivered')
    const cancelledOrders = filteredOrders.filter(o => o.order_status === 'cancelled')
    const activeStatuses = new Set(['placed', 'packed', 'on_the_way'])
    const activeOrders = filteredOrders.filter(o => activeStatuses.has(o.order_status))

    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0)
    const avgOrderValue = deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0

    const summary = {
      totalRevenue,
      totalOrders: filteredOrders.length,
      deliveredOrders: deliveredOrders.length,
      cancelledOrders: cancelledOrders.length,
      activeOrders: activeOrders.length,
      avgOrderValue,
      totalCustomers: profiles.length,
      shopVisits,
      shopUniqueDevices,
    }

    // --- Status breakdown ---
    const statusMap = new Map<string, number>()
    for (const o of filteredOrders) {
      statusMap.set(o.order_status, (statusMap.get(o.order_status) ?? 0) + 1)
    }
    const statusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
    }))

    // --- Payment breakdown ---
    const paymentMap = new Map<string, { count: number; revenue: number }>()
    for (const o of filteredOrders) {
      const method = o.payment_method ?? o.payment_status ?? 'unknown'
      const existing = paymentMap.get(method) ?? { count: 0, revenue: 0 }
      paymentMap.set(method, {
        count: existing.count + 1,
        revenue:
          existing.revenue + (o.order_status === 'delivered' ? (o.total_amount ?? 0) : 0),
      })
    }
    const paymentBreakdown = Array.from(paymentMap.entries()).map(([method, data]) => ({
      method,
      ...data,
    }))

    // --- Top items (from non-cancelled orders) ---
    const itemMap = new Map<
      string,
      { name: string; totalQty: number; totalRevenue: number; orderCount: number }
    >()
    for (const o of filteredOrders) {
      if (o.order_status === 'cancelled') continue
      const items = Array.isArray(o.items) ? o.items : []
      const seenInOrder = new Set<string>()
      for (const item of items) {
        const pid = item.productId
        const existing = itemMap.get(pid) ?? {
          name: item.name,
          totalQty: 0,
          totalRevenue: 0,
          orderCount: 0,
        }
        existing.totalQty += item.quantity ?? 0
        existing.totalRevenue += (item.pricePerKg ?? 0) * (item.quantity ?? 0)
        if (!seenInOrder.has(pid)) {
          existing.orderCount += 1
          seenInOrder.add(pid)
        }
        itemMap.set(pid, existing)
      }
    }
    const topItems = Array.from(itemMap.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)

    // --- Pincode breakdown (from delivery_address JSONB, non-cancelled orders) ---
    const pincodeMap = new Map<string, { orderCount: number; revenue: number }>()
    for (const o of filteredOrders) {
      if (o.order_status === 'cancelled') continue
      const addr = o.delivery_address as { pincode?: string } | null
      const pincode = addr?.pincode?.trim()
      if (!pincode) continue
      const existing = pincodeMap.get(pincode) ?? { orderCount: 0, revenue: 0 }
      existing.orderCount += 1
      existing.revenue += o.total_amount ?? 0
      pincodeMap.set(pincode, existing)
    }
    const pincodeBreakdown = Array.from(pincodeMap.entries())
      .map(([pincode, data]) => ({ pincode, ...data }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 10)

    // --- Revenue by date (delivered orders only, window based on range) ---
    const today = new Date()
    const dateMap = new Map<string, { revenue: number; orderCount: number }>()
    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setUTCDate(today.getUTCDate() - i)
      const key = d.toISOString().slice(0, 10)
      dateMap.set(key, { revenue: 0, orderCount: 0 })
    }
    for (const o of deliveredOrders) {
      const date = o.created_at?.slice(0, 10)
      if (date && dateMap.has(date)) {
        const entry = dateMap.get(date)!
        entry.revenue += o.total_amount ?? 0
        entry.orderCount += 1
      }
    }
    const revenueByDate = Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }))

    // --- Peak hours (UTC+5:30 = add 330 minutes), filtered orders ---
    const hourMap = new Map<number, number>()
    for (let h = 0; h < 24; h++) hourMap.set(h, 0)
    for (const o of filteredOrders) {
      if (!o.created_at) continue
      const ms = new Date(o.created_at).getTime()
      const istMs = ms + 330 * 60 * 1000
      const hour = new Date(istMs).getUTCHours()
      hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1)
    }
    const peakHours = Array.from(hourMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([hour, orderCount]) => ({ hour, orderCount }))

    // --- Average order value by day of week (IST), filtered orders with total_amount ---
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dayTotals = new Map<number, { sum: number; count: number }>()
    for (let d = 0; d < 7; d++) dayTotals.set(d, { sum: 0, count: 0 })
    for (const o of filteredOrders) {
      if (!o.created_at || o.total_amount == null) continue
      const ms = new Date(o.created_at).getTime()
      const istMs = ms + 330 * 60 * 1000
      const day = new Date(istMs).getUTCDay()
      const entry = dayTotals.get(day)!
      entry.sum += o.total_amount
      entry.count += 1
    }
    // Start from Monday
    const dayOrder = [1, 2, 3, 4, 5, 6, 0]
    const avgOrderByDay = dayOrder.map(d => {
      const entry = dayTotals.get(d)!
      return {
        day: dayNames[d],
        avg: entry.count > 0 ? entry.sum / entry.count : 0,
      }
    })

    const result = {
      summary,
      statusBreakdown,
      paymentBreakdown,
      topItems,
      pincodeBreakdown,
      revenueByDate,
      peakHours,
      avgOrderByDay,
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[admin/analytics GET]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
