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
  originalPrice?: number
  discountPercentage?: number
  quantity: number
}

interface Order {
  id: string
  created_at: string
  order_status: string
  payment_status: string
  payment_method?: string
  total_amount: number
  coupon_discount?: number | null
  items: OrderItem[]
  delivery_address: { pincode?: string } | null
}

interface Profile {
  id: string
  phone_number?: string
  full_name?: string
  created_at: string
}

type DeviceSet = Record<string, number>
type DailyFunnelRow = {
  date: string
  visits: number
  visitors: number
  checkoutStarters: number
  completedCustomers: number
  abandonedCheckouts: number
}

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function toISTDateKey(value: string): string {
  return new Date(new Date(value).getTime() + 330 * 60 * 1000).toISOString().slice(0, 10)
}

function validDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
}

export async function GET(req: NextRequest) {
  // Admin auth check
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch all orders, profiles, and shop visit counts in parallel
    const [ordersRes, profilesRes, visitsRes] = await Promise.all([
      fetch(`${SUPA_URL()}/rest/v1/orders?select=*`, { headers: srvHeaders() }),
      fetch(`${SUPA_URL()}/rest/v1/profiles?select=id,phone_number,full_name,created_at`, {
        headers: srvHeaders(),
      }),
      fetch(`${SUPA_URL()}/rest/v1/settings?select=key,value`, { headers: srvHeaders() }),
    ])

    const orders: Order[] = await ordersRes.json()
    const profiles: Profile[] = await profilesRes.json()
    const visitsRows: { key: string; value: unknown }[] = await visitsRes.json().catch(() => [])
    const visitsMap  = Object.fromEntries(visitsRows.map(r => [r.key, r.value]))
    const shopVisits        = typeof visitsMap['shop_visits']         === 'number' ? visitsMap['shop_visits']         : 0
    const shopUniqueDevices = typeof visitsMap['shop_unique_devices'] === 'number' ? visitsMap['shop_unique_devices'] : 0

    // Today's stats — valid only when the saved date matches today in IST
    const nowIST       = new Date(Date.now() + 330 * 60 * 1000)
    const todayIST     = nowIST.toISOString().slice(0, 10)
    const savedDate    = visitsMap['shop_visits_today_date'] as string | null
    const todayValid   = savedDate === todayIST
    const todayVisits  = todayValid && typeof visitsMap['shop_visits_today'] === 'number'
      ? (visitsMap['shop_visits_today'] as number)
      : 0
    const todayDevicesObj = todayValid
      ? ((visitsMap['shop_device_ids_today'] ?? {}) as Record<string, number>)
      : {}
    const todayDevices = Object.keys(todayDevicesObj).length

    // --- Date range filtering ---
    const range = req.nextUrl.searchParams.get('range') ?? '30d'
    const requestedStart = req.nextUrl.searchParams.get('start')
    const requestedEnd = req.nextUrl.searchParams.get('end')
    let startKey: string | null = null
    let endKey: string | null = todayIST

    if (range === 'custom' && validDate(requestedStart) && validDate(requestedEnd)) {
      startKey = requestedStart <= requestedEnd ? requestedStart : requestedEnd
      endKey = requestedStart <= requestedEnd ? requestedEnd : requestedStart
    } else if (range === '1d') {
      startKey = todayIST
    } else if (range === '7d') {
      startKey = shiftDate(todayIST, -6)
    } else if (range === '30d') {
      startKey = shiftDate(todayIST, -29)
    } else if (range === '90d') {
      startKey = shiftDate(todayIST, -89)
    } else if (range === 'all') {
      startKey = null
      endKey = null
    }

    const fromDate = startKey ? new Date(`${startKey}T00:00:00+05:30`) : null
    const toDate = endKey ? new Date(`${endKey}T23:59:59.999+05:30`) : null
    const filteredOrders = orders.filter(order => {
      const created = new Date(order.created_at)
      return (!fromDate || created >= fromDate) && (!toDate || created <= toDate)
    })

    const inSelectedDates = (date: string) =>
      (!startKey || date >= startKey) && (!endKey || date <= endKey)

    const visitsByDate = new Map<string, { visits: number; visitors: DeviceSet }>()
    const startersByDate = new Map<string, DeviceSet>()
    const completedByDate = new Map<string, DeviceSet>()

    for (const row of visitsRows) {
      const value = (row.value ?? {}) as Record<string, unknown>
      if (row.key.startsWith('analytics_visits_day_')) {
        const date = row.key.replace('analytics_visits_day_', '')
        visitsByDate.set(date, {
          visits: Number(value.visits) || 0,
          visitors: (value.visitors ?? {}) as DeviceSet,
        })
      } else if (row.key.startsWith('analytics_starters_day_')) {
        const date = row.key.replace('analytics_starters_day_', '')
        startersByDate.set(date, (value.checkoutStarters ?? {}) as DeviceSet)
      } else if (row.key.startsWith('analytics_completed_day_')) {
        const date = row.key.replace('analytics_completed_day_', '')
        completedByDate.set(date, (value.completedCustomers ?? {}) as DeviceSet)
      }
    }

    const selectedVisitors = new Set<string>()
    const selectedStarters = new Set<string>()
    const selectedCompleted = new Set<string>()
    let selectedVisitSessions = 0
    const trackedDates = new Set<string>()

    for (const [date, data] of visitsByDate) {
      if (!inSelectedDates(date)) continue
      trackedDates.add(date)
      selectedVisitSessions += data.visits
      Object.keys(data.visitors).forEach(id => selectedVisitors.add(id))
    }
    for (const [date, devices] of startersByDate) {
      if (!inSelectedDates(date)) continue
      trackedDates.add(date)
      Object.keys(devices).forEach(id => selectedStarters.add(id))
    }
    for (const [date, devices] of completedByDate) {
      if (!inSelectedDates(date)) continue
      trackedDates.add(date)
      Object.keys(devices).forEach(id => selectedCompleted.add(id))
    }

    const includesToday = inSelectedDates(todayIST)
    if (includesToday) {
      selectedVisitSessions = Math.max(selectedVisitSessions, todayVisits)
      trackedDates.add(todayIST)
    }
    const selectedVisitorCount = includesToday
      ? Math.max(selectedVisitors.size, todayDevices)
      : selectedVisitors.size
    const abandonedDevices = new Set(
      [...selectedStarters].filter(device => !selectedCompleted.has(device)),
    )

    const dailyFunnelDates = [...trackedDates].filter(inSelectedDates).sort()
    const dailyFunnel: DailyFunnelRow[] = dailyFunnelDates.map(date => {
      const visits = visitsByDate.get(date)
      const starters = startersByDate.get(date) ?? {}
      const completed = completedByDate.get(date) ?? {}
      const visitorCount = date === todayIST
        ? Math.max(Object.keys(visits?.visitors ?? {}).length, todayDevices)
        : Object.keys(visits?.visitors ?? {}).length
      const visitCount = date === todayIST
        ? Math.max(visits?.visits ?? 0, todayVisits)
        : visits?.visits ?? 0
      return {
        date,
        visits: visitCount,
        visitors: visitorCount,
        checkoutStarters: Object.keys(starters).length,
        completedCustomers: Object.keys(completed).length,
        abandonedCheckouts: Object.keys(starters).filter(id => !completed[id]).length,
      }
    })

    const chartEnd = endKey ?? todayIST
    const chartStart = startKey ?? shiftDate(chartEnd, -89)
    const chartSpan = Math.min(
      90,
      Math.max(
        1,
        Math.round(
          (new Date(chartEnd).getTime() - new Date(chartStart).getTime()) / 86_400_000,
        ) + 1,
      ),
    )
    const chartDateKeys = Array.from(
      { length: chartSpan },
      (_, index) => shiftDate(chartEnd, index - chartSpan + 1),
    )

    // --- Summary ---
    const confirmedOrders = filteredOrders.filter(order =>
      order.payment_status === 'paid' ||
      order.payment_status === 'cod' ||
      order.order_status === 'delivered',
    )
    const deliveredOrders = confirmedOrders.filter(o => o.order_status === 'delivered')
    const cancelledOrders = confirmedOrders.filter(o => o.order_status === 'cancelled')
    const activeStatuses = new Set(['placed', 'packed', 'on_the_way'])
    const activeOrders = confirmedOrders.filter(o => activeStatuses.has(o.order_status))

    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0)
    const avgOrderValue = deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0
    let productDiscounts = 0
    let couponDiscounts = 0
    let discountedOrders = 0

    for (const order of deliveredOrders) {
      let orderProductDiscount = 0
      const items = Array.isArray(order.items) ? order.items : []
      for (const item of items) {
        const sellingPrice = Number(item.pricePerKg) || 0
        const originalPrice = Number(item.originalPrice) || sellingPrice
        const quantity = Number(item.quantity) || 0
        orderProductDiscount += Math.max(0, originalPrice - sellingPrice) * quantity
      }

      const orderCouponDiscount = Math.max(0, Number(order.coupon_discount) || 0)
      productDiscounts += orderProductDiscount
      couponDiscounts += orderCouponDiscount
      if (orderProductDiscount > 0 || orderCouponDiscount > 0) discountedOrders += 1
    }

    const totalDiscounts = productDiscounts + couponDiscounts
    const grossRevenueBeforeDiscounts = totalRevenue + totalDiscounts

    const summary = {
      totalRevenue,
      grossRevenueBeforeDiscounts,
      totalDiscounts,
      productDiscounts,
      couponDiscounts,
      discountedOrders,
      totalOrders: confirmedOrders.length,
      deliveredOrders: deliveredOrders.length,
      cancelledOrders: cancelledOrders.length,
      activeOrders: activeOrders.length,
      avgOrderValue,
      totalCustomers: profiles.length,
      shopVisits,
      shopUniqueDevices,
      todayVisits,
      todayDevices,
      selectedVisitSessions,
      selectedVisitors: selectedVisitorCount,
      checkoutStarters: selectedStarters.size,
      completedCustomers: selectedCompleted.size,
      abandonedCheckouts: abandonedDevices.size,
      checkoutConversionRate: selectedStarters.size > 0
        ? (selectedCompleted.size / selectedStarters.size) * 100
        : 0,
    }

    // --- Status breakdown ---
    const statusMap = new Map<string, number>()
    for (const o of confirmedOrders) {
      statusMap.set(o.order_status, (statusMap.get(o.order_status) ?? 0) + 1)
    }
    const statusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
    }))

    // --- Payment breakdown ---
    const paymentMap = new Map<string, { count: number; revenue: number }>()
    for (const o of confirmedOrders) {
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
    for (const o of confirmedOrders) {
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
    for (const o of confirmedOrders) {
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
    const dateMap = new Map<string, { revenue: number; orderCount: number }>()
    for (const key of chartDateKeys) {
      dateMap.set(key, { revenue: 0, orderCount: 0 })
    }
    for (const o of deliveredOrders) {
      const date = o.created_at ? toISTDateKey(o.created_at) : ''
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
    for (const o of confirmedOrders) {
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
    for (const o of confirmedOrders) {
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
      dailyFunnel,
      selectedDates: { start: startKey, end: endKey },
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[admin/analytics GET]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
